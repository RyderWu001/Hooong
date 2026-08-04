import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { parsePagination, parseId, patchData, patchDates } from '../lib/query'

const router = Router()

const FIELDS = ['weekday', 'chemName', 'formulaRef', 'materials', 'purpose', 'prepRecord', 'notes'] as const
const DATE_FIELDS = ['prepDate'] as const

router.get('/', requireAuth, requirePermission('forms', 'view'), async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query)
  const [data, total] = await Promise.all([
    prisma.chemPreparation.findMany({
      skip,
      take: limit,
      orderBy: { prepDate: 'desc' },
    }),
    prisma.chemPreparation.count(),
  ])
  res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
})

router.get('/:id', requireAuth, requirePermission('forms', 'view'), async (req, res) => {
  const id = parseId(req.params.id, res)
  if (id === null) return
  const data = await prisma.chemPreparation.findUnique({ where: { id } })
  if (!data) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到資料' } }); return }
  res.json({ success: true, data })
})

router.post('/', requireAuth, requirePermission('forms', 'create'), async (req, res) => {
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

router.put('/:id', requireAuth, requirePermission('forms', 'edit'), async (req, res) => {
  const id = parseId(req.params.id, res)
  if (id === null) return
  const data = await prisma.chemPreparation.update({
    where: { id },
    data: {
      ...patchData(req.body, FIELDS),
      ...patchDates(req.body, DATE_FIELDS),
    },
  })
  res.json({ success: true, data })
})

router.delete('/:id', requireAuth, requirePermission('forms', 'delete'), async (req, res) => {
  const id = parseId(req.params.id, res)
  if (id === null) return
  await prisma.chemPreparation.delete({ where: { id } })
  res.json({ success: true, message: '已刪除' })
})

export default router
