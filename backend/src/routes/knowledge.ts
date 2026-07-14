import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth'

const router = Router()

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
router.post('/ai-chat', requireAuth, async (req, res) => {
  const { question, history = [] } = req.body
  if (!question?.trim()) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: '請輸入問題' } })
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
  const articles = await prisma.knowledgeArticle.findMany({
    where: keywords.length > 0 ? {
      OR: keywords.flatMap((kw) => [
        { title: { contains: kw, mode: 'insensitive' } },
        { tags: { contains: kw, mode: 'insensitive' } },
        { content: { contains: kw, mode: 'insensitive' } },
      ]),
    } : {},
    take: 4,
    orderBy: { updatedAt: 'desc' },
  })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.json({
      success: true,
      data: {
        answer: `AI 功能尚未啟用（請在後端 .env 設定 ANTHROPIC_API_KEY）。\n\n**相關知識庫文章：**\n${
          articles.length > 0
            ? articles.map((a) => `- **${a.title}**：${a.content.substring(0, 100)}…`).join('\n')
            : '（無相關文章）'
        }`,
        relatedArticles: articles.map((a) => ({ id: a.id, title: a.title })),
        aiEnabled: false,
      },
    })
    return
  }

  const systemPrompt = `你是泓利廣染整實驗室的AI助理，擅長染色配方、纖維材料、品質管理、實驗紀錄等領域知識。請用繁體中文回答，語氣專業但易懂。`

  const contextText = articles.length > 0
    ? `\n\n**知識庫參考資料：**\n${articles.map((a) => `### ${a.title}\n${a.content}`).join('\n\n')}`
    : ''

  const messages = [
    ...(history as { role: string; content: string }[]).slice(-6),
    { role: 'user', content: `${question}${contextText}` },
  ]

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: systemPrompt,
      messages,
    }),
  })

  if (!response.ok) {
    res.status(502).json({ success: false, error: { code: 'AI_ERROR', message: `AI 服務異常 (${response.status})` } })
    return
  }

  const aiData = await response.json() as { content: { type: string; text: string }[] }
  const answer = aiData.content.find((c) => c.type === 'text')?.text ?? '無回應'

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
