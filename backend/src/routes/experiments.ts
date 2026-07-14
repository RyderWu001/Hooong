import { Router } from 'express'
import multer from 'multer'
import prisma from '../db/client'
import { uploadToStorage } from '../db/storage'
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

const decodeFilename = (raw: string) => Buffer.from(raw, 'latin1').toString('utf8')

const STEP_INCLUDE = { attachments: { orderBy: { createdAt: 'asc' as const } } }

const GROUP_INCLUDE = {
  steps: { orderBy: { stepOrder: 'asc' as const }, include: STEP_INCLUDE },
  attachments: { orderBy: { createdAt: 'asc' as const } },
  samples: true,
}

const EXP_INCLUDE = {
  formula: { select: { name: true } },
  experimenter: { select: { username: true } },
  groups: { orderBy: { groupOrder: 'asc' as const }, include: GROUP_INCLUDE },
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

// ── Experiments ──────────────────────────────────────────────────────────────

router.get('/', requireAuth, async (req, res) => {
  const page = Number(req.query.page ?? 1)
  const limit = Number(req.query.limit ?? 20)
  const { code, formulaId, experimenterId, dateFrom, dateTo, category } = req.query

  const where: any = {}
  if (code) where.code = { contains: code as string }
  if (formulaId) where.formulaId = Number(formulaId)
  if (experimenterId) where.experimenterId = Number(experimenterId)
  if (category) where.category = category as string
  if (dateFrom || dateTo) {
    where.experimentDate = {}
    if (dateFrom) where.experimentDate.gte = new Date(dateFrom as string)
    if (dateTo) where.experimentDate.lte = new Date(`${dateTo}T23:59:59Z`)
  }

  const [data, total] = await Promise.all([
    prisma.experiment.findMany({ where, skip: (page - 1) * limit, take: limit, include: EXP_INCLUDE, orderBy: { experimentDate: 'desc' } }),
    prisma.experiment.count({ where }),
  ])
  res.json({ success: true, data: data.map(formatExp), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
})

router.get('/:id', requireAuth, async (req, res) => {
  const e = await prisma.experiment.findUnique({ where: { id: Number(req.params.id) }, include: EXP_INCLUDE })
  if (!e) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到實驗' } }); return }
  res.json({ success: true, data: formatExp(e) })
})

router.post('/', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req: AuthRequest, res) => {
  const {
    code, formulaId, experimenterId, experimentDate, category, temperature, humidity, notes,
    clientCompany, fabricCode, clientContact, commissionType,
    expectedDate, actualDate, testItems, commissionNotes, conclusionBefore, conclusionAfter,
  } = req.body
  const e = await prisma.experiment.create({
    data: {
      code,
      ...(formulaId ? { formulaId: Number(formulaId) } : {}),
      experimenterId: experimenterId ? Number(experimenterId) : req.user!.id,
      experimentDate: new Date(experimentDate),
      category: category ?? null,
      temperature: temperature ?? 25,
      humidity: humidity ?? 60,
      notes: notes ?? '',
      clientCompany: clientCompany ?? null,
      fabricCode: fabricCode ?? null,
      clientContact: clientContact ?? null,
      commissionType: commissionType ?? null,
      expectedDate: expectedDate ? new Date(expectedDate) : null,
      actualDate: actualDate ? new Date(actualDate) : null,
      testItems: testItems ?? null,
      commissionNotes: commissionNotes ?? null,
      conclusionBefore: conclusionBefore ?? null,
      conclusionAfter: conclusionAfter ?? null,
    },
    include: EXP_INCLUDE,
  })
  res.status(201).json({ success: true, data: formatExp(e) })
})

router.put('/:id', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const {
    category, temperature, humidity, notes, experimentDate,
    clientCompany, fabricCode, clientContact, commissionType,
    expectedDate, actualDate, testItems, commissionNotes, conclusionBefore, conclusionAfter,
  } = req.body
  const e = await prisma.experiment.update({
    where: { id: Number(req.params.id) },
    data: {
      category: category ?? null,
      temperature,
      humidity,
      notes,
      ...(experimentDate ? { experimentDate: new Date(experimentDate) } : {}),
      clientCompany: clientCompany ?? null,
      fabricCode: fabricCode ?? null,
      clientContact: clientContact ?? null,
      commissionType: commissionType ?? null,
      expectedDate: expectedDate ? new Date(expectedDate) : (expectedDate === null ? null : undefined),
      actualDate: actualDate ? new Date(actualDate) : (actualDate === null ? null : undefined),
      testItems: testItems !== undefined ? (testItems ?? null) : undefined,
      commissionNotes: commissionNotes !== undefined ? (commissionNotes ?? null) : undefined,
      conclusionBefore: conclusionBefore ?? null,
      conclusionAfter: conclusionAfter ?? null,
    },
    include: EXP_INCLUDE,
  })
  res.json({ success: true, data: formatExp(e) })
})

router.patch('/:id', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const {
    category, temperature, humidity, notes, experimentDate,
    clientCompany, fabricCode, clientContact, commissionType,
    expectedDate, actualDate, testItems, commissionNotes, conclusionBefore, conclusionAfter,
  } = req.body
  const e = await prisma.experiment.update({
    where: { id: Number(req.params.id) },
    data: {
      ...(category !== undefined ? { category: category ?? null } : {}),
      ...(temperature !== undefined ? { temperature } : {}),
      ...(humidity !== undefined ? { humidity } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(experimentDate ? { experimentDate: new Date(experimentDate) } : {}),
      ...(clientCompany !== undefined ? { clientCompany: clientCompany ?? null } : {}),
      ...(fabricCode !== undefined ? { fabricCode: fabricCode ?? null } : {}),
      ...(clientContact !== undefined ? { clientContact: clientContact ?? null } : {}),
      ...(commissionType !== undefined ? { commissionType: commissionType ?? null } : {}),
      ...(expectedDate !== undefined ? { expectedDate: expectedDate ? new Date(expectedDate) : null } : {}),
      ...(actualDate !== undefined ? { actualDate: actualDate ? new Date(actualDate) : null } : {}),
      ...(testItems !== undefined ? { testItems: testItems ?? null } : {}),
      ...(commissionNotes !== undefined ? { commissionNotes: commissionNotes ?? null } : {}),
      ...(conclusionBefore !== undefined ? { conclusionBefore: conclusionBefore ?? null } : {}),
      ...(conclusionAfter !== undefined ? { conclusionAfter: conclusionAfter ?? null } : {}),
    },
    include: EXP_INCLUDE,
  })
  res.json({ success: true, data: formatExp(e) })
})

router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  await prisma.experiment.delete({ where: { id: Number(req.params.id) } })
  res.json({ success: true, message: '已刪除' })
})

// ── Groups ───────────────────────────────────────────────────────────────────

router.get('/:id/groups', requireAuth, async (req, res) => {
  const groups = await prisma.experimentGroup.findMany({
    where: { experimentId: Number(req.params.id) },
    orderBy: { groupOrder: 'asc' },
    include: GROUP_INCLUDE,
  })
  res.json({ success: true, data: groups })
})

router.post('/:id/groups', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const experimentId = Number(req.params.id)
  const { name, groupOrder, experimentType, bathRatio, startPH, endPH, acidMethod, tempRate, holdTime,
    burningCondition, washCondition, dyeAuxiliaries,
    leveler, fixer, calciumChloride, colorFixative, dyeCombination, dyeAmount,
    fixingTemp, fixingAuxAmount, fiberSpec, widthShrinkage, shrinkTime, fixingAuxiliaries,
    notes } = req.body

  const maxOrder = await prisma.experimentGroup.count({ where: { experimentId } })
  const g = await prisma.experimentGroup.create({
    data: {
      experimentId, name,
      groupOrder: groupOrder ?? maxOrder + 1,
      experimentType: experimentType ?? null,
      bathRatio: bathRatio ?? null,
      startPH: startPH != null ? Number(startPH) : null,
      endPH: endPH != null ? Number(endPH) : null,
      acidMethod: acidMethod ?? null,
      tempRate: tempRate ?? null,
      holdTime: holdTime != null ? Number(holdTime) : null,
      burningCondition: burningCondition ?? null,
      washCondition: washCondition ?? null,
      dyeAuxiliaries: dyeAuxiliaries ?? null,
      leveler: leveler ?? null,
      fixer: fixer ?? null,
      calciumChloride: calciumChloride ?? null,
      colorFixative: colorFixative ?? null,
      dyeCombination: dyeCombination ?? null,
      dyeAmount: dyeAmount ?? null,
      fixingTemp: fixingTemp ?? null,
      fixingAuxAmount: fixingAuxAmount ?? null,
      fiberSpec: fiberSpec ?? null,
      widthShrinkage: widthShrinkage ?? null,
      shrinkTime: shrinkTime ?? null,
      fixingAuxiliaries: fixingAuxiliaries ?? null,
      notes: notes ?? '',
    },
    include: GROUP_INCLUDE,
  })
  res.status(201).json({ success: true, data: g })
})

router.put('/:id/groups/:gid', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const { name, experimentType, bathRatio, startPH, endPH, acidMethod, tempRate, holdTime,
    burningCondition, washCondition, dyeAuxiliaries,
    leveler, fixer, calciumChloride, colorFixative, dyeCombination, dyeAmount,
    fixingTemp, fixingAuxAmount, fiberSpec, widthShrinkage, shrinkTime, fixingAuxiliaries,
    notes } = req.body
  const g = await prisma.experimentGroup.update({
    where: { id: Number(req.params.gid) },
    data: {
      name,
      experimentType: experimentType ?? null,
      bathRatio: bathRatio ?? null,
      startPH: startPH != null ? Number(startPH) : null,
      endPH: endPH != null ? Number(endPH) : null,
      acidMethod: acidMethod ?? null,
      tempRate: tempRate ?? null,
      holdTime: holdTime != null ? Number(holdTime) : null,
      burningCondition: burningCondition ?? null,
      washCondition: washCondition ?? null,
      dyeAuxiliaries: dyeAuxiliaries ?? null,
      leveler: leveler ?? null,
      fixer: fixer ?? null,
      calciumChloride: calciumChloride ?? null,
      colorFixative: colorFixative ?? null,
      dyeCombination: dyeCombination ?? null,
      dyeAmount: dyeAmount ?? null,
      fixingTemp: fixingTemp ?? null,
      fixingAuxAmount: fixingAuxAmount ?? null,
      fiberSpec: fiberSpec ?? null,
      widthShrinkage: widthShrinkage ?? null,
      shrinkTime: shrinkTime ?? null,
      fixingAuxiliaries: fixingAuxiliaries ?? null,
      notes: notes ?? '',
    },
    include: GROUP_INCLUDE,
  })
  res.json({ success: true, data: g })
})

// 標記成功組（exclusive：同一實驗只能有一組成功）
router.patch('/:id/groups/:gid/success', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const experimentId = Number(req.params.id)
  const groupId = Number(req.params.gid)
  const { isSuccess } = req.body as { isSuccess: boolean }

  await prisma.$transaction([
    // 先清除同實驗所有組的成功標記
    prisma.experimentGroup.updateMany({
      where: { experimentId },
      data: { isSuccess: false },
    }),
    // 若要標記成功，設定目標組
    ...(isSuccess
      ? [prisma.experimentGroup.update({ where: { id: groupId }, data: { isSuccess: true } })]
      : []),
  ])

  const updated = await prisma.experiment.findUnique({
    where: { id: experimentId },
    include: EXP_INCLUDE,
  })
  res.json({ success: true, data: updated ? formatExp(updated) : null })
})

router.delete('/:id/groups/:gid', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  await prisma.experimentGroup.delete({ where: { id: Number(req.params.gid) } })
  res.json({ success: true, message: '已刪除' })
})

// ── Group Steps ──────────────────────────────────────────────────────────────

router.post('/:id/groups/:gid/steps', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const groupId = Number(req.params.gid)
  const { description, stepOrder, notes, isHighlight } = req.body
  const count = await prisma.experimentGroupStep.count({ where: { groupId } })
  const step = await prisma.experimentGroupStep.create({
    data: {
      groupId, description,
      stepOrder: stepOrder ?? count + 1,
      notes: notes ?? '',
      isHighlight: isHighlight ?? false,
    },
    include: STEP_INCLUDE,
  })
  res.status(201).json({ success: true, data: step })
})

router.put('/:id/groups/:gid/steps', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const steps: { id: number; stepOrder: number; description: string; notes?: string; isHighlight?: boolean }[] = req.body.steps
  await prisma.$transaction(steps.map((s) =>
    prisma.experimentGroupStep.update({
      where: { id: s.id },
      data: {
        stepOrder: s.stepOrder,
        description: s.description,
        notes: s.notes ?? '',
        isHighlight: s.isHighlight ?? false,
      },
    })
  ))
  const updated = await prisma.experimentGroupStep.findMany({
    where: { groupId: Number(req.params.gid) },
    orderBy: { stepOrder: 'asc' },
    include: STEP_INCLUDE,
  })
  res.json({ success: true, data: updated })
})

router.delete('/:id/groups/:gid/steps/:stepId', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  await prisma.experimentGroupStep.delete({ where: { id: Number(req.params.stepId) } })
  res.json({ success: true, message: '已刪除' })
})

// ── Step Attachments ──────────────────────────────────────────────────────────

router.post('/:id/groups/:gid/steps/:sid/attachments', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), upload.single('file'), async (req, res) => {
  if (!req.file) { res.status(400).json({ success: false, error: { code: 'NO_FILE', message: '未上傳檔案' } }); return }
  const { fileType } = req.body
  const fileUrl = await uploadToStorage(req.file.buffer, req.file.originalname, req.file.mimetype)
  const a = await prisma.attachment.create({
    data: {
      experimentGroupStepId: Number(req.params.sid),
      fileUrl,
      fileType: fileType ?? 'image',
      fileName: decodeFilename(req.file.originalname),
    },
  })
  res.status(201).json({ success: true, data: a })
})

router.delete('/:id/groups/:gid/steps/:sid/attachments/:aid', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  await prisma.attachment.delete({ where: { id: Number(req.params.aid) } })
  res.json({ success: true, message: '已刪除' })
})

// ── Group Attachments ─────────────────────────────────────────────────────────

router.post('/:id/groups/:gid/attachments', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), upload.single('file'), async (req, res) => {
  if (!req.file) { res.status(400).json({ success: false, error: { code: 'NO_FILE', message: '未上傳檔案' } }); return }
  const { fileType, imageCategory } = req.body
  const fileUrl = await uploadToStorage(req.file.buffer, req.file.originalname, req.file.mimetype)
  const a = await prisma.attachment.create({
    data: {
      experimentGroupId: Number(req.params.gid),
      fileUrl,
      fileType: fileType ?? 'image',
      fileName: decodeFilename(req.file.originalname),
      imageCategory: imageCategory ?? null,
    },
  })
  res.status(201).json({ success: true, data: a })
})

router.delete('/:id/groups/:gid/attachments/:attId', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  await prisma.attachment.delete({ where: { id: Number(req.params.attId) } })
  res.json({ success: true, message: '已刪除' })
})

// ── Samples ───────────────────────────────────────────────────────────────────

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
  const { sampleCode, sampleType, clientName, label, targetItem, sampleDate, quantity, notes,
    category, attribute, industry, status, groupId,
    retentionDate, retentionPeriod, retentionLocation, storageCondition } = req.body
  const s = await prisma.sample.create({
    data: {
      experimentId: Number(req.params.id),
      groupId: groupId ? Number(groupId) : null,
      sampleCode, sampleType: sampleType ?? null,
      clientName: clientName ?? '', label: label ?? '',
      targetItem: targetItem ?? '', sampleDate: new Date(sampleDate),
      quantity: quantity != null ? Number(quantity) : null,
      notes: notes ?? '',
      category: category ?? null, attribute: attribute ?? null,
      industry: industry ?? null, status: status ?? null,
      retentionDate: retentionDate ? new Date(retentionDate) : null,
      retentionPeriod: retentionPeriod != null ? Number(retentionPeriod) : null,
      retentionLocation: retentionLocation ?? null,
      storageCondition: storageCondition ?? null,
    },
  })
  res.status(201).json({ success: true, data: s })
})

router.patch('/:id/samples/:sampleId', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const { sampleType, clientName, label, targetItem, notes, quantity, category, attribute,
    industry, status, groupId, retentionDate, retentionPeriod, retentionLocation, storageCondition } = req.body
  const s = await prisma.sample.update({
    where: { id: Number(req.params.sampleId) },
    data: {
      sampleType: sampleType !== undefined ? (sampleType ?? null) : undefined,
      clientName, label, targetItem, notes,
      quantity: quantity !== undefined ? (quantity != null ? Number(quantity) : null) : undefined,
      category, attribute, industry, status,
      ...(groupId !== undefined ? { groupId: groupId ? Number(groupId) : null } : {}),
      retentionDate: retentionDate !== undefined ? (retentionDate ? new Date(retentionDate) : null) : undefined,
      retentionPeriod: retentionPeriod !== undefined ? (retentionPeriod != null ? Number(retentionPeriod) : null) : undefined,
      retentionLocation: retentionLocation !== undefined ? (retentionLocation ?? null) : undefined,
      storageCondition: storageCondition !== undefined ? (storageCondition ?? null) : undefined,
    },
  })
  res.json({ success: true, data: s })
})

router.post('/:id/samples/:sampleId/photo', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), upload.single('file'), async (req, res) => {
  if (!req.file) { res.status(400).json({ success: false, error: { code: 'NO_FILE', message: '未上傳檔案' } }); return }
  const photoUrl = await uploadToStorage(req.file.buffer, req.file.originalname, req.file.mimetype)
  const s = await prisma.sample.update({ where: { id: Number(req.params.sampleId) }, data: { photoUrl } })
  res.json({ success: true, data: s })
})

router.delete('/:id/samples/:sampleId', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  await prisma.sample.delete({ where: { id: Number(req.params.sampleId) } })
  res.json({ success: true, message: '已刪除' })
})

router.get('/:id/samples/:sampleId/attachments', requireAuth, async (req, res) => {
  const attachments = await prisma.attachment.findMany({ where: { sampleId: Number(req.params.sampleId) } })
  res.json({ success: true, data: attachments })
})

router.post('/:id/samples/:sampleId/attachments', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), upload.single('file'), async (req, res) => {
  if (!req.file) { res.status(400).json({ success: false, error: { code: 'NO_FILE', message: '未上傳檔案' } }); return }
  const { fileType } = req.body
  const fileUrl = await uploadToStorage(req.file.buffer, req.file.originalname, req.file.mimetype)
  const a = await prisma.attachment.create({
    data: {
      sampleId: Number(req.params.sampleId),
      fileUrl, fileType: fileType ?? 'image',
      fileName: decodeFilename(req.file.originalname),
    },
  })
  res.status(201).json({ success: true, data: a })
})

router.delete('/:id/samples/:sampleId/attachments/:attachmentId', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  await prisma.attachment.delete({ where: { id: Number(req.params.attachmentId) } })
  res.json({ success: true, message: '已刪除' })
})

// ── Experiment-level Attachments ──────────────────────────────────────────────

router.get('/:id/attachments', requireAuth, async (req, res) => {
  const attachments = await prisma.attachment.findMany({ where: { experimentId: Number(req.params.id) } })
  res.json({ success: true, data: attachments })
})

router.post('/:id/attachments', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), upload.single('file'), async (req, res) => {
  if (!req.file) { res.status(400).json({ success: false, error: { code: 'NO_FILE', message: '未上傳檔案' } }); return }
  const { fileType, imageCategory } = req.body
  const fileUrl = await uploadToStorage(req.file.buffer, req.file.originalname, req.file.mimetype)
  const a = await prisma.attachment.create({
    data: {
      experimentId: Number(req.params.id),
      fileUrl, fileType: fileType ?? 'image',
      fileName: decodeFilename(req.file.originalname),
      imageCategory: imageCategory ?? null,
    },
  })
  res.status(201).json({ success: true, data: a })
})

router.delete('/:id/attachments/:attachmentId', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  await prisma.attachment.delete({ where: { id: Number(req.params.attachmentId) } })
  res.json({ success: true, message: '已刪除' })
})

// ── Result ────────────────────────────────────────────────────────────────────

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
  const { status, score, handFeelScore, colorShadeScore, fastnessScore, moistureScore,
    otherScoreName, otherScore, description, reflection, issueRecord, abnormalReason,
    anomalyTypes, anomalyNote,
    improvement, improvementAction, clientFeedback, clientFeedbackResult, notes, scoreItems } = req.body
  const r = await prisma.experimentResult.create({
    data: {
      experimentId, status,
      score: score != null ? Number(score) : null,
      handFeelScore: handFeelScore != null ? Number(handFeelScore) : null,
      colorShadeScore: colorShadeScore != null ? Number(colorShadeScore) : null,
      fastnessScore: fastnessScore != null ? Number(fastnessScore) : null,
      moistureScore: moistureScore != null ? Number(moistureScore) : null,
      otherScoreName: otherScoreName ?? null, otherScore: otherScore != null ? Number(otherScore) : null,
      description: description ?? '', reflection: reflection ?? '',
      issueRecord: issueRecord ?? '', abnormalReason: abnormalReason ?? null,
      anomalyTypes: anomalyTypes ?? null, anomalyNote: anomalyNote ?? null,
      improvement: improvement ?? '', improvementAction: improvementAction ?? null,
      clientFeedback: clientFeedback ?? '', clientFeedbackResult: clientFeedbackResult ?? null,
      notes: notes ?? '',
      scoreItems: scoreItems ?? null,
    },
    include: { attachments: true },
  })
  res.status(201).json({ success: true, data: r })
})

router.put('/:id/result', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const experimentId = Number(req.params.id)
  const { status, score, handFeelScore, colorShadeScore, fastnessScore, moistureScore,
    otherScoreName, otherScore, description, reflection, issueRecord, abnormalReason,
    anomalyTypes, anomalyNote,
    improvement, improvementAction, clientFeedback, clientFeedbackResult, notes, scoreItems } = req.body
  const r = await prisma.experimentResult.update({
    where: { experimentId },
    data: {
      status,
      score: score != null ? Number(score) : null,
      handFeelScore: handFeelScore != null ? Number(handFeelScore) : null,
      colorShadeScore: colorShadeScore != null ? Number(colorShadeScore) : null,
      fastnessScore: fastnessScore != null ? Number(fastnessScore) : null,
      moistureScore: moistureScore != null ? Number(moistureScore) : null,
      otherScoreName: otherScoreName ?? null, otherScore: otherScore != null ? Number(otherScore) : null,
      description, reflection, issueRecord,
      abnormalReason: abnormalReason ?? null,
      anomalyTypes: anomalyTypes ?? null, anomalyNote: anomalyNote ?? null,
      improvement, improvementAction: improvementAction ?? null,
      clientFeedback, clientFeedbackResult: clientFeedbackResult ?? null, notes,
      ...(scoreItems !== undefined ? { scoreItems: scoreItems ?? null } : {}),
    },
    include: { attachments: true },
  })
  res.json({ success: true, data: r })
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
    data: { resultId: result.id, fileUrl, fileType: fileType ?? 'image', fileName: decodeFilename(req.file.originalname) },
  })
  res.status(201).json({ success: true, data: a })
})

router.delete('/:id/result/attachments/:attachmentId', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  await prisma.attachment.delete({ where: { id: Number(req.params.attachmentId) } })
  res.json({ success: true, message: '已刪除' })
})

export default router
