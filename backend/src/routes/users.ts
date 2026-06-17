import { Router } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../db/client'
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth'

const router = Router()

// GET /users
router.get('/', requireAuth, async (req, res) => {
  const page = Number(req.query.page ?? 1)
  const limit = Number(req.query.limit ?? 20)
  const [data, total] = await Promise.all([
    prisma.user.findMany({
      skip: (page - 1) * limit, take: limit,
      select: { id: true, username: true, email: true, role: true, isActive: true },
    }),
    prisma.user.count(),
  ])
  res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
})

// GET /users/:id
router.get('/:id', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(req.params.id) },
    select: { id: true, username: true, email: true, role: true, isActive: true },
  })
  if (!user) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到使用者' } }); return }
  res.json({ success: true, data: user })
})

// PUT /users/:id
router.put('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { username, role, isActive } = req.body
  const user = await prisma.user.update({
    where: { id: Number(req.params.id) },
    data: { username, role, isActive },
    select: { id: true, username: true, email: true, role: true, isActive: true },
  })
  res.json({ success: true, data: user })
})

// PATCH /users/:id
router.patch('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { username, role, isActive } = req.body
  const user = await prisma.user.update({
    where: { id: Number(req.params.id) },
    data: { username, role, isActive },
    select: { id: true, username: true, email: true, role: true, isActive: true },
  })
  res.json({ success: true, data: user })
})

// PUT /users/:id/password
router.put('/:id/password', requireAuth, async (req: AuthRequest, res) => {
  const targetId = Number(req.params.id)
  if (req.user!.role !== 'ADMIN' && req.user!.id !== targetId) {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '無權限修改他人密碼' } })
    return
  }
  const { password } = req.body
  await prisma.user.update({ where: { id: targetId }, data: { password: bcrypt.hashSync(password, 10) } })
  res.json({ success: true, message: '密碼已更新' })
})

export default router
