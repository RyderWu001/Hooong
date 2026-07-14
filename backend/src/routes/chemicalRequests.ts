import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const page = Number(req.query.page ?? 1)
  const limit = Number(req.query.limit ?? 20)
  const [data, total] = await Promise.all([
    prisma.chemicalRequest.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.chemicalRequest.count(),
  ])
  res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
})

router.get('/:id', requireAuth, async (req, res) => {
  const data = await prisma.chemicalRequest.findUnique({ where: { id: Number(req.params.id) } })
  if (!data) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到資料' } }); return }
  res.json({ success: true, data })
})

router.post('/', requireAuth, async (req, res) => {
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

router.put('/:id', requireAuth, async (req, res) => {
  const body = req.body
  const data = await prisma.chemicalRequest.update({
    where: { id: Number(req.params.id) },
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
  res.json({ success: true, data })
})

router.delete('/:id', requireAuth, async (req, res) => {
  await prisma.chemicalRequest.delete({ where: { id: Number(req.params.id) } })
  res.json({ success: true, message: '已刪除' })
})

export default router
