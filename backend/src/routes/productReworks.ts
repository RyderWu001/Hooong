import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { parsePagination, parseId, patchData, patchDates } from '../lib/query'

const router = Router()

const FIELDS = ['productModel', 'productName', 'originalLot', 'newLot', 'tank', 'originalQty', 'reworkQty', 'reworkReasons', 'abnormalDesc', 'materialDetails', 'reworkMethod', 'qcResults', 'finalJudgment', 'notes'] as const
const DATE_FIELDS = ['originalDate'] as const

router.get('/', requireAuth, requirePermission('forms', 'view'), async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query)
  const [data, total] = await Promise.all([
    prisma.productRework.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.productRework.count(),
  ])
  res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
})

router.get('/:id', requireAuth, requirePermission('forms', 'view'), async (req, res) => {
  const id = parseId(req.params.id, res)
  if (id === null) return
  const data = await prisma.productRework.findUnique({ where: { id } })
  if (!data) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到資料' } }); return }
  res.json({ success: true, data })
})

router.post('/', requireAuth, requirePermission('forms', 'create'), async (req, res) => {
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

router.put('/:id', requireAuth, requirePermission('forms', 'edit'), async (req, res) => {
  const id = parseId(req.params.id, res)
  if (id === null) return
  const data = await prisma.productRework.update({
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
  await prisma.productRework.delete({ where: { id } })
  res.json({ success: true, message: '已刪除' })
})

export default router
