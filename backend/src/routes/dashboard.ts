import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { collectAlerts } from '../lib/alerts'

const router = Router()

/**
 * GET /dashboard/alerts — 待辦提醒明細
 *
 * 不掛 requirePermission：提醒本身是彙整資訊，且內容已依角色（可簽核的關卡）過濾。
 */
router.get('/alerts', requireAuth, async (req: AuthRequest, res) => {
  const summary = await collectAlerts(req.user!.role)
  res.json({ success: true, data: summary })
})

/**
 * GET /dashboard/alerts/count — 僅回傳數量，供選單紅點輪詢使用
 */
router.get('/alerts/count', requireAuth, async (req: AuthRequest, res) => {
  const { total, criticalCount, counts } = await collectAlerts(req.user!.role)
  res.json({ success: true, data: { total, criticalCount, counts } })
})

/**
 * GET /dashboard/summary — 首頁統計
 */
router.get('/summary', requireAuth, async (_req, res) => {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [
    experimentsThisMonth,
    experimentsPrevMonth,
    resultCounts,
    totalFormulas,
    totalIngredients,
    activeSamples,
    recentExperiments,
  ] = await Promise.all([
    prisma.experiment.count({ where: { experimentDate: { gte: monthStart } } }),
    prisma.experiment.count({
      where: { experimentDate: { gte: prevMonthStart, lt: monthStart } },
    }),
    prisma.experimentResult.groupBy({
      by: ['status'],
      _count: { _all: true },
      where: { experiment: { experimentDate: { gte: monthStart } } },
    }),
    prisma.formula.count(),
    prisma.ingredient.count(),
    prisma.sample.count({ where: { status: { notIn: ['報廢', '完成'] } } }),
    prisma.experiment.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, code: true, category: true, experimentDate: true, createdAt: true,
        formula: { select: { name: true } },
        experimenter: { select: { username: true } },
        result: { select: { status: true } },
      },
    }),
  ])

  const byStatus: Record<string, number> = {}
  for (const r of resultCounts) byStatus[r.status] = r._count._all

  const judged = (byStatus.SUCCESS ?? 0) + (byStatus.FAILED ?? 0)
  // 成功率只計已判定的實驗，觀察中／待調整不列入分母
  const successRate = judged > 0 ? Math.round(((byStatus.SUCCESS ?? 0) / judged) * 100) : null

  res.json({
    success: true,
    data: {
      experiments: {
        thisMonth: experimentsThisMonth,
        prevMonth: experimentsPrevMonth,
        successRate,
        byStatus,
      },
      totals: {
        formulas: totalFormulas,
        ingredients: totalIngredients,
        activeSamples,
      },
      recentExperiments: recentExperiments.map((e) => ({
        id: e.id,
        code: e.code,
        category: e.category,
        formulaName: e.formula?.name ?? '—',
        experimenterName: e.experimenter.username,
        experimentDate: e.experimentDate,
        createdAt: e.createdAt,
        resultStatus: e.result?.status ?? null,
      })),
    },
  })
})

export default router
