import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { parsePagination, parseId, patchData, patchDates } from '../lib/query'

const router = Router()

const FIELDS = ['weekday', 'testEntries', 'procedureRecords'] as const
const DATE_FIELDS = ['logDate'] as const

router.get('/', requireAuth, requirePermission('forms', 'view'), async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query)
  const [data, total] = await Promise.all([
    prisma.labDailyLog.findMany({
      skip,
      take: limit,
      orderBy: { logDate: 'desc' },
    }),
    prisma.labDailyLog.count(),
  ])
  res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
})

router.get('/:id', requireAuth, requirePermission('forms', 'view'), async (req, res) => {
  const id = parseId(req.params.id, res)
  if (id === null) return
  const item = await prisma.labDailyLog.findUnique({ where: { id } })
  if (!item) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到記錄' } }); return }
  res.json({ success: true, data: item })
})

router.post('/', requireAuth, requirePermission('forms', 'create'), async (req, res) => {
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

router.put('/:id', requireAuth, requirePermission('forms', 'edit'), async (req, res) => {
  const id = parseId(req.params.id, res)
  if (id === null) return
  const item = await prisma.labDailyLog.update({
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
  await prisma.labDailyLog.delete({ where: { id } })
  res.json({ success: true, message: '已刪除' })
})

export default router
