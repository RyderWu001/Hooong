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

// GET /traceability/ingredient/:id — 原料全面追溯（1.6.1~1.6.5）
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
                  samples: { select: { clientName: true, sampleCode: true, status: true } },
                },
                orderBy: { experimentDate: 'desc' },
              },
            },
          },
        },
      },
      abnormalEvents: { orderBy: { occurredAt: 'desc' } },
    },
  })

  if (!ingredient) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到原物料' } })
    return
  }

  // 跨配方去重實驗
  type ExpEntry = typeof ingredient.formulaUses[0]['formula']['experiments'][0] & { formulaName: string; formulaCode: string }
  const expMap = new Map<number, ExpEntry>()
  for (const fu of ingredient.formulaUses) {
    for (const e of fu.formula.experiments) {
      if (!expMap.has(e.id)) expMap.set(e.id, { ...e, formulaName: fu.formula.name, formulaCode: fu.formula.code })
    }
  }
  const allExps = [...expMap.values()]

  // 1.6.1 反查配方
  const formulaUsage = ingredient.formulaUses.map((fu) => ({
    formulaId: fu.formula.id,
    formulaCode: fu.formula.code,
    formulaName: fu.formula.name,
    formulaStatus: fu.formula.status,
    ratio: fu.ratio,
    unit: fu.unit,
    experimentCount: fu.formula.experiments.length,
  }))

  // 1.6.2 反查產品客戶（透過 sample.clientName）
  const clientMap = new Map<string, { sampleCount: number; formulaNames: Set<string>; samples: any[] }>()
  for (const e of allExps) {
    for (const s of e.samples) {
      const key = s.clientName || '未知客戶'
      if (!clientMap.has(key)) clientMap.set(key, { sampleCount: 0, formulaNames: new Set(), samples: [] })
      const c = clientMap.get(key)!
      c.sampleCount++
      c.formulaNames.add(e.formulaName)
      c.samples.push({ sampleCode: s.sampleCode, status: s.status, experimentCode: e.code, formulaName: e.formulaName, experimentDate: e.experimentDate })
    }
  }
  const clientUsage = [...clientMap.entries()].map(([clientName, d]) => ({
    clientName,
    sampleCount: d.sampleCount,
    formulaNames: [...d.formulaNames],
    samples: d.samples,
  }))

  // 1.6.3 反查實驗 + 統計
  const counts = { SUCCESS: 0, FAILED: 0, OBSERVING: 0, NEEDS_ADJUST: 0 }
  for (const e of allExps) {
    const s = (e.result?.status ?? '') as keyof typeof counts
    if (s in counts) counts[s]++
  }
  const total = allExps.length
  const experimentStats = {
    total,
    successCount: counts.SUCCESS,
    failedCount: counts.FAILED,
    observingCount: counts.OBSERVING,
    needsAdjustCount: counts.NEEDS_ADJUST,
    successRate: total > 0 ? ((counts.SUCCESS / total) * 100).toFixed(1) + '%' : '—',
    experiments: allExps.map((e) => ({
      id: e.id, code: e.code,
      experimentDate: e.experimentDate,
      experimenterName: e.experimenter.username,
      formulaName: e.formulaName,
      resultStatus: e.result?.status ?? null,
    })),
  }

  res.json({
    success: true,
    data: {
      ingredient: { id: ingredient.id, name: ingredient.name, code: ingredient.code, unit: ingredient.unit, status: ingredient.status },
      formulaUsage,      // 1.6.1
      clientUsage,       // 1.6.2
      experimentStats,   // 1.6.3
      anomalyEvents: ingredient.abnormalEvents,  // 1.6.4
      batches: ingredient.batches,               // 1.6.5
    },
  })
})

export default router
