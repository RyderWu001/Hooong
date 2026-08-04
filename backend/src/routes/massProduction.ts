import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { parsePagination, parseId } from '../lib/query'

const router = Router()

const TEXT_FIELDS = [
  'no', 'newFormulaCode', 'oldFormulaCode', 'dept', 'applicant', 'productName',
  'customerUsage', 'testCode', 'testContent', 'officialFormula', 'specStandards',
  'testSummary', 'meetsInternalSpec', 'mrsl1', 'mrsl2', 'zdhcMrsl',
  'zdhcLevel1Result', 'zdhcLevel3Result', 'zdhcPidCode',
  'sdsVersions', 'tdsVersions', 'coaResult', 'otherRegulations',
  'customerQty', 'officialProductCode', 'officialProductName', 'productionRisks',
  'reportDept', 'reportPerson', 'reportTime',
] as const

const BOOL_FIELDS = [
  'testTypePhysical', 'testTypeStability', 'testTypeApplication',
  'zdhcLevel1Required', 'zdhcLevel3Required',
  'completionProductApp', 'completionOperation',
  'completionTechConsult', 'completionTechService', 'completionOther',
] as const

const DATE_FIELDS = [
  'date', 'testCompletionDate', 'massProductionDate', 'reportDate',
] as const

/** 新增用：未提供的欄位一律給預設值。 */
function buildCreate(b: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const f of TEXT_FIELDS) out[f] = b[f] ?? null
  for (const f of BOOL_FIELDS) out[f] = !!b[f]
  for (const f of DATE_FIELDS) out[f] = b[f] ? new Date(b[f] as string) : null
  out.formulaId = b.formulaId ? Number(b.formulaId) : null
  return out
}

/** 更新用：只寫入請求有帶的欄位，避免部分更新把其他欄位清空。 */
function buildUpdate(b: Record<string, unknown>) {
  const out: Record<string, unknown> = { updatedAt: new Date() }
  for (const f of TEXT_FIELDS) if (b[f] !== undefined) out[f] = b[f]
  for (const f of BOOL_FIELDS) if (b[f] !== undefined) out[f] = !!b[f]
  for (const f of DATE_FIELDS) if (b[f] !== undefined) out[f] = b[f] ? new Date(b[f] as string) : null
  if (b.formulaId !== undefined) out.formulaId = b.formulaId ? Number(b.formulaId) : null
  return out
}

router.get('/', requireAuth, requirePermission('forms', 'view'), async (req, res) => {
  // 前端一次載入全部並自行分頁，預設值放寬以維持既有行為，同時仍受 MAX_PAGE_SIZE 箝制
  const { page, limit, skip } = parsePagination(req.query, 200)
  const [data, total] = await Promise.all([
    prisma.massProductionApproval.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.massProductionApproval.count(),
  ])
  res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
})

router.get('/:id', requireAuth, requirePermission('forms', 'view'), async (req, res) => {
  const id = parseId(req.params.id, res)
  if (id === null) return
  const record = await prisma.massProductionApproval.findUnique({ where: { id } })
  if (!record) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到記錄' } }); return }
  res.json({ success: true, data: record })
})

router.post('/', requireAuth, requirePermission('forms', 'create'), async (req, res) => {
  const data = await prisma.massProductionApproval.create({ data: buildCreate(req.body) as never })
  res.status(201).json({ success: true, data })
})

router.put('/:id', requireAuth, requirePermission('forms', 'edit'), async (req, res) => {
  const id = parseId(req.params.id, res)
  if (id === null) return
  const data = await prisma.massProductionApproval.update({
    where: { id },
    data: buildUpdate(req.body) as never,
  })
  res.json({ success: true, data })
})

router.delete('/:id', requireAuth, requirePermission('forms', 'delete'), async (req, res) => {
  const id = parseId(req.params.id, res)
  if (id === null) return
  await prisma.massProductionApproval.delete({ where: { id } })
  res.json({ success: true, message: '已刪除' })
})

export default router
