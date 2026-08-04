import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../db/client'

function readSecret(): string {
  const s = process.env.JWT_SECRET
  if (!s) {
    throw new Error(
      'JWT_SECRET 未設定。請在 .env 設定一組隨機字串（可用 openssl rand -base64 32 產生），' +
      '否則任何取得原始碼的人都能自行簽發管理員 token。'
    )
  }
  return s
}

const SECRET: string = readSecret()

export interface AuthRequest extends Request {
  user?: { id: number; role: string; email: string }
}

/**
 * 帳號狀態快取。
 *
 * 只驗證 JWT 簽章時，帳號被停用後對方手上的 token 仍可使用到自然過期（7 天）。
 * 每次請求都查資料庫則會讓所有 API 多一次往返，故以短期快取折衷：
 * 停用最遲於 30 秒後生效。
 */
const STATUS_TTL_MS = 30_000
const statusCache = new Map<number, { at: number; active: boolean; role: string }>()

export function invalidateUserStatus(userId: number) {
  statusCache.delete(userId)
}

async function isUsable(userId: number): Promise<{ active: boolean; role: string } | null> {
  const hit = statusCache.get(userId)
  if (hit && Date.now() - hit.at < STATUS_TTL_MS) {
    return { active: hit.active, role: hit.role }
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true, role: true },
  })
  if (!user) return null
  statusCache.set(userId, { at: Date.now(), active: user.isActive, role: user.role })
  return { active: user.isActive, role: user.role }
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '請先登入' } })
    return
  }

  let payload: { id: number; role: string; email: string }
  try {
    payload = jwt.verify(auth.slice(7), SECRET) as { id: number; role: string; email: string }
  } catch {
    res.status(401).json({ success: false, error: { code: 'TOKEN_INVALID', message: 'Token 無效或已過期' } })
    return
  }

  const status = await isUsable(payload.id)
  if (!status) {
    res.status(401).json({ success: false, error: { code: 'USER_NOT_FOUND', message: '帳號不存在' } })
    return
  }
  if (!status.active) {
    res.status(403).json({ success: false, error: { code: 'ACCOUNT_DISABLED', message: '帳號已停用' } })
    return
  }

  // 角色以資料庫為準，管理員調整角色後不需等待 token 過期
  req.user = { ...payload, role: status.role }
  next()
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '權限不足' } })
      return
    }
    next()
  }
}

export function signToken(payload: { id: number; role: string; email: string }) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' })
}
