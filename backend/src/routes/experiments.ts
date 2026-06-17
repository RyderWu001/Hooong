import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth'

const router = Router()

const expInclude = {
  formula: { select: { name: true } },
  experimenter: { select: { username: true } },
  steps: { orderBy: { stepOrder: 'asc' as const } },
  attachments: true,
  samples: true,
}

function formatExp(e: any) {
  return {
    ...e,
    formulaName: e.formula?.name,
    experimenterName: e.experimenter?.username,
    formula: undefined,
    experimenter: undefined,
  }
}

// GET /experiments
router.get('/', requireAuth, async (req, res) => {
  const page = Number(req.query.page ?? 1)
  const limit = Number(req.query.limit ?? 20)
  const { code, formulaId, experimenterId, dateFrom, dateTo } = req.query

  const where: any = {}
  if (code) where.code = { contains: code as string }
  if (formulaId) where.formulaId = Number(formulaId)
  if (experimenterId) where.experimenterId = Number(experimenterId)
  if (dateFrom || dateTo) {
    where.experimentDate = {}
    if (dateFrom) where.experimentDate.gte = new Date(dateFrom as string)
    if (dateTo) where.experimentDate.lte = new Date(`${dateTo}T23:59:59Z`)
  }

  const [data, total] = await Promise.all([
    prisma.experiment.findMany({ where, skip: (page - 1) * limit, take: limit, include: expInclude, orderBy: { experimentDate: 'desc' } }),
    prisma.experiment.count({ where }),
  ])
  res.json({ success: true, data: data.map(formatExp), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
})

// GET /experiments/:id
router.get('/:id', requireAuth, async (req, res) => {
  const e = await prisma.experiment.findUnique({ where: { id: Number(req.params.id) }, include: expInclude })
  if (!e) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到實驗' } }); return }
  res.json({ success: true, data: formatExp(e) })
})

// POST /experiments
router.post('/', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req: AuthRequest, res) => {
  const { code, formulaId, experimenterId, experimentDate, temperature, humidity, notes, steps } = req.body
  const e = await prisma.experiment.create({
    data: {
      code, formulaId, experimenterId: experimenterId ?? req.user!.id,
      experimentDate: new Date(experimentDate),
      temperature: temperature ?? 25, humidity: humidity ?? 60, notes: notes ?? '',
      steps: { create: (steps ?? []).map((s: any, i: number) => ({ stepOrder: s.stepOrder ?? i + 1, description: s.description })) },
    },
    include: expInclude,
  })
  res.status(201).json({ success: true, data: formatExp(e) })
})

// PUT /experiments/:id
router.put('/:id', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const id = Number(req.params.id)
  const { temperature, humidity, notes } = req.body
  const e = await prisma.experiment.update({ where: { id }, data: { temperature, humidity, notes }, include: expInclude })
  res.json({ success: true, data: formatExp(e) })
})

// DELETE /experiments/:id
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  await prisma.experiment.delete({ where: { id: Number(req.params.id) } })
  res.json({ success: true, message: '已刪除' })
})

// ── Steps ────────────────────────────────────────────────────
router.get('/:id/steps', requireAuth, async (req, res) => {
  const steps = await prisma.experimentStep.findMany({
    where: { experimentId: Number(req.params.id) }, orderBy: { stepOrder: 'asc' },
  })
  res.json({ success: true, data: steps })
})

router.post('/:id/steps', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const { stepOrder, description } = req.body
  const step = await prisma.experimentStep.create({ data: { experimentId: Number(req.params.id), stepOrder, description } })
  res.status(201).json({ success: true, data: step })
})

router.put('/:id/steps', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const experimentId = Number(req.params.id)
  const steps: { id: number; stepOrder: number; description: string }[] = req.body.steps
  await Promise.all(steps.map((s) => prisma.experimentStep.update({ where: { id: s.id }, data: { stepOrder: s.stepOrder, description: s.description } })))
  const updated = await prisma.experimentStep.findMany({ where: { experimentId }, orderBy: { stepOrder: 'asc' } })
  res.json({ success: true, data: updated })
})

router.delete('/:id/steps/:stepId', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  await prisma.experimentStep.delete({ where: { id: Number(req.params.stepId) } })
  res.json({ success: true, message: '已刪除' })
})

// ── Samples ──────────────────────────────────────────────────
router.get('/:id/samples', requireAuth, async (req, res) => {
  const samples = await prisma.sample.findMany({ where: { experimentId: Number(req.params.id) } })
  res.json({ success: true, data: samples })
})

// ── Result ───────────────────────────────────────────────────
router.get('/:id/result', requireAuth, async (req, res) => {
  const r = await prisma.experimentResult.findUnique({
    where: { experimentId: Number(req.params.id) }, include: { attachments: true },
  })
  if (!r) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '尚未建立結果' } }); return }
  const exp = await prisma.experiment.findUnique({ where: { id: Number(req.params.id) }, include: { formula: true, experimenter: true } })
  res.json({ success: true, data: { ...r, experimentCode: exp?.code, formulaName: exp?.formula.name, experimenterName: exp?.experimenter.username } })
})

router.post('/:id/result', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const experimentId = Number(req.params.id)
  const { status, description, reflection, issueRecord, improvement, clientFeedback, notes } = req.body
  const r = await prisma.experimentResult.create({
    data: { experimentId, status, description: description ?? '', reflection: reflection ?? '', issueRecord: issueRecord ?? '', improvement: improvement ?? '', clientFeedback: clientFeedback ?? '', notes: notes ?? '' },
    include: { attachments: true },
  })
  res.status(201).json({ success: true, data: r })
})

router.put('/:id/result', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const experimentId = Number(req.params.id)
  const { status, description, reflection, issueRecord, improvement, clientFeedback, notes } = req.body
  const r = await prisma.experimentResult.update({
    where: { experimentId }, data: { status, description, reflection, issueRecord, improvement, clientFeedback, notes },
    include: { attachments: true },
  })
  res.json({ success: true, data: r })
})

// ── Attachments ──────────────────────────────────────────────
router.get('/:id/attachments', requireAuth, async (req, res) => {
  const attachments = await prisma.attachment.findMany({ where: { experimentId: Number(req.params.id) } })
  res.json({ success: true, data: attachments })
})

router.get('/:id/result/attachments', requireAuth, async (req, res) => {
  const result = await prisma.experimentResult.findUnique({ where: { experimentId: Number(req.params.id) } })
  if (!result) { res.json({ success: true, data: [] }); return }
  const attachments = await prisma.attachment.findMany({ where: { resultId: result.id } })
  res.json({ success: true, data: attachments })
})

export default router
