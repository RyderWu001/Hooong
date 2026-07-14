import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth } from '../middleware/auth'

const router = Router()

// GET /results  — 跨實驗的結果列表
router.get('/', requireAuth, async (req, res) => {
  const page = Number(req.query.page ?? 1)
  const limit = Number(req.query.limit ?? 20)
  const { experimentCode, formulaName, experimenterId, status, dateFrom, dateTo } = req.query

  const where: any = {}
  if (status) where.status = status
  if (dateFrom || dateTo) {
    where.createdAt = {}
    if (dateFrom) where.createdAt.gte = new Date(dateFrom as string)
    if (dateTo) where.createdAt.lte = new Date(`${dateTo}T23:59:59Z`)
  }
  if (experimentCode || formulaName || experimenterId) {
    where.experiment = {}
    if (experimentCode) where.experiment.code = { contains: experimentCode as string }
    if (formulaName) where.experiment.formula = { name: { contains: formulaName as string } }
    if (experimenterId) where.experiment.experimenterId = Number(experimenterId)
  }

  const include = {
    experiment: { include: { formula: { select: { name: true } }, experimenter: { select: { username: true } } } },
    attachments: true,
  }

  const [data, total] = await Promise.all([
    prisma.experimentResult.findMany({ where, skip: (page - 1) * limit, take: limit, include, orderBy: { createdAt: 'desc' } }),
    prisma.experimentResult.count({ where }),
  ])

  const formatted = data.map((r) => ({
    ...r,
    experimentCode: r.experiment.code,
    formulaName: r.experiment.formula.name,
    experimenterName: r.experiment.experimenter.username,
    experiment: undefined,
  }))

  res.json({ success: true, data: formatted, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
})

export default router
