import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { parseId } from '../lib/query'
import { APPROVAL_CHAINS } from '../lib/approvalChains'

const router = Router()

// GET /form-signatures?formType=X&formId=Y
router.get('/', requireAuth, requirePermission('forms', 'view'), async (req, res) => {
  const { formType, formId } = req.query
  const fid = Number(formId)
  if (!formType || !Number.isInteger(fid) || fid < 1) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'formType 與有效的 formId 為必填' } })
    return
  }
  const data = await prisma.formSignature.findMany({
    where: { formType: String(formType), formId: fid, signedAt: { not: null } },
    orderBy: { slotOrder: 'asc' },
  })
  res.json({ success: true, data })
})

/**
 * GET /form-signatures/counts?formType=X
 *
 * 回傳該表單類型所有紀錄的簽核數量，格式為 { [formId]: count }。
 * 列表頁需要顯示每筆的簽核進度，逐筆查詢會讓 N 筆資料產生 N 次請求。
 */
router.get('/counts', requireAuth, requirePermission('forms', 'view'), async (req, res) => {
  const { formType } = req.query
  if (!formType) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'formType 為必填' } })
    return
  }
  const rows = await prisma.formSignature.groupBy({
    by: ['formId'],
    where: { formType: String(formType), signedAt: { not: null } },
    _count: { _all: true },
  })
  const counts: Record<number, number> = {}
  for (const r of rows) counts[r.formId] = r._count._all
  res.json({ success: true, data: counts })
})

// POST /form-signatures  – apply a signature to a slot
router.post('/', requireAuth, requirePermission('forms', 'edit'), async (req: AuthRequest, res) => {
  const { formType, formId, slotName, slotOrder, signatureImg } = req.body
  const fid = Number(formId)
  const order = Number(slotOrder)
  if (!formType || !slotName || !Number.isInteger(fid) || fid < 1 || !Number.isInteger(order) || order < 1) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: '缺少必要欄位或格式不正確' } })
    return
  }

  const chain = APPROVAL_CHAINS[String(formType)]
  const slot = Array.isArray(chain) ? chain.find(s => s.name === slotName && s.order === order) : undefined
  if (!slot) {
    res.status(400).json({ success: false, error: { code: 'INVALID_SLOT', message: '表單類型或簽核關卡不正確' } })
    return
  }
  if (req.user!.role !== 'ADMIN' && !slot.roles.includes(req.user!.role)) {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '您的角色無法簽核此關卡' } })
    return
  }

  const models = {
    SampleSubmission: () => prisma.sampleSubmission.findUnique({ where: { id: fid }, select: { id: true } }),
    ChemicalEvaluation: () => prisma.chemicalEvaluation.findUnique({ where: { id: fid }, select: { id: true } }),
    ChemicalRequest: () => prisma.chemicalRequest.findUnique({ where: { id: fid }, select: { id: true } }),
    QcReport: () => prisma.ingredientBatch.findUnique({ where: { id: fid }, select: { id: true } }),
    FormulaChange: () => prisma.formulaChangeApplication.findUnique({ where: { id: fid }, select: { id: true } }),
    MassProduction: () => prisma.massProductionApproval.findUnique({ where: { id: fid }, select: { id: true } }),
  }
  const model = models[formType as keyof typeof models]
  const exists = await model()
  if (!exists) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到要簽核的表單' } })
    return
  }

  // Enforce sequential: the immediately preceding slot must already be signed
  if (order > 1) {
    const prevSigned = await prisma.formSignature.findFirst({
      where: {
        formType,
        formId: fid,
        slotOrder: order - 1,
        signedAt: { not: null },
      },
    })
    if (!prevSigned) {
      res.status(422).json({ success: false, error: { code: 'OUT_OF_ORDER', message: '請先完成上一關的簽核' } })
      return
    }
  }

  const userRecord = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { username: true },
  })
  const signedByName = userRecord?.username ?? null

  // A signed slot is immutable until explicitly retracted; never overwrite another signer.
  try {
    const data = await prisma.formSignature.create({
      data: {
      formType,
      formId: fid,
      slotName,
      slotOrder: order,
      signedById: req.user!.id,
      signedByName,
      signatureImg: signatureImg ?? null,
      signedAt: new Date(),
      },
    })
    res.status(201).json({ success: true, data })
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      res.status(409).json({ success: false, error: { code: 'ALREADY_SIGNED', message: '此關卡已簽核，請重新載入表單' } }); return
    }
    throw error
  }
})

// DELETE /form-signatures/:id  – retract a signature
router.delete('/:id', requireAuth, requirePermission('forms', 'edit'), async (req: AuthRequest, res) => {
  const id = parseId(req.params.id, res)
  if (id === null) return
  const sig = await prisma.formSignature.findUnique({ where: { id } })
  if (!sig) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到簽核記錄' } }); return }

  // Only the signer or admin may retract
  if (sig.signedById !== req.user!.id && req.user!.role !== 'ADMIN') {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '無權限撤回此簽核' } })
    return
  }

  // Reject if a later slot is already signed
  const laterSigned = await prisma.formSignature.findFirst({
    where: {
      formType: sig.formType,
      formId: sig.formId,
      slotOrder: { gt: sig.slotOrder },
      signedAt: { not: null },
    },
  })
  if (laterSigned) {
    res.status(422).json({ success: false, error: { code: 'HAS_LATER_SIGN', message: `後續「${laterSigned.slotName}」已簽核，無法撤回` } })
    return
  }

  await prisma.formSignature.delete({ where: { id: sig.id } })
  res.json({ success: true, message: '已撤回簽核' })
})

export default router
