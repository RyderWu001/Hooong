import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const page = Number(req.query.page ?? 1)
  const limit = Number(req.query.limit ?? 20)
  const [data, total] = await Promise.all([
    prisma.chemPreparation.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { prepDate: 'desc' },
    }),
    prisma.chemPreparation.count(),
  ])
  res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
})

router.get('/:id', requireAuth, async (req, res) => {
  const data = await prisma.chemPreparation.findUnique({ where: { id: Number(req.params.id) } })
  if (!data) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到資料' } }); return }
  res.json({ success: true, data })
})

router.post('/', requireAuth, async (req, res) => {
  const body = req.body
  const data = await prisma.chemPreparation.create({
    data: {
      prepDate: body.prepDate ? new Date(body.prepDate) : new Date(),
      weekday: body.weekday ?? null,
      chemName: body.chemName ?? null,
      formulaRef: body.formulaRef ?? null,
      materials: body.materials ?? null,
      purpose: body.purpose ?? null,
      prepRecord: body.prepRecord ?? null,
      notes: body.notes ?? null,
    },
  })
  res.status(201).json({ success: true, data })
})

router.put('/:id', requireAuth, async (req, res) => {
  const body = req.body
  const data = await prisma.chemPreparation.update({
    where: { id: Number(req.params.id) },
    data: {
      prepDate: body.prepDate ? new Date(body.prepDate) : undefined,
      weekday: body.weekday ?? null,
      chemName: body.chemName ?? null,
      formulaRef: body.formulaRef ?? null,
      materials: body.materials ?? null,
      purpose: body.purpose ?? null,
      prepRecord: body.prepRecord ?? null,
      notes: body.notes ?? null,
    },
  })
  res.json({ success: true, data })
})

router.delete('/:id', requireAuth, async (req, res) => {
  await prisma.chemPreparation.delete({ where: { id: Number(req.params.id) } })
  res.json({ success: true, message: '已刪除' })
})

export default router
