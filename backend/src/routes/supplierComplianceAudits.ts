import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const page = Number(req.query.page ?? 1)
  const limit = Number(req.query.limit ?? 20)
  const [data, total] = await Promise.all([
    prisma.supplierComplianceAudit.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.supplierComplianceAudit.count(),
  ])
  res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
})

router.get('/:id', requireAuth, async (req, res) => {
  const data = await prisma.supplierComplianceAudit.findUnique({ where: { id: Number(req.params.id) } })
  if (!data) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到資料' } }); return }
  res.json({ success: true, data })
})

router.post('/', requireAuth, async (req, res) => {
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

router.put('/:id', requireAuth, async (req, res) => {
  const body = req.body
  const data = await prisma.supplierComplianceAudit.update({
    where: { id: Number(req.params.id) },
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
  res.json({ success: true, data })
})

router.delete('/:id', requireAuth, async (req, res) => {
  await prisma.supplierComplianceAudit.delete({ where: { id: Number(req.params.id) } })
  res.json({ success: true, message: '已刪除' })
})

export default router
