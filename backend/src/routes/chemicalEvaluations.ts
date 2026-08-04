import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { parsePagination, parseId, patchData, patchDates } from '../lib/query'

const router = Router()

const FIELDS = ['no', 'supplierCode', 'supplierName', 'chemicalName', 'batchNo', 'unitPrice', 'usage', 'certifications', 'hazardClassification', 'substanceType', 'pureSubstance', 'mixtures', 'cod', 'bod', 'phWater', 'appearance', 'solidContent', 'ph1pct', 'density', 'sugarDegree', 'ionProperty', 'testRecord', 'solidPhoto', 'zdhcMrsl', 'chemAppendix1', 'chemAppendix2', 'result', 'issue', 'notes', 'conclusion'] as const
const DATE_FIELDS = ['date'] as const

router.get('/', requireAuth, requirePermission('forms', 'view'), async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query)
  const [data, total] = await Promise.all([
    prisma.chemicalEvaluation.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.chemicalEvaluation.count(),
  ])
  res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
})

router.get('/:id', requireAuth, requirePermission('forms', 'view'), async (req, res) => {
  const id = parseId(req.params.id, res)
  if (id === null) return
  const data = await prisma.chemicalEvaluation.findUnique({ where: { id } })
  if (!data) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到資料' } }); return }
  res.json({ success: true, data })
})

router.post('/', requireAuth, requirePermission('forms', 'create'), async (req, res) => {
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

router.put('/:id', requireAuth, requirePermission('forms', 'edit'), async (req, res) => {
  const id = parseId(req.params.id, res)
  if (id === null) return
  const data = await prisma.chemicalEvaluation.update({
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
  await prisma.chemicalEvaluation.delete({ where: { id } })
  res.json({ success: true, message: '已刪除' })
})

export default router
