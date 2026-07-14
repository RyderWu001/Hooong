import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const page = Number(req.query.page ?? 1)
  const limit = Number(req.query.limit ?? 20)
  const [data, total] = await Promise.all([
    prisma.chemicalEvaluation.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.chemicalEvaluation.count(),
  ])
  res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
})

router.get('/:id', requireAuth, async (req, res) => {
  const data = await prisma.chemicalEvaluation.findUnique({ where: { id: Number(req.params.id) } })
  if (!data) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到資料' } }); return }
  res.json({ success: true, data })
})

router.post('/', requireAuth, async (req, res) => {
  const body = req.body
  const data = await prisma.chemicalEvaluation.create({
    data: {
      no: body.no ?? null,
      date: body.date ? new Date(body.date) : null,
      supplierCode: body.supplierCode ?? null,
      supplierName: body.supplierName ?? null,
      chemicalName: body.chemicalName ?? null,
      batchNo: body.batchNo ?? null,
      unitPrice: body.unitPrice ?? null,
      usage: body.usage ?? null,
      certifications: body.certifications ?? null,
      hazardClassification: body.hazardClassification ?? null,
      substanceType: body.substanceType ?? null,
      pureSubstance: body.pureSubstance ?? null,
      mixtures: body.mixtures ?? null,
      cod: body.cod ?? null,
      bod: body.bod ?? null,
      phWater: body.phWater ?? null,
      appearance: body.appearance ?? null,
      solidContent: body.solidContent ?? null,
      ph1pct: body.ph1pct ?? null,
      density: body.density ?? null,
      sugarDegree: body.sugarDegree ?? null,
      ionProperty: body.ionProperty ?? null,
      testRecord: body.testRecord ?? null,
      solidPhoto: body.solidPhoto ?? null,
      zdhcMrsl: body.zdhcMrsl ?? null,
      chemAppendix1: body.chemAppendix1 ?? null,
      chemAppendix2: body.chemAppendix2 ?? null,
      result: body.result ?? null,
      issue: body.issue ?? null,
      notes: body.notes ?? null,
      conclusion: body.conclusion ?? null,
    },
  })
  res.status(201).json({ success: true, data })
})

router.put('/:id', requireAuth, async (req, res) => {
  const body = req.body
  const data = await prisma.chemicalEvaluation.update({
    where: { id: Number(req.params.id) },
    data: {
      no: body.no ?? null,
      date: body.date ? new Date(body.date) : null,
      supplierCode: body.supplierCode ?? null,
      supplierName: body.supplierName ?? null,
      chemicalName: body.chemicalName ?? null,
      batchNo: body.batchNo ?? null,
      unitPrice: body.unitPrice ?? null,
      usage: body.usage ?? null,
      certifications: body.certifications ?? null,
      hazardClassification: body.hazardClassification ?? null,
      substanceType: body.substanceType ?? null,
      pureSubstance: body.pureSubstance ?? null,
      mixtures: body.mixtures ?? null,
      cod: body.cod ?? null,
      bod: body.bod ?? null,
      phWater: body.phWater ?? null,
      appearance: body.appearance ?? null,
      solidContent: body.solidContent ?? null,
      ph1pct: body.ph1pct ?? null,
      density: body.density ?? null,
      sugarDegree: body.sugarDegree ?? null,
      ionProperty: body.ionProperty ?? null,
      testRecord: body.testRecord ?? null,
      solidPhoto: body.solidPhoto ?? null,
      zdhcMrsl: body.zdhcMrsl ?? null,
      chemAppendix1: body.chemAppendix1 ?? null,
      chemAppendix2: body.chemAppendix2 ?? null,
      result: body.result ?? null,
      issue: body.issue ?? null,
      notes: body.notes ?? null,
      conclusion: body.conclusion ?? null,
    },
  })
  res.json({ success: true, data })
})

router.delete('/:id', requireAuth, async (req, res) => {
  await prisma.chemicalEvaluation.delete({ where: { id: Number(req.params.id) } })
  res.json({ success: true, message: '已刪除' })
})

export default router
