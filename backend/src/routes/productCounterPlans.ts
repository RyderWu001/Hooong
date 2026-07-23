import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const page = Number(req.query.page ?? 1)
  const limit = Number(req.query.limit ?? 20)
  const [data, total] = await Promise.all([
    prisma.productCounterPlan.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.productCounterPlan.count(),
  ])
  res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
})

router.get('/:id', requireAuth, async (req, res) => {
  const data = await prisma.productCounterPlan.findUnique({ where: { id: Number(req.params.id) } })
  if (!data) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到資料' } }); return }
  res.json({ success: true, data })
})

router.post('/', requireAuth, async (req, res) => {
  const body = req.body
  const data = await prisma.productCounterPlan.create({
    data: {
      date: body.date ? new Date(body.date) : null,
      productModel: body.productModel ?? null,
      productName: body.productName ?? null,
      proposingDept: body.proposingDept ?? null,
      measureType: body.measureType ?? null,
      clientName: body.clientName ?? null,
      proposer: body.proposer ?? null,
      expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
      issueSource: body.issueSource ?? null,
      issueDesc: body.issueDesc ?? null,
      abnormalType: body.abnormalType ?? null,
      counterFormulas: body.counterFormulas ?? null,
      counterMaterials: body.counterMaterials ?? null,
      rankings: body.rankings ?? null,
      conclusion: body.conclusion ?? null,
      executionResult: body.executionResult ?? null,
      notes: body.notes ?? null,
    },
  })
  res.status(201).json({ success: true, data })
})

router.put('/:id', requireAuth, async (req, res) => {
  const body = req.body
  const data = await prisma.productCounterPlan.update({
    where: { id: Number(req.params.id) },
    data: {
      date: body.date ? new Date(body.date) : null,
      productModel: body.productModel ?? null,
      productName: body.productName ?? null,
      proposingDept: body.proposingDept ?? null,
      measureType: body.measureType ?? null,
      clientName: body.clientName ?? null,
      proposer: body.proposer ?? null,
      expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
      issueSource: body.issueSource ?? null,
      issueDesc: body.issueDesc ?? null,
      abnormalType: body.abnormalType ?? null,
      counterFormulas: body.counterFormulas ?? null,
      counterMaterials: body.counterMaterials ?? null,
      rankings: body.rankings ?? null,
      conclusion: body.conclusion ?? null,
      executionResult: body.executionResult ?? null,
      notes: body.notes ?? null,
    },
  })
  res.json({ success: true, data })
})

router.delete('/:id', requireAuth, async (req, res) => {
  await prisma.productCounterPlan.delete({ where: { id: Number(req.params.id) } })
  res.json({ success: true, message: '已刪除' })
})

export default router
