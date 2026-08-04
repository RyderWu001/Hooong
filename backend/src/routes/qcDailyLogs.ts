import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { parsePagination, parseId, patchData } from '../lib/query'

const router = Router()

const FIELDS = ['section1', 'section2', 'section3', 'section4'] as const

router.get('/', requireAuth, requirePermission('forms', 'view'), async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query)
  const [data, total] = await Promise.all([
    prisma.qcDailyLog.findMany({ skip, take: limit, orderBy: { logDate: 'desc' } }),
    prisma.qcDailyLog.count(),
  ])
  res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
})

router.get('/:id', requireAuth, requirePermission('forms', 'view'), async (req, res) => {
  const id = parseId(req.params.id, res)
  if (id === null) return
  const data = await prisma.qcDailyLog.findUnique({ where: { id } })
  if (!data) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到資料' } }); return }
  res.json({ success: true, data })
})

router.post('/', requireAuth, requirePermission('forms', 'create'), async (req, res) => {
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

router.put('/:id', requireAuth, requirePermission('forms', 'edit'), async (req, res) => {
  const id = parseId(req.params.id, res)
  if (id === null) return
  const body = req.body
  const data = await prisma.qcDailyLog.update({
    where: { id },
    data: {
      ...patchData(body, FIELDS),
      ...(body.logDate !== undefined ? { logDate: new Date(body.logDate) } : {}),
    },
  })
  res.json({ success: true, data })
})

router.delete('/:id', requireAuth, requirePermission('forms', 'delete'), async (req, res) => {
  const id = parseId(req.params.id, res)
  if (id === null) return
  await prisma.qcDailyLog.delete({ where: { id } })
  res.json({ success: true, message: '已刪除' })
})

export default router
