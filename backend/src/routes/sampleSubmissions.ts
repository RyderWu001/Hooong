import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { parsePagination, parseId, patchData, patchDates } from '../lib/query'

const router = Router()

const FIELDS = ['formNo', 'companyName', 'factoryLocation', 'contactPerson', 'phone', 'submissionMethod', 'sampleItems', 'packaging', 'formulaCostTable', 'customerFabric', 'businessRequirements', 'trackingResults', 'orderInfo'] as const
const DATE_FIELDS = ['formDate', 'sampleTakenDate', 'submissionDate'] as const

router.get('/', requireAuth, requirePermission('forms', 'view'), async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query)
  const [data, total] = await Promise.all([
    prisma.sampleSubmission.findMany({
      skip,
      take: limit,
      orderBy: { formDate: 'desc' },
    }),
    prisma.sampleSubmission.count(),
  ])
  res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
})

router.get('/:id', requireAuth, requirePermission('forms', 'view'), async (req, res) => {
  const id = parseId(req.params.id, res)
  if (id === null) return
  const item = await prisma.sampleSubmission.findUnique({ where: { id } })
  if (!item) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到記錄' } }); return }
  res.json({ success: true, data: item })
})

router.post('/', requireAuth, requirePermission('forms', 'create'), async (req, res) => {
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

router.put('/:id', requireAuth, requirePermission('forms', 'edit'), async (req, res) => {
  const id = parseId(req.params.id, res)
  if (id === null) return
  const item = await prisma.sampleSubmission.update({
    where: { id },
    data: {
      ...patchData(req.body, FIELDS),
      ...patchDates(req.body, DATE_FIELDS),
    },
  })
  res.json({ success: true, data: item })
})

router.delete('/:id', requireAuth, requirePermission('forms', 'delete'), async (req, res) => {
  const id = parseId(req.params.id, res)
  if (id === null) return
  await prisma.sampleSubmission.delete({ where: { id } })
  res.json({ success: true, message: '已刪除' })
})

export default router
