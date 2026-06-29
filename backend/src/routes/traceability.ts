import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth } from '../middleware/auth'

const router = Router()

// GET /traceability/formula/:id — 配方版本溯源
router.get('/formula/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  const formula = await prisma.formula.findUnique({
    where: { id },
    include: {
      versions: {
        orderBy: { version: 'asc' },
        include: { createdBy: { select: { username: true } } },
      },
      experiments: {
        orderBy: { experimentDate: 'desc' },
        include: {
          experimenter: { select: { username: true } },
          result: { select: { status: true, score: true } },
          samples: { select: { id: true, sampleCode: true, clientName: true, status: true } },
        },
      },
    },
  })
  if (!formula) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到配方' } })
    return
  }
  res.json({
    success: true,
    data: {
      formula: {
        id: formula.id, code: formula.code, name: formula.name,
        productType: formula.productType, status: formula.status,
        currentVersion: formula.currentVersion, createdAt: formula.createdAt,
      },
      versions: formula.versions.map((v) => ({
        id: v.id, version: v.version, changeNote: v.changeNote,
        createdAt: v.createdAt, createdBy: v.createdBy.username,
        ingredientsSnapshot: v.ingredientsSnapshot,
      })),
      experiments: formula.experiments.map((e) => ({
        id: e.id, code: e.code,
        experimentDate: e.experimentDate,
        experimenterName: e.experimenter.username,
        result: e.result ? { status: e.result.status, score: e.result.score } : null,
        samplesCount: e.samples.length,
      })),
    },
  })
})

// GET /traceability/ingredient/:id — 成分批號追溯
router.get('/ingredient/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  const ingredient = await prisma.ingredient.findUnique({
    where: { id },
    include: {
      batches: { orderBy: { createdAt: 'desc' } },
      formulaUses: {
        include: {
          formula: {
            select: {
              id: true, code: true, name: true, status: true,
              experiments: {
                select: {
                  id: true, code: true, experimentDate: true,
                  experimenter: { select: { username: true } },
                  result: { select: { status: true } },
                },
                orderBy: { experimentDate: 'desc' },
                take: 10,
              },
            },
          },
        },
      },
    },
  })
  if (!ingredient) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到原物料' } })
    return
  }
  res.json({
    success: true,
    data: {
      ingredient: {
        id: ingredient.id, name: ingredient.name,
        code: ingredient.code, unit: ingredient.unit,
        status: ingredient.status,
      },
      batches: ingredient.batches,
      usedInFormulas: ingredient.formulaUses.map((fu) => ({
        formulaId: fu.formula.id,
        formulaCode: fu.formula.code,
        formulaName: fu.formula.name,
        formulaStatus: fu.formula.status,
        ratio: fu.ratio,
        unit: fu.unit,
        experiments: fu.formula.experiments.map((e) => ({
          id: e.id, code: e.code,
          experimentDate: e.experimentDate,
          experimenterName: e.experimenter.username,
          resultStatus: e.result?.status ?? null,
        })),
      })),
    },
  })
})

export default router
