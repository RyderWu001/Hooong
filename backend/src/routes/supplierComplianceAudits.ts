import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { parsePagination, parseId, patchData, patchDates } from '../lib/query'

const router = Router()

const FIELDS = ['supplierId', 'supplierName', 'supplierType', 'mainProducts', 'supplierCategory', 'qualificationResult', 'priceResult', 'zdhcGateway', 'chemCheckReport', 'mrslDoc', 'sdsTds', 'envCertification', 'complianceSubtotal', 'advancedAudit', 'advancedSubtotal', 'totalScore', 'notes'] as const
const DATE_FIELDS = ['auditDate'] as const

router.get('/', requireAuth, requirePermission('forms', 'view'), async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query)
  const [data, total] = await Promise.all([
    prisma.supplierComplianceAudit.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.supplierComplianceAudit.count(),
  ])
  res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
})

router.get('/:id', requireAuth, requirePermission('forms', 'view'), async (req, res) => {
  const id = parseId(req.params.id, res)
  if (id === null) return
  const data = await prisma.supplierComplianceAudit.findUnique({ where: { id } })
  if (!data) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到資料' } }); return }
  res.json({ success: true, data })
})

router.post('/', requireAuth, requirePermission('forms', 'create'), async (req, res) => {
  const body = req.body
  const data = await prisma.supplierComplianceAudit.create({
    data: {
      supplierId: body.supplierId ?? null,
      supplierName: body.supplierName ?? null,
      supplierType: body.supplierType ?? null,
      mainProducts: body.mainProducts ?? null,
      auditDate: body.auditDate ? new Date(body.auditDate) : null,
      supplierCategory: body.supplierCategory ?? null,
      qualificationResult: body.qualificationResult ?? null,
      priceResult: body.priceResult ?? null,
      zdhcGateway: body.zdhcGateway ?? null,
      chemCheckReport: body.chemCheckReport ?? null,
      mrslDoc: body.mrslDoc ?? null,
      sdsTds: body.sdsTds ?? null,
      envCertification: body.envCertification ?? null,
      complianceSubtotal: body.complianceSubtotal ?? null,
      advancedAudit: body.advancedAudit ?? null,
      advancedSubtotal: body.advancedSubtotal ?? null,
      totalScore: body.totalScore ?? null,
      notes: body.notes ?? null,
    },
  })
  res.status(201).json({ success: true, data })
})

router.put('/:id', requireAuth, requirePermission('forms', 'edit'), async (req, res) => {
  const id = parseId(req.params.id, res)
  if (id === null) return
  const data = await prisma.supplierComplianceAudit.update({
    where: { id },
    data: {
      ...patchData(req.body, FIELDS),
      ...patchDates(req.body, DATE_FIELDS),
    },
  })
  res.json({ success: true, data })
})

router.delete('/:id', requireAuth, requirePermission('forms', 'delete'), async (req, res) => {
  const id = parseId(req.params.id, res)
  if (id === null) return
  await prisma.supplierComplianceAudit.delete({ where: { id } })
  res.json({ success: true, message: '已刪除' })
})

export default router
