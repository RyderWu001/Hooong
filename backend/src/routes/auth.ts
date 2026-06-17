import { Router } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../db/client'
import { requireAuth, requireRole, signToken, type AuthRequest } from '../middleware/auth'

const router = Router()

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: '請填寫帳號密碼' } })
    return
  }
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !bcrypt.compareSync(password, user.password)) {
    res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: '帳號或密碼錯誤' } })
    return
  }
  if (!user.isActive) {
    res.status(403).json({ success: false, error: { code: 'ACCOUNT_DISABLED', message: '帳號已停用' } })
    return
  }
  const token = signToken({ id: user.id, role: user.role, email: user.email })
  res.json({
    success: true,
    token,
    user: { id: user.id, username: user.username, email: user.email, role: user.role },
  })
})

// POST /auth/logout
router.post('/logout', (_, res) => {
  res.json({ success: true, message: '已登出' })
})

// GET /auth/me
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user) { res.status(404).json({ success: false }); return }
  res.json({ success: true, data: { id: user.id, username: user.username, email: user.email, role: user.role, isActive: user.isActive } })
})

// POST /auth/register — 公開，自行註冊（固定 LAB_STAFF）
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body
  if (!username || !email || !password) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: '缺少必填欄位' } })
    return
  }
  if (password.length < 8) {
    res.status(400).json({ success: false, error: { code: 'PASSWORD_TOO_SHORT', message: '密碼至少 8 個字元' } })
    return
  }
  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) {
    res.status(409).json({ success: false, error: { code: 'EMAIL_EXISTS', message: '此 Email 已被使用' } })
    return
  }
  const user = await prisma.user.create({
    data: { username, email, password: bcrypt.hashSync(password, 10), role: 'LAB_STAFF' },
  })
  const token = signToken({ id: user.id, role: user.role, email: user.email })
  res.status(201).json({
    success: true,
    token,
    user: { id: user.id, username: user.username, email: user.email, role: user.role },
  })
})

// POST /auth/admin/register — 需要 ADMIN，可指定角色
router.post('/admin/register', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { username, email, password, role } = req.body
  if (!username || !email || !password) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: '缺少必填欄位' } })
    return
  }
  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) {
    res.status(409).json({ success: false, error: { code: 'EMAIL_EXISTS', message: '此 Email 已被使用' } })
    return
  }
  const user = await prisma.user.create({
    data: { username, email, password: bcrypt.hashSync(password, 10), role: role ?? 'LAB_STAFF' },
  })
  res.status(201).json({ success: true, data: { id: user.id, username: user.username, email: user.email, role: user.role } })
})

export default router
