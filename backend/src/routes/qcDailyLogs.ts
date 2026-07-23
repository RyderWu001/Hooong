import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const page = Number(req.query.page ?? 1)
  const limit = Number(req.query.limit ?? 20)
  const [data, total] = await Promise.all([
    prisma.qcDailyLog.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { logDate: 'desc' },
    }),
    prisma.qcDailyLog.count(),
  ])
  res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
})

router.get('/:id', requireAuth, async (req, res) => {
  const data = await prisma.qcDailyLog.findUnique({ where: { id: Number(req.params.id) } })
  if (!data) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到資料' } }); return }
  res.json({ success: true, data })
})

router.post('/', requireAuth, async (req, res) => {
  const body = req.body
  const data = await prisma.qcDailyLog.create({
    data: {
      logDate: body.logDate ? new Date(body.logDate) : new Date(),
      section1: body.section1 ?? null,
      section2: body.section2 ?? null,
      section3: body.section3 ?? null,
      section4: body.section4 ?? null,
    },
  })
  res.status(201).json({ success: true, data })
})

router.put('/:id', requireAuth, async (req, res) => {
  const body = req.body
  const data = await prisma.qcDailyLog.update({
    where: { id: Number(req.params.id) },
    data: {
      logDate: body.logDate ? new Date(body.logDate) : undefined,
      section1: body.section1 ?? null,
      section2: body.section2 ?? null,
      section3: body.section3 ?? null,
      section4: body.section4 ?? null,
    },
  })
  res.json({ success: true, data })
})

router.delete('/:id', requireAuth, async (req, res) => {
  await prisma.qcDailyLog.delete({ where: { id: Number(req.params.id) } })
  res.json({ success: true, message: '已刪除' })
})

export default router
