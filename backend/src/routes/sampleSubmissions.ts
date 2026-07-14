import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth, requireRole } from '../middleware/auth'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const page = Number(req.query.page ?? 1)
  const limit = Number(req.query.limit ?? 20)
  const [data, total] = await Promise.all([
    prisma.sampleSubmission.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { formDate: 'desc' },
    }),
    prisma.sampleSubmission.count(),
  ])
  res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
})

router.get('/:id', requireAuth, async (req, res) => {
  const item = await prisma.sampleSubmission.findUnique({ where: { id: Number(req.params.id) } })
  if (!item) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到記錄' } }); return }
  res.json({ success: true, data: item })
})

router.post('/', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const {
    formNo, companyName, factoryLocation, contactPerson,
    formDate, sampleTakenDate, phone, submissionDate, submissionMethod,
    sampleItems, packaging, formulaCostTable, customerFabric,
    businessRequirements, trackingResults, orderInfo,
  } = req.body
  const item = await prisma.sampleSubmission.create({
    data: {
      formNo: formNo ?? null,
      companyName,
      factoryLocation: factoryLocation ?? null,
      contactPerson: contactPerson ?? null,
      formDate: new Date(formDate),
      sampleTakenDate: sampleTakenDate ? new Date(sampleTakenDate) : null,
      phone: phone ?? null,
      submissionDate: submissionDate ? new Date(submissionDate) : null,
      submissionMethod: submissionMethod ?? null,
      sampleItems: sampleItems ?? null,
      packaging: packaging ?? null,
      formulaCostTable: formulaCostTable ?? null,
      customerFabric: customerFabric ?? null,
      businessRequirements: businessRequirements ?? null,
      trackingResults: trackingResults ?? null,
      orderInfo: orderInfo ?? null,
    },
  })
  res.status(201).json({ success: true, data: item })
})

router.put('/:id', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const {
    formNo, companyName, factoryLocation, contactPerson,
    formDate, sampleTakenDate, phone, submissionDate, submissionMethod,
    sampleItems, packaging, formulaCostTable, customerFabric,
    businessRequirements, trackingResults, orderInfo,
  } = req.body
  const item = await prisma.sampleSubmission.update({
    where: { id: Number(req.params.id) },
    data: {
      formNo: formNo ?? null,
      companyName,
      factoryLocation: factoryLocation ?? null,
      contactPerson: contactPerson ?? null,
      formDate: new Date(formDate),
      sampleTakenDate: sampleTakenDate ? new Date(sampleTakenDate) : null,
      phone: phone ?? null,
      submissionDate: submissionDate ? new Date(submissionDate) : null,
      submissionMethod: submissionMethod ?? null,
      sampleItems: sampleItems ?? null,
      packaging: packaging ?? null,
      formulaCostTable: formulaCostTable ?? null,
      customerFabric: customerFabric ?? null,
      businessRequirements: businessRequirements ?? null,
      trackingResults: trackingResults ?? null,
      orderInfo: orderInfo ?? null,
    },
  })
  res.json({ success: true, data: item })
})

router.delete('/:id', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  await prisma.sampleSubmission.delete({ where: { id: Number(req.params.id) } })
  res.json({ success: true, message: '已刪除' })
})

export default router
