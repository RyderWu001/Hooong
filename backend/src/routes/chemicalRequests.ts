import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { parsePagination, parseId, patchData, patchDates } from '../lib/query'

const router = Router()

const FIELDS = ['no', 'chemicalName', 'supplierInfo', 'unitPrice', 'usage', 'expectedQty', 'processInfo', 'isReplacement', 'replacedProduct', 'hasSDS', 'hasTDS', 'hasCOA', 'hasThirdParty', 'zdhcMrsl', 'chemAppendix1', 'chemAppendix2', 'ingredients', 'supplement', 'techOpinion', 'ehsSDS', 'ehsMRSL', 'supervisorDecision', 'ceoDecision', 'notes'] as const
const DATE_FIELDS = ['date'] as const

router.get('/', requireAuth, requirePermission('forms', 'view'), async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query)
  const [data, total] = await Promise.all([
    prisma.chemicalRequest.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.chemicalRequest.count(),
  ])
  res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
})

router.get('/:id', requireAuth, requirePermission('forms', 'view'), async (req, res) => {
  const id = parseId(req.params.id, res)
  if (id === null) return
  const data = await prisma.chemicalRequest.findUnique({ where: { id } })
  if (!data) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到資料' } }); return }
  res.json({ success: true, data })
})

router.post('/', requireAuth, requirePermission('forms', 'create'), async (req, res) => {
  const body = req.body
  const data = await prisma.chemicalRequest.create({
    data: {
      no: body.no ?? null,
      date: body.date ? new Date(body.date) : null,
      chemicalName: body.chemicalName ?? null,
      supplierInfo: body.supplierInfo ?? null,
      unitPrice: body.unitPrice ?? null,
      usage: body.usage ?? null,
      expectedQty: body.expectedQty ?? null,
      processInfo: body.processInfo ?? null,
      isReplacement: body.isReplacement ?? false,
      replacedProduct: body.replacedProduct ?? null,
      hasSDS: body.hasSDS ?? null,
      hasTDS: body.hasTDS ?? null,
      hasCOA: body.hasCOA ?? null,
      hasThirdParty: body.hasThirdParty ?? null,
      zdhcMrsl: body.zdhcMrsl ?? null,
      chemAppendix1: body.chemAppendix1 ?? null,
      chemAppendix2: body.chemAppendix2 ?? null,
      ingredients: body.ingredients ?? null,
      supplement: body.supplement ?? null,
      techOpinion: body.techOpinion ?? null,
      ehsSDS: body.ehsSDS ?? false,
      ehsMRSL: body.ehsMRSL ?? false,
      supervisorDecision: body.supervisorDecision ?? null,
      ceoDecision: body.ceoDecision ?? null,
      notes: body.notes ?? null,
    },
  })
  res.status(201).json({ success: true, data })
})

router.put('/:id', requireAuth, requirePermission('forms', 'edit'), async (req, res) => {
  const id = parseId(req.params.id, res)
  if (id === null) return
  const data = await prisma.chemicalRequest.update({
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
  await prisma.chemicalRequest.delete({ where: { id } })
  res.json({ success: true, message: '已刪除' })
})

export default router
