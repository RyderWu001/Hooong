import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { parsePagination, parseId } from '../lib/query'

const router = Router()

const TEXT_FIELDS = [
  'no', 'customerName', 'productName', 'problem', 'oldFormula', 'newFormula',
  'productUsage', 'responseContent', 'specChanges', 'notes',
  'reportDept', 'reportPerson', 'reportTime',
] as const

const BOOL_FIELDS = [
  'completionProductUsage', 'completionOperation',
  'completionTechConsult', 'completionTechService', 'completionOther',
] as const

const DATE_FIELDS = ['date', 'reportDate'] as const

/** 新增用：未提供的欄位一律給預設值。 */
function buildCreate(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const f of TEXT_FIELDS) out[f] = body[f] ?? null
  for (const f of BOOL_FIELDS) out[f] = !!body[f]
  for (const f of DATE_FIELDS) out[f] = body[f] ? new Date(body[f] as string) : null
  out.formulaId = body.formulaId ? Number(body.formulaId) : null
  return out
}

/** 更新用：只寫入請求有帶的欄位，避免部分更新把其他欄位清空。 */
function buildUpdate(body: Record<string, unknown>) {
  const out: Record<string, unknown> = { updatedAt: new Date() }
  for (const f of TEXT_FIELDS) if (body[f] !== undefined) out[f] = body[f]
  for (const f of BOOL_FIELDS) if (body[f] !== undefined) out[f] = !!body[f]
  for (const f of DATE_FIELDS) if (body[f] !== undefined) out[f] = body[f] ? new Date(body[f] as string) : null
  if (body.formulaId !== undefined) out.formulaId = body.formulaId ? Number(body.formulaId) : null
  return out
}

router.get('/', requireAuth, requirePermission('forms', 'view'), async (req, res) => {
  // 前端目前一次載入全部並自行分頁，預設值放寬以維持既有行為，同時仍受 MAX_PAGE_SIZE 箝制
  const { page, limit, skip } = parsePagination(req.query, 200)
  const [data, total] = await Promise.all([
    prisma.formulaChangeApplication.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.formulaChangeApplication.count(),
  ])
  res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
})

router.get('/:id', requireAuth, requirePermission('forms', 'view'), async (req, res) => {
  const id = parseId(req.params.id, res)
  if (id === null) return
  const record = await prisma.formulaChangeApplication.findUnique({ where: { id } })
  if (!record) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到記錄' } }); return }
  res.json({ success: true, data: record })
})

router.post('/', requireAuth, requirePermission('forms', 'create'), async (req, res) => {
  const data = await prisma.formulaChangeApplication.create({ data: buildCreate(req.body) as never })
  res.status(201).json({ success: true, data })
})

router.put('/:id', requireAuth, requirePermission('forms', 'edit'), async (req, res) => {
  const id = parseId(req.params.id, res)
  if (id === null) return
  const data = await prisma.formulaChangeApplication.update({
    where: { id },
    data: buildUpdate(req.body) as never,
  })
  res.json({ success: true, data })
})

router.delete('/:id', requireAuth, requirePermission('forms', 'delete'), async (req, res) => {
  const id = parseId(req.params.id, res)
  if (id === null) return
  await prisma.formulaChangeApplication.delete({ where: { id } })
  res.json({ success: true, message: '已刪除' })
})

export default router
