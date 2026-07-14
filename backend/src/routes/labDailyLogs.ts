import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth, requireRole } from '../middleware/auth'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const page = Number(req.query.page ?? 1)
  const limit = Number(req.query.limit ?? 30)
  const [data, total] = await Promise.all([
    prisma.labDailyLog.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { logDate: 'desc' },
    }),
    prisma.labDailyLog.count(),
  ])
  res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
})

router.get('/:id', requireAuth, async (req, res) => {
  const item = await prisma.labDailyLog.findUnique({ where: { id: Number(req.params.id) } })
  if (!item) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到記錄' } }); return }
  res.json({ success: true, data: item })
})

router.post('/', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const { logDate, weekday, testEntries, procedureRecords } = req.body
  const item = await prisma.labDailyLog.create({
    data: {
      logDate: new Date(logDate),
      weekday: weekday ?? null,
      testEntries: testEntries ?? null,
      procedureRecords: procedureRecords ?? null,
    },
  })
  res.status(201).json({ success: true, data: item })
})

router.put('/:id', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const { logDate, weekday, testEntries, procedureRecords } = req.body
  const item = await prisma.labDailyLog.update({
    where: { id: Number(req.params.id) },
    data: {
      logDate: new Date(logDate),
      weekday: weekday ?? null,
      testEntries: testEntries ?? null,
      procedureRecords: procedureRecords ?? null,
    },
  })
  res.json({ success: true, data: item })
})

router.delete('/:id', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  await prisma.labDailyLog.delete({ where: { id: Number(req.params.id) } })
  res.json({ success: true, message: '已刪除' })
})

export default router
