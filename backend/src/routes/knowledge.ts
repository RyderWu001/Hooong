import { Router } from 'express'
import OpenAI from 'openai'
import prisma from '../db/client'
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth'
import { validateNumericParams } from '../lib/query'
import { aiLimiter } from '../middleware/rateLimit'

const router = Router()
validateNumericParams(router)

// GET /knowledge — 列表 + 搜尋
router.get('/', requireAuth, async (req, res) => {
  const { keyword, category, page = '1', limit = '20' } = req.query
  const p = Number(page), l = Number(limit)

  const where: any = {}
  if (keyword) {
    where.OR = [
      { title: { contains: keyword as string, mode: 'insensitive' } },
      { content: { contains: keyword as string, mode: 'insensitive' } },
      { tags: { contains: keyword as string, mode: 'insensitive' } },
    ]
  }
  if (category) where.category = category as string

  const [data, total] = await Promise.all([
    prisma.knowledgeArticle.findMany({
      where,
      include: { createdBy: { select: { username: true } } },
      orderBy: { updatedAt: 'desc' },
      skip: (p - 1) * l,
      take: l,
    }),
    prisma.knowledgeArticle.count({ where }),
  ])

  res.json({
    success: true,
    data: data.map((a) => ({ ...a, createdByName: a.createdBy.username, createdBy: undefined })),
    pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) },
  })
})

// GET /knowledge/categories — 所有分類列表
router.get('/categories', requireAuth, async (_req, res) => {
  const articles = await prisma.knowledgeArticle.findMany({
    select: { category: true },
    distinct: ['category'],
    where: { category: { not: '' } },
  })
  res.json({ success: true, data: articles.map((a) => a.category) })
})

// GET /knowledge/:id
router.get('/:id', requireAuth, async (req, res) => {
  const article = await prisma.knowledgeArticle.findUnique({
    where: { id: Number(req.params.id) },
    include: { createdBy: { select: { username: true } } },
  })
  if (!article) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到文章' } })
    return
  }
  res.json({ success: true, data: { ...article, createdByName: article.createdBy.username, createdBy: undefined } })
})

// POST /knowledge — 建立文章 (ADMIN / MANAGER)
router.post('/', requireAuth, requireRole('ADMIN', 'MANAGER'), async (req: AuthRequest, res) => {
  const { title, content, category, tags } = req.body
  const article = await prisma.knowledgeArticle.create({
    data: { title, content, category: category ?? '', tags: tags ?? '', createdById: req.user!.id },
    include: { createdBy: { select: { username: true } } },
  })
  res.status(201).json({ success: true, data: { ...article, createdByName: article.createdBy.username, createdBy: undefined } })
})

// PUT /knowledge/:id
router.put('/:id', requireAuth, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const { title, content, category, tags } = req.body
  const article = await prisma.knowledgeArticle.update({
    where: { id: Number(req.params.id) },
    data: { title, content, category, tags },
    include: { createdBy: { select: { username: true } } },
  })
  res.json({ success: true, data: { ...article, createdByName: article.createdBy.username, createdBy: undefined } })
})

// DELETE /knowledge/:id
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  await prisma.knowledgeArticle.delete({ where: { id: Number(req.params.id) } })
  res.json({ success: true })
})

// POST /knowledge/ai-chat — AI 問答（需要 ANTHROPIC_API_KEY）
router.post('/ai-chat', requireAuth, aiLimiter, async (req, res) => {
  const { question, history = [] } = req.body
  if (!question?.trim()) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: '請輸入問題' } })
    return
  }
  // 每次呼叫都會產生外部 API 費用，長度需設上限
  if (String(question).length > 2000) {
    res.status(400).json({ success: false, error: { code: 'QUESTION_TOO_LONG', message: '問題長度上限 2000 字' } })
    return
  }

  // 從混合中英文問題中提取關鍵字（bigram + ASCII word）
  function extractKeywords(text: string): string[] {
    const kw = new Set<string>()
    const ascii = text.match(/[a-zA-Z][a-zA-Z0-9]*/g) ?? []
    ascii.filter((w) => w.length >= 2).forEach((w) => kw.add(w))
    text.match(/\d+(\.\d+)?/g)?.forEach((n) => kw.add(n))
    const cjkRuns = text.match(/[一-鿿]+/g) ?? []
    for (const run of cjkRuns) {
      for (let i = 0; i < run.length - 1; i++) kw.add(run.substring(i, i + 2))
      if (run.length >= 3) for (let i = 0; i < run.length - 2; i++) kw.add(run.substring(i, i + 3))
    }
    return [...kw].filter((k) => k.length >= 2)
  }

  const keywords = extractKeywords(question)
  const [articles, formulas, experiments] = await Promise.all([
    prisma.knowledgeArticle.findMany({
      where: keywords.length > 0 ? {
        OR: keywords.flatMap((kw) => [
          { title: { contains: kw, mode: 'insensitive' } },
          { tags: { contains: kw, mode: 'insensitive' } },
          { content: { contains: kw, mode: 'insensitive' } },
        ]),
      } : {},
      take: 4,
      orderBy: { updatedAt: 'desc' },
    }),
    // 讓 AI 也能從過去的配方中找資料，例如「防水」「透明」等訴求
    prisma.formula.findMany({
      where: keywords.length > 0 ? {
        OR: keywords.flatMap((kw) => [
          { code: { contains: kw, mode: 'insensitive' } },
          { name: { contains: kw, mode: 'insensitive' } },
          { description: { contains: kw, mode: 'insensitive' } },
          { category: { contains: kw, mode: 'insensitive' } },
          { productType: { contains: kw, mode: 'insensitive' } },
        ]),
      } : {},
      take: 4,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.experiment.findMany({
      where: keywords.length > 0 ? {
        OR: keywords.flatMap((kw) => [
          { code: { contains: kw, mode: 'insensitive' } },
          { notes: { contains: kw, mode: 'insensitive' } },
          { category: { contains: kw, mode: 'insensitive' } },
          { clientCompany: { contains: kw, mode: 'insensitive' } },
          { conclusionBefore: { contains: kw, mode: 'insensitive' } },
          { conclusionAfter: { contains: kw, mode: 'insensitive' } },
        ]),
      } : {},
      take: 4,
      orderBy: { experimentDate: 'desc' },
      include: {
        formula: { select: { code: true, name: true } },
        result: { select: { description: true, reflection: true } },
      },
    }),
  ])

  if (process.env.AI_DISABLED === 'yes') {
    const sections: string[] = []
    if (articles.length > 0) {
      sections.push(`**相關知識庫文章：**\n${articles.map((a) => `- **${a.title}**：${a.content.substring(0, 100)}…`).join('\n')}`)
    }
    if (formulas.length > 0) {
      sections.push(`**相關配方：**\n${formulas.map((f) => `- **${f.code} ${f.name}**（${f.productType}）：${f.description.substring(0, 100)}…`).join('\n')}`)
    }
    if (experiments.length > 0) {
      sections.push(`**相關實驗紀錄：**\n${experiments.map((e) => `- **${e.code}**（${e.formula?.name ?? '無配方'}）：${e.notes.substring(0, 100)}…`).join('\n')}`)
    }
    res.json({
      success: true,
      data: {
        answer: `AI 功能已停用（AI_DISABLED=yes）。\n\n${sections.length > 0 ? sections.join('\n\n') : '（無相關資料）'}`,
        aiEnabled: false,
      },
    })
    return
  }

  const systemPrompt = `你是實驗室資訊管理系統的AI助理，擅長配方管理、材料與化學品、品質管理、實驗紀錄等領域知識。你可以參考系統內的知識庫文章、過去的配方與實驗紀錄來回答問題（例如協助從過去資料中找出符合特定性能需求的配方）。請用繁體中文回答，語氣專業但易懂；若參考資料中找不到答案，請誠實告知，不要編造。`

  const contextText = [
    articles.length > 0
      ? `**知識庫參考資料：**\n${articles.map((a) => `### ${a.title}\n${a.content}`).join('\n\n')}`
      : '',
    formulas.length > 0
      ? `**配方參考資料：**\n${formulas.map((f) => `### ${f.code} ${f.name}\n類別：${f.category ?? '未分類'} / ${f.productType}\n說明：${f.description}`).join('\n\n')}`
      : '',
    experiments.length > 0
      ? `**實驗紀錄參考資料：**\n${experiments.map((e) => `### ${e.code}（配方：${e.formula?.name ?? '無'}）\n客戶：${e.clientCompany ?? '無'}\n備註：${e.notes}\n結論：${[e.conclusionBefore, e.conclusionAfter].filter(Boolean).join(' → ') || e.result?.description || '無'}`).join('\n\n')}`
      : '',
  ].filter(Boolean).join('\n\n')

  const priorTurns = (Array.isArray(history) ? history : [])
    .filter((turn: { role?: string; content?: unknown }) =>
      (turn?.role === 'user' || turn?.role === 'assistant') && typeof turn.content === 'string')
    .slice(-6)
    .map((turn: { role: 'user' | 'assistant'; content: string }) => ({
      role: turn.role, content: turn.content.slice(0, 2000),
    }))

  // 逾時保護：上游若無回應，請求會一直懸著並佔用連線
  let answer: string
  try {
    const completion = await new OpenAI({
      baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
      apiKey: 'ollama',
      timeout: 30_000,
    }).chat.completions.create({
      model: process.env.OLLAMA_MODEL || 'qwen2.5:7b',
      max_tokens: 1500,
      messages: [
        { role: 'system', content: systemPrompt },
        ...priorTurns,
        { role: 'user', content: contextText ? `${question}\n\n${contextText}` : question },
      ],
    })
    answer = completion.choices[0]?.message?.content ?? '無回應'
  } catch (e) {
    if (e instanceof OpenAI.APIConnectionTimeoutError) {
      res.status(504).json({ success: false, error: { code: 'AI_TIMEOUT', message: 'AI 服務逾時，請稍後再試' } })
      return
    }
    if (e instanceof OpenAI.APIConnectionError) {
      res.status(504).json({ success: false, error: { code: 'AI_UNREACHABLE', message: 'AI 服務連線失敗' } })
      return
    }
    if (e instanceof OpenAI.APIError) {
      res.status(502).json({ success: false, error: { code: 'AI_ERROR', message: `AI 服務異常 (${e.status})` } })
      return
    }
    throw e
  }

  res.json({
    success: true,
    data: {
      answer,
      relatedArticles: articles.map((a) => ({ id: a.id, title: a.title })),
      aiEnabled: true,
    },
  })
})

export default router
