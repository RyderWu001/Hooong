import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

const json = (message: string) => ({
  success: false,
  error: { code: 'RATE_LIMITED', message },
})

/** 一般 API：擋住異常的自動化流量，正常操作不會觸及。 */
export const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json('請求過於頻繁，請稍後再試'),
})

/**
 * 登入與註冊：沒有限制時可無限次嘗試密碼。
 * 以 IP 計數，成功的請求不計入，避免正常使用者被自己的登入次數卡住。
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json('登入嘗試次數過多，請 15 分鐘後再試'),
})

/**
 * AI 問答：每次呼叫都會產生外部 API 費用，需獨立且更嚴格的限制。
 * 以登入者為單位計數，避免同一辦公室共用 IP 時互相影響。
 */
export const aiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // 未登入時回退到 IP，IPv6 需經 ipKeyGenerator 正規化子網段，否則可換位址繞過
  keyGenerator: (req, res) => {
    const userId = (req as { user?: { id: number } }).user?.id
    return userId ? `u:${userId}` : ipKeyGenerator(req.ip ?? '', res as never)
  },
  message: json('AI 問答過於頻繁，請稍後再試'),
})
