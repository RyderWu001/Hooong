import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth'

const router = Router()

// ── Formula Risks ──────────────────────────────────────────────
router.get('/formulas', requireAuth, async (req, res) => {
  const { riskLevel } = req.query
  const where = riskLevel ? { riskLevel: riskLevel as string } : {}
  const data = await prisma.formulaRisk.findMany({
    where,
    include: { formula: { select: { code: true, name: true } }, assessedBy: { select: { username: true } } },
    orderBy: { assessedAt: 'desc' },
  })
  res.json({ success: true, data: data.map((r) => ({ ...r, formulaCode: r.formula.code, formulaName: r.formula.name, assessedBy: r.assessedBy.username, formula: undefined })) })
})

router.post('/formulas', requireAuth, requireRole('ADMIN', 'LAB_STAFF', 'MANAGER'), async (req: AuthRequest, res) => {
  const { formulaId, riskLevel, riskType, description, mitigation, nextReviewAt } = req.body
  const r = await prisma.formulaRisk.create({
    data: { formulaId, riskLevel, riskType, description, mitigation, nextReviewAt: new Date(nextReviewAt), assessedById: req.user!.id },
    include: { formula: { select: { code: true, name: true } }, assessedBy: { select: { username: true } } },
  })
  res.status(201).json({ success: true, data: { ...r, formulaCode: r.formula.code, formulaName: r.formula.name, assessedBy: r.assessedBy.username, formula: undefined } })
})

router.put('/formulas/:id', requireAuth, requireRole('ADMIN', 'LAB_STAFF', 'MANAGER'), async (req, res) => {
  const { riskLevel, riskType, description, mitigation, nextReviewAt } = req.body
  const r = await prisma.formulaRisk.update({
    where: { id: Number(req.params.id) },
    data: { riskLevel, riskType, description, mitigation, nextReviewAt: nextReviewAt ? new Date(nextReviewAt) : undefined },
    include: { formula: { select: { code: true, name: true } }, assessedBy: { select: { username: true } } },
  })
  res.json({ success: true, data: { ...r, formulaCode: r.formula.code, formulaName: r.formula.name, assessedBy: r.assessedBy.username, formula: undefined } })
})

router.delete('/formulas/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  await prisma.formulaRisk.delete({ where: { id: Number(req.params.id) } })
  res.json({ success: true, message: '已刪除' })
})

// ── Ingredient Risks ───────────────────────────────────────────
router.get('/ingredients', requireAuth, async (req, res) => {
  const { riskLevel } = req.query
  const where = riskLevel ? { riskLevel: riskLevel as string } : {}
  const data = await prisma.ingredientRisk.findMany({
    where,
    include: { ingredient: { select: { name: true } }, assessedBy: { select: { username: true } } },
    orderBy: { assessedAt: 'desc' },
  })
  res.json({ success: true, data: data.map((r) => ({ ...r, ingredientName: r.ingredient.name, assessedBy: r.assessedBy.username, ingredient: undefined })) })
})

router.post('/ingredients', requireAuth, requireRole('ADMIN', 'LAB_STAFF', 'MANAGER'), async (req: AuthRequest, res) => {
  const { ingredientId, riskLevel, riskType, hazardDescription, safeHandling, storageRequirements } = req.body
  const r = await prisma.ingredientRisk.create({
    data: { ingredientId, riskLevel, riskType, hazardDescription, safeHandling, storageRequirements, assessedById: req.user!.id },
    include: { ingredient: { select: { name: true } }, assessedBy: { select: { username: true } } },
  })
  res.status(201).json({ success: true, data: { ...r, ingredientName: r.ingredient.name, assessedBy: r.assessedBy.username, ingredient: undefined } })
})

router.put('/ingredients/:id', requireAuth, requireRole('ADMIN', 'LAB_STAFF', 'MANAGER'), async (req, res) => {
  const { riskLevel, riskType, hazardDescription, safeHandling, storageRequirements } = req.body
  const r = await prisma.ingredientRisk.update({
    where: { id: Number(req.params.id) },
    data: { riskLevel, riskType, hazardDescription, safeHandling, storageRequirements },
    include: { ingredient: { select: { name: true } }, assessedBy: { select: { username: true } } },
  })
  res.json({ success: true, data: { ...r, ingredientName: r.ingredient.name, assessedBy: r.assessedBy.username, ingredient: undefined } })
})

router.delete('/ingredients/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  await prisma.ingredientRisk.delete({ where: { id: Number(req.params.id) } })
  res.json({ success: true, message: '已刪除' })
})

// ── Abnormal Events ────────────────────────────────────────────
router.get('/events', requireAuth, async (req, res) => {
  const { status, severity, eventType } = req.query
  const where: any = {}
  if (status) where.status = status
  if (severity) where.severity = severity
  if (eventType) where.eventType = eventType
  const data = await prisma.abnormalEvent.findMany({
    where,
    include: {
      reportedBy: { select: { username: true } },
      resolvedBy: { select: { username: true } },
      relatedFormula: { select: { name: true } },
      relatedIngredient: { select: { name: true } },
    },
    orderBy: { occurredAt: 'desc' },
  })
  res.json({
    success: true,
    data: data.map((e) => ({
      ...e,
      reportedBy: e.reportedBy.username,
      resolvedBy: e.resolvedBy?.username,
      relatedFormulaName: e.relatedFormula?.name,
      relatedIngredientName: e.relatedIngredient?.name,
      relatedFormula: undefined,
      relatedIngredient: undefined,
    })),
  })
})

router.post('/events', requireAuth, async (req: AuthRequest, res) => {
  const { title, description, eventType, severity, occurredAt, relatedFormulaId, relatedIngredientId } = req.body
  const count = await prisma.abnormalEvent.count()
  const eventCode = `EVT-${String(count + 1).padStart(4, '0')}`
  const e = await prisma.abnormalEvent.create({
    data: { eventCode, title, description, eventType, severity, occurredAt: new Date(occurredAt), relatedFormulaId, relatedIngredientId, reportedById: req.user!.id },
    include: { reportedBy: { select: { username: true } }, relatedFormula: { select: { name: true } }, relatedIngredient: { select: { name: true } } },
  })
  res.status(201).json({ success: true, data: { ...e, reportedBy: e.reportedBy.username, relatedFormulaName: e.relatedFormula?.name, relatedIngredientName: e.relatedIngredient?.name, relatedFormula: undefined, relatedIngredient: undefined } })
})

router.put('/events/:id', requireAuth, requireRole('ADMIN', 'LAB_STAFF', 'MANAGER'), async (req: AuthRequest, res) => {
  const { status, resolution, resolvedAt } = req.body
  const e = await prisma.abnormalEvent.update({
    where: { id: Number(req.params.id) },
    data: { status, resolution, resolvedAt: resolvedAt ? new Date(resolvedAt) : undefined, resolvedById: status === 'RESOLVED' || status === 'CLOSED' ? req.user!.id : undefined },
    include: { reportedBy: { select: { username: true } }, resolvedBy: { select: { username: true } }, relatedFormula: { select: { name: true } }, relatedIngredient: { select: { name: true } } },
  })
  res.json({ success: true, data: { ...e, reportedBy: e.reportedBy.username, resolvedBy: e.resolvedBy?.username, relatedFormulaName: e.relatedFormula?.name, relatedIngredientName: e.relatedIngredient?.name, relatedFormula: undefined, relatedIngredient: undefined } })
})

router.delete('/events/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  await prisma.abnormalEvent.delete({ where: { id: Number(req.params.id) } })
  res.json({ success: true, message: '已刪除' })
})

// ── Risk Report ────────────────────────────────────────────────
router.get('/report', requireAuth, async (req, res) => {
  const LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

  const [formulaRisks, ingredientRisks, eventCounts, eventTotal, recentEvents] = await Promise.all([
    prisma.formulaRisk.groupBy({ by: ['riskLevel'], _count: { _all: true } }),
    prisma.ingredientRisk.groupBy({ by: ['riskLevel'], _count: { _all: true } }),
    prisma.abnormalEvent.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.abnormalEvent.count(),
    prisma.abnormalEvent.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        reportedBy: { select: { username: true } },
        resolvedBy: { select: { username: true } },
        relatedFormula: { select: { name: true } },
        relatedIngredient: { select: { name: true } },
      },
    }),
  ])

  const toDict = (arr: { riskLevel: string; _count: { _all: number } }[]) =>
    LEVELS.reduce<Record<string, number>>((acc, level) => {
      acc[level] = arr.find((r) => r.riskLevel === level)?._count._all ?? 0
      return acc
    }, {})

  const countByStatus = (status: string) =>
    eventCounts.find((e) => e.status === status)?._count._all ?? 0

  res.json({
    success: true,
    data: {
      formulaRiskDist: toDict(formulaRisks),
      ingRiskDist: toDict(ingredientRisks),
      eventTotal,
      eventOpen: countByStatus('OPEN'),
      eventInvestigating: countByStatus('INVESTIGATING'),
      eventResolved: countByStatus('RESOLVED'),
      eventClosed: countByStatus('CLOSED'),
      recentEvents: recentEvents.map((e) => ({
        ...e,
        reportedBy: e.reportedBy.username,
        resolvedBy: e.resolvedBy?.username,
        relatedFormulaName: e.relatedFormula?.name,
        relatedIngredientName: e.relatedIngredient?.name,
        relatedFormula: undefined,
        relatedIngredient: undefined,
      })),
    },
  })
})

export default router
