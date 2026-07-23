import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const page = Number(req.query.page ?? 1)
  const limit = Number(req.query.limit ?? 20)
  const [data, total] = await Promise.all([
    prisma.productRework.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.productRework.count(),
  ])
  res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
})

router.get('/:id', requireAuth, async (req, res) => {
  const data = await prisma.productRework.findUnique({ where: { id: Number(req.params.id) } })
  if (!data) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到資料' } }); return }
  res.json({ success: true, data })
})

router.post('/', requireAuth, async (req, res) => {
  const body = req.body
  const data = await prisma.productRework.create({
    data: {
      productModel: body.productModel ?? null,
      productName: body.productName ?? null,
      originalDate: body.originalDate ? new Date(body.originalDate) : null,
      originalLot: body.originalLot ?? null,
      newLot: body.newLot ?? null,
      tank: body.tank ?? null,
      originalQty: body.originalQty ?? null,
      reworkQty: body.reworkQty ?? null,
      reworkReasons: body.reworkReasons ?? null,
      abnormalDesc: body.abnormalDesc ?? null,
      materialDetails: body.materialDetails ?? null,
      reworkMethod: body.reworkMethod ?? null,
      qcResults: body.qcResults ?? null,
      finalJudgment: body.finalJudgment ?? null,
      notes: body.notes ?? null,
    },
  })
  res.status(201).json({ success: true, data })
})

router.put('/:id', requireAuth, async (req, res) => {
  const body = req.body
  const data = await prisma.productRework.update({
    where: { id: Number(req.params.id) },
    data: {
      productModel: body.productModel ?? null,
      productName: body.productName ?? null,
      originalDate: body.originalDate ? new Date(body.originalDate) : null,
      originalLot: body.originalLot ?? null,
      newLot: body.newLot ?? null,
      tank: body.tank ?? null,
      originalQty: body.originalQty ?? null,
      reworkQty: body.reworkQty ?? null,
      reworkReasons: body.reworkReasons ?? null,
      abnormalDesc: body.abnormalDesc ?? null,
      materialDetails: body.materialDetails ?? null,
      reworkMethod: body.reworkMethod ?? null,
      qcResults: body.qcResults ?? null,
      finalJudgment: body.finalJudgment ?? null,
      notes: body.notes ?? null,
    },
  })
  res.json({ success: true, data })
})

router.delete('/:id', requireAuth, async (req, res) => {
  await prisma.productRework.delete({ where: { id: Number(req.params.id) } })
  res.json({ success: true, message: '已刪除' })
})

export default router
