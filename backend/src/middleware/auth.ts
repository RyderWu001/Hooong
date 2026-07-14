import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET ?? 'hooong-lab-secret-2024'

export interface AuthRequest extends Request {
  user?: { id: number; role: string; email: string }
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '請先登入' } })
    return
  }
  try {
    const payload = jwt.verify(auth.slice(7), SECRET) as { id: number; role: string; email: string }
    req.user = payload
    next()
  } catch {
    res.status(401).json({ success: false, error: { code: 'TOKEN_INVALID', message: 'Token 無效或已過期' } })
  }
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
