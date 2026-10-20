import { Router } from 'express'
import { z } from 'zod'
import prisma from '../db/client'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { aiLimiter } from '../middleware/rateLimit'
import { evidenceSelect, rankHistory, searchTerms, analyzeResults, emphasizeResults } from '../lib/experimentInsights'
const router = Router()
const access = [requireAuth, requirePermission('experiments', 'view'), requirePermission('results', 'view')]
router.get('/insight-experiments', ...access, async (_req, res) => {
  const data = await prisma.experiment.findMany({ take: 100, orderBy: { experimentDate: 'desc' }, select: { id: true, code: true, experimentDate: true, template: { select: { name: true } }, result: { select: { id: true } } } })
  res.json({ success: true, data: data.map(e => ({ id: e.id, code: e.code, date: e.experimentDate.toISOString().slice(0, 10), templateName: e.template?.name ?? null, hasResult: !!e.result })) })
})
router.post('/history-search', ...access, async (req, res) => {
  const parsed = z.object({ question: z.string().trim().min(2).max(1000), referenceId: z.number().int().positive().optional() }).strict().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ success: false, error: { message: '請輸入2到1000字的描述及有效的實驗編號' } }); return }
  const { question, referenceId } = parsed.data
  const reference = referenceId ? await prisma.experiment.findUnique({ where: { id: referenceId }, select: evidenceSelect }) : null
  if (referenceId && !reference) { res.status(404).json({ success: false, error: { message: '找不到參照實驗' } }); return }
  const terms = searchTerms(question)
  if (!terms.length && !reference) { res.status(400).json({ success: false, error: { message: '請補充產品、目的或條件，例如洗髮精黏度、泡沫或溫度；也可選擇參照實驗' } }); return }
  const rows = await prisma.experiment.findMany({ take: 200, orderBy: { experimentDate: 'desc' }, select: evidenceSelect,
    where: { OR: [
      ...terms.flatMap(t => [{ notes: { contains: t, mode: 'insensitive' as const } }, { code: { contains: t, mode: 'insensitive' as const } }, { category: { contains: t, mode: 'insensitive' as const } }, { formula: { is: { name: { contains: t, mode: 'insensitive' as const } } } }, { formula: { is: { productType: { contains: t, mode: 'insensitive' as const } } } }, { template: { is: { name: { contains: t, mode: 'insensitive' as const } } } }, { result: { is: { description: { contains: t, mode: 'insensitive' as const } } } }, { groups: { some: { steps: { some: { description: { contains: t, mode: 'insensitive' as const } } } } } }]),
      ...(reference?.templateId ? [{ templateId: reference.templateId }] : []), ...(reference?.formulaId ? [{ formulaId: reference.formulaId }] : []),
    ] } })
  res.json({ success: true, data: { matches: rankHistory(rows, question, reference), searched: rows.length, capped: rows.length === 200, engine: 'rules', notice: '依文字、範本與配方關聯找參考，最多檢索200筆候選；分數是相似排序，不是成功率。舊結果不能當成新實驗的預測結果。' } })
})
router.post('/result-analysis', ...access, aiLimiter, async (req, res) => {
  const parsed = z.object({ experimentIds: z.array(z.number().int().positive()).min(1).max(8), comparable: z.boolean().default(false), explain: z.boolean().default(false) }).strict().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ success: false, error: { message: '請選擇1到8筆實驗' } }); return }
  const { experimentIds, comparable, explain } = parsed.data
  const ids = [...new Set(experimentIds)]
  const rows = await prisma.experiment.findMany({ where: { id: { in: ids } }, select: evidenceSelect, orderBy: { experimentDate: 'asc' } })
  if (rows.length !== ids.length) { res.status(404).json({ success: false, error: { message: '部分實驗不存在，請重新選擇' } }); return }
  const analysis = analyzeResults(rows, comparable)
  res.json({ success: true, data: explain ? await emphasizeResults(analysis) : analysis })
})
export default router
