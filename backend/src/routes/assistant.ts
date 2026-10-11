import { Router } from 'express'
import OpenAI from 'openai'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { aiLimiter } from '../middleware/rateLimit'
import {
  askAssistant, describeTools, isAiConfigured,
  AiNotConfiguredError, MAX_QUESTION_LENGTH,
  type ChatTurn,
} from '../lib/aiAssistant'

import { askHybrid, cloudReady } from '../lib/aiHybrid'

const router = Router()

/**
 * GET /assistant/status — 前端用來判斷是否顯示 AI 功能，以及有哪些工具可用
 */
router.get('/status', requireAuth, async (req: AuthRequest, res) => {
  const enabled = isAiConfigured()
  res.json({
    success: true,
    data: {
      enabled,
      cloudReady: cloudReady(),
      cloudHost: cloudReady() ? new URL(process.env.AI_CLOUD_BASE_URL!).hostname : null,
      hybridAllowed: req.user!.role === 'ADMIN',
      tools: enabled ? await describeTools(req.user!.role) : [],
    },
  })
})

/**
 * POST /assistant/ask — 自然語言查詢
 *
 * 不掛 requirePermission：可用的查詢工具已依角色權限過濾，
 * 使用者無權檢視的資料類別，模型也拿不到對應工具。
 */
// 限流掛在 requireAuth 之後，keyGenerator 才讀得到 req.user 以登入者計數
router.post('/ask', requireAuth, aiLimiter, async (req: AuthRequest, res) => {
  const { question, history, mode = 'local' } = req.body as { question?: string; history?: ChatTurn[]; mode?: string }

  if (!['local', 'preview', 'hybrid'].includes(mode)) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: '無效的 AI 模式' } }); return
  }
  if (mode !== 'local' && req.user!.role !== 'ADMIN') {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '混合測試模式目前僅開放管理員' } }); return
  }
  if (!isAiConfigured()) {
    res.status(503).json({ success: false, error: { code: 'AI_NOT_CONFIGURED', message: 'AI 已停用' } }); return
  }
  if (typeof question !== 'string' || !question.trim()) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: '請輸入問題' } })
    return
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    res.status(400).json({
      success: false,
      error: { code: 'QUESTION_TOO_LONG', message: `問題長度上限 ${MAX_QUESTION_LENGTH} 字` },
    })
    return
  }

  // 只接受合法的對話輪次，避免前端傳入異常結構
  const cleanHistory: ChatTurn[] = Array.isArray(history)
    ? history
        .filter((h) => (h?.role === 'user' || h?.role === 'assistant') && typeof h?.content === 'string')
        .map((h) => ({ role: h.role, content: h.content.slice(0, MAX_QUESTION_LENGTH) }))
    : []

  try {
    const reply = await askHybrid({
      question: question.trim(),
      history: cleanHistory,
      mode: mode as 'local' | 'preview' | 'hybrid',
      role: req.user!.role,
    })
    res.json({ success: true, data: reply })
  } catch (e) {
    if (e instanceof AiNotConfiguredError) {
      res.status(503).json({
        success: false,
        error: { code: 'AI_NOT_CONFIGURED', message: e.message },
      })
      return
    }
    // 由具體到一般依序判斷，讓前端能區分可重試與不可重試
    if (e instanceof OpenAI.RateLimitError) {
      res.status(429).json({
        success: false,
        error: { code: 'AI_RATE_LIMITED', message: 'AI 服務請求過於頻繁，請稍後再試' },
      })
      return
    }
    if (e instanceof OpenAI.AuthenticationError) {
      res.status(503).json({
        success: false,
        error: { code: 'AI_AUTH_FAILED', message: 'AI 服務金鑰無效，請洽系統管理員' },
      })
      return
    }
    if (e instanceof OpenAI.APIConnectionError) {
      res.status(504).json({
        success: false,
        error: { code: 'AI_UNREACHABLE', message: '無法連線至 AI 服務，請稍後再試' },
      })
      return
    }
    if (e instanceof OpenAI.APIError) {
      console.error('[assistant] OpenAI API error:', e.status, e.message)
      res.status(502).json({
        success: false,
        error: { code: 'AI_ERROR', message: `AI 服務異常（${e.status}）` },
      })
      return
    }
    throw e
  }
})

export default router
