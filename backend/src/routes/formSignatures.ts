import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth, type AuthRequest } from '../middleware/auth'

const router = Router()

// GET /form-signatures?formType=X&formId=Y
router.get('/', requireAuth, async (req, res) => {
  const { formType, formId } = req.query
  if (!formType || !formId) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'formType and formId are required' } })
    return
  }
  const data = await prisma.formSignature.findMany({
    where: { formType: String(formType), formId: Number(formId) },
    orderBy: { slotOrder: 'asc' },
  })
  res.json({ success: true, data })
})

// POST /form-signatures  – apply a signature to a slot
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { formType, formId, slotName, slotOrder, signatureImg } = req.body
  if (!formType || !formId || !slotName || slotOrder == null) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: '缺少必要欄位' } })
    return
  }

  // Enforce sequential: all slots with lower order must already be signed
  const pendingBefore = await prisma.formSignature.findFirst({
    where: {
      formType,
      formId: Number(formId),
      slotOrder: { lt: Number(slotOrder) },
      signedAt: null,
    },
  })
  if (pendingBefore) {
    res.status(422).json({ success: false, error: { code: 'OUT_OF_ORDER', message: `請先完成「${pendingBefore.slotName}」的簽核` } })
    return
  }

  const data = await prisma.formSignature.upsert({
    where: { formType_formId_slotName: { formType, formId: Number(formId), slotName } },
    create: {
      formType,
      formId: Number(formId),
      slotName,
      slotOrder: Number(slotOrder),
      signedById: req.user!.id,
      signedByName: req.user!.username,
      signatureImg: signatureImg ?? null,
      signedAt: new Date(),
    },
    update: {
      signedById: req.user!.id,
      signedByName: req.user!.username,
      signatureImg: signatureImg ?? null,
      signedAt: new Date(),
    },
  })
  res.status(201).json({ success: true, data })
})

// DELETE /form-signatures/:id  – retract a signature
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const sig = await prisma.formSignature.findUnique({ where: { id: Number(req.params.id) } })
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

  await prisma.formSignature.update({
    where: { id: sig.id },
    data: { signedById: null, signedByName: null, signatureImg: null, signedAt: null },
  })
  res.json({ success: true, message: '已撤回簽核' })
})

export default router
