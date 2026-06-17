import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth } from '../middleware/auth'

const router = Router()

function dateWhere(dateFrom?: string, dateTo?: string) {
  if (!dateFrom && !dateTo) return undefined
  const w: any = {}
  if (dateFrom) w.gte = new Date(dateFrom)
  if (dateTo) w.lte = new Date(`${dateTo}T23:59:59Z`)
  return w
}

// GET /reports/experiments  — 4.1 實驗紀錄報表
router.get('/experiments', requireAuth, async (req, res) => {
  const { formulaId, experimenterId, dateFrom, dateTo } = req.query
  const where: any = {}
  if (formulaId) where.formulaId = Number(formulaId)
  if (experimenterId) where.experimenterId = Number(experimenterId)
  const dw = dateWhere(dateFrom as string, dateTo as string)
  if (dw) where.experimentDate = dw

  const data = await prisma.experiment.findMany({
    where,
    include: { formula: { select: { name: true } }, experimenter: { select: { username: true } }, steps: true },
    orderBy: { experimentDate: 'desc' },
  })
  res.json({
    success: true,
    data: data.map((e) => ({ ...e, formulaName: e.formula.name, experimenterName: e.experimenter.username, formula: undefined, experimenter: undefined })),
    pagination: { page: 1, limit: data.length, total: data.length, totalPages: 1 },
  })
})

// GET /reports/formulas/usage  — 4.2 配方使用報表
router.get('/formulas/usage', requireAuth, async (req, res) => {
  const { formulaId, productType } = req.query
  const formulaWhere: any = { status: { not: 'DELETED' } }
  if (formulaId) formulaWhere.id = Number(formulaId)
  if (productType) formulaWhere.productType = productType

  const formulas = await prisma.formula.findMany({
    where: formulaWhere,
    include: {
      experiments: {
        include: { result: { select: { status: true } } },
      },
    },
  })

  const data = formulas.map((f) => {
    const results = f.experiments.map((e) => e.result).filter(Boolean)
    return {
      formulaId: f.id,
      formulaCode: f.code,
      formulaName: f.name,
      productType: f.productType,
      usageCount: f.experiments.length,
      successCount: results.filter((r) => r?.status === 'SUCCESS').length,
      failedCount: results.filter((r) => r?.status === 'FAILED').length,
      observingCount: results.filter((r) => r?.status === 'OBSERVING').length,
      needsAdjustCount: results.filter((r) => r?.status === 'NEEDS_ADJUST').length,
    }
  })
  res.json({ success: true, data })
})

// GET /reports/results/summary  — 4.3 實驗結果統計
router.get('/results/summary', requireAuth, async (req, res) => {
  const { status, formulaName, experimenterId, dateFrom, dateTo } = req.query
  const where: any = {}
  if (status) where.status = status
  const dw = dateWhere(dateFrom as string, dateTo as string)
  if (dw) where.createdAt = dw
  if (formulaName || experimenterId) {
    where.experiment = {}
    if (formulaName) where.experiment.formula = { name: { contains: formulaName as string } }
    if (experimenterId) where.experiment.experimenterId = Number(experimenterId)
  }

  const results = await prisma.experimentResult.findMany({
    where,
    include: { experiment: { include: { formula: { select: { name: true } }, experimenter: { select: { username: true } } } } },
    orderBy: { createdAt: 'desc' },
  })

  const detail = results.map((r) => ({
    ...r,
    experimentCode: r.experiment.code,
    formulaName: r.experiment.formula.name,
    experimenterName: r.experiment.experimenter.username,
    experiment: undefined,
  }))

  const total = detail.length
  const successCount = detail.filter((r) => r.status === 'SUCCESS').length
  const failedCount = detail.filter((r) => r.status === 'FAILED').length
  const observingCount = detail.filter((r) => r.status === 'OBSERVING').length
  const needsAdjustCount = detail.filter((r) => r.status === 'NEEDS_ADJUST').length

  res.json({
    success: true,
    data: {
      total, successCount, failedCount, observingCount, needsAdjustCount,
      successRate: total ? `${Math.round((successCount / total) * 100)}%` : '0%',
      detail,
    },
  })
})

// GET /reports/custom  — 4.4 條件式查詢
router.get('/custom', requireAuth, async (req, res) => {
  const { type, formulaId, experimenterId, status, dateFrom, dateTo } = req.query

  if (type === 'formula') {
    const where: any = {}
    if (formulaId) where.id = Number(formulaId)
    const formulas = await prisma.formula.findMany({
      where: { ...where, status: { not: 'DELETED' } },
      include: { experiments: { include: { result: { select: { status: true } } } } },
    })
    const data = formulas.map((f) => {
      const results = f.experiments.map((e) => e.result).filter(Boolean)
      return {
        formulaId: f.id, formulaCode: f.code, formulaName: f.name, productType: f.productType,
        usageCount: f.experiments.length,
        successCount: results.filter((r) => r?.status === 'SUCCESS').length,
        failedCount: results.filter((r) => r?.status === 'FAILED').length,
        observingCount: results.filter((r) => r?.status === 'OBSERVING').length,
      }
    })
    res.json({ success: true, data })
    return
  }

  if (type === 'result') {
    const where: any = {}
    if (status) where.status = status
    const dw = dateWhere(dateFrom as string, dateTo as string)
    if (dw) where.createdAt = dw
    if (formulaId || experimenterId) {
      where.experiment = {}
      if (formulaId) where.experiment.formulaId = Number(formulaId)
      if (experimenterId) where.experiment.experimenterId = Number(experimenterId)
    }
    const results = await prisma.experimentResult.findMany({
      where,
      include: { experiment: { include: { formula: { select: { name: true } }, experimenter: { select: { username: true } } } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json({
      success: true,
      data: results.map((r) => ({ ...r, experimentCode: r.experiment.code, formulaName: r.experiment.formula.name, experimenterName: r.experiment.experimenter.username, experiment: undefined })),
    })
    return
  }

  // default: experiment
  const where: any = {}
  if (formulaId) where.formulaId = Number(formulaId)
  if (experimenterId) where.experimenterId = Number(experimenterId)
  const dw = dateWhere(dateFrom as string, dateTo as string)
  if (dw) where.experimentDate = dw
  const exps = await prisma.experiment.findMany({
    where,
    include: { formula: { select: { name: true } }, experimenter: { select: { username: true } }, steps: true },
    orderBy: { experimentDate: 'desc' },
  })
  res.json({
    success: true,
    data: exps.map((e) => ({ ...e, formulaName: e.formula.name, experimenterName: e.experimenter.username, formula: undefined, experimenter: undefined })),
  })
})

export default router
