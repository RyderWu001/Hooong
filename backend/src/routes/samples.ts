import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth } from '../middleware/auth'

const router = Router()

// GET /samples — 跨實驗全域樣品列表
router.get('/', requireAuth, async (req, res) => {
  const page = Number(req.query.page ?? 1)
  const limit = Number(req.query.limit ?? 20)
  const { category, status, clientName, sampleCode } = req.query

  const where: any = {}
  if (category) where.category = category as string
  if (status) where.status = status as string
  if (clientName) where.clientName = { contains: clientName as string, mode: 'insensitive' }
  if (sampleCode) where.sampleCode = { contains: sampleCode as string, mode: 'insensitive' }

  const [data, total] = await Promise.all([
    prisma.sample.findMany({
      where,
      include: {
        experiment: { select: { id: true, code: true, experimentDate: true } },
      },
      orderBy: { sampleDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.sample.count({ where }),
  ])

  res.json({
    success: true,
    data: data.map((s) => ({
      ...s,
      experimentCode: s.experiment.code,
      experimentDate: s.experiment.experimentDate,
      experimentId: s.experiment.id,
      experiment: undefined,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})

// GET /samples/:id
router.get('/:id', requireAuth, async (req, res) => {
  const s = await prisma.sample.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      experiment: { select: { id: true, code: true, experimentDate: true } },
      attachments: true,
    },
  })
  if (!s) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到樣品' } }); return }
  res.json({
    success: true,
    data: {
      ...s,
      experimentCode: s.experiment.code,
      experimentDate: s.experiment.experimentDate,
      experiment: undefined,
    },
  })
})

export default router
