import { Router } from 'express'
import multer from 'multer'
import prisma from '../db/client'
import { uploadToStorage } from '../db/storage'
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

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

// PATCH /experiments/:id — Bug 3 fix: frontend uses PATCH for partial update
router.patch('/:id', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
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

// POST /:id/steps — Bug 4 fix: accepts { steps: [...] } batch format
router.post('/:id/steps', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const experimentId = Number(req.params.id)
  const { steps, stepOrder, description } = req.body

  if (Array.isArray(steps)) {
    const created = await Promise.all(
      steps.map((s: { stepOrder: number; description: string }) =>
        prisma.experimentStep.create({ data: { experimentId, stepOrder: s.stepOrder, description: s.description } })
      )
    )
    res.status(201).json({ success: true, data: created })
  } else {
    const step = await prisma.experimentStep.create({ data: { experimentId, stepOrder, description } })
    res.status(201).json({ success: true, data: step })
  }
})

// PUT /:id/steps — bulk update all steps
router.put('/:id/steps', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const experimentId = Number(req.params.id)
  const steps: { id: number; stepOrder: number; description: string }[] = req.body.steps
  await Promise.all(steps.map((s) => prisma.experimentStep.update({ where: { id: s.id }, data: { stepOrder: s.stepOrder, description: s.description } })))
  const updated = await prisma.experimentStep.findMany({ where: { experimentId }, orderBy: { stepOrder: 'asc' } })
  res.json({ success: true, data: updated })
})

// PATCH /:id/steps/:stepId — Bug 5 fix: update individual step
router.patch('/:id/steps/:stepId', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const { description } = req.body
  const step = await prisma.experimentStep.update({
    where: { id: Number(req.params.stepId) },
    data: { description },
  })
  res.json({ success: true, data: step })
})

router.delete('/:id/steps/:stepId', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  await prisma.experimentStep.delete({ where: { id: Number(req.params.stepId) } })
  res.json({ success: true, message: '已刪除' })
})

// ── Samples ── Bug 5 fix: full CRUD ─────────────────────────
router.get('/:id/samples', requireAuth, async (req, res) => {
  const samples = await prisma.sample.findMany({ where: { experimentId: Number(req.params.id) } })
  res.json({ success: true, data: samples })
})

router.get('/:id/samples/:sampleId', requireAuth, async (req, res) => {
  const s = await prisma.sample.findUnique({ where: { id: Number(req.params.sampleId) } })
  if (!s) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到樣品' } }); return }
  res.json({ success: true, data: s })
})

router.post('/:id/samples', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const { sampleCode, clientName, label, targetItem, sampleDate, notes } = req.body
  const s = await prisma.sample.create({
    data: {
      experimentId: Number(req.params.id),
      sampleCode, clientName: clientName ?? '', label: label ?? '',
      targetItem: targetItem ?? '', sampleDate: new Date(sampleDate), notes: notes ?? '',
    },
  })
  res.status(201).json({ success: true, data: s })
})

router.patch('/:id/samples/:sampleId', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const { clientName, label, targetItem, notes } = req.body
  const s = await prisma.sample.update({
    where: { id: Number(req.params.sampleId) },
    data: { clientName, label, targetItem, notes },
  })
  res.json({ success: true, data: s })
})

router.post('/:id/samples/:sampleId/photo', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), upload.single('file'), async (req, res) => {
  if (!req.file) { res.status(400).json({ success: false, error: { code: 'NO_FILE', message: '未上傳檔案' } }); return }
  const photoUrl = await uploadToStorage(req.file.buffer, req.file.originalname, req.file.mimetype)
  const s = await prisma.sample.update({
    where: { id: Number(req.params.sampleId) },
    data: { photoUrl },
  })
  res.json({ success: true, data: s })
})

router.delete('/:id/samples/:sampleId', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  await prisma.sample.delete({ where: { id: Number(req.params.sampleId) } })
  res.json({ success: true, message: '已刪除' })
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

// ── Attachments ── Bug 5 fix: upload endpoints ────────────────
router.get('/:id/attachments', requireAuth, async (req, res) => {
  const attachments = await prisma.attachment.findMany({ where: { experimentId: Number(req.params.id) } })
  res.json({ success: true, data: attachments })
})

router.post('/:id/attachments', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), upload.single('file'), async (req, res) => {
  if (!req.file) { res.status(400).json({ success: false, error: { code: 'NO_FILE', message: '未上傳檔案' } }); return }
  const { fileType } = req.body
  const fileUrl = await uploadToStorage(req.file.buffer, req.file.originalname, req.file.mimetype)
  const a = await prisma.attachment.create({
    data: {
      experimentId: Number(req.params.id),
      fileUrl,
      fileType: fileType ?? 'image',
      fileName: req.file.originalname,
    },
  })
  res.status(201).json({ success: true, data: a })
})

router.delete('/:id/attachments/:attachmentId', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  await prisma.attachment.delete({ where: { id: Number(req.params.attachmentId) } })
  res.json({ success: true, message: '已刪除' })
})

router.get('/:id/result/attachments', requireAuth, async (req, res) => {
  const result = await prisma.experimentResult.findUnique({ where: { experimentId: Number(req.params.id) } })
  if (!result) { res.json({ success: true, data: [] }); return }
  const attachments = await prisma.attachment.findMany({ where: { resultId: result.id } })
  res.json({ success: true, data: attachments })
})

router.post('/:id/result/attachments', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), upload.single('file'), async (req, res) => {
  const result = await prisma.experimentResult.findUnique({ where: { experimentId: Number(req.params.id) } })
  if (!result) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '尚未建立結果' } }); return }
  if (!req.file) { res.status(400).json({ success: false, error: { code: 'NO_FILE', message: '未上傳檔案' } }); return }
  const { fileType } = req.body
  const fileUrl = await uploadToStorage(req.file.buffer, req.file.originalname, req.file.mimetype)
  const a = await prisma.attachment.create({
    data: {
      resultId: result.id,
      fileUrl,
      fileType: fileType ?? 'image',
      fileName: req.file.originalname,
    },
  })
  res.status(201).json({ success: true, data: a })
})

router.delete('/:id/result/attachments/:attachmentId', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  await prisma.attachment.delete({ where: { id: Number(req.params.attachmentId) } })
  res.json({ success: true, message: '已刪除' })
})

export default router
