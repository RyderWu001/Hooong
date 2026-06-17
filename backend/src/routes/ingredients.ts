import { Router, NextFunction, Request, Response } from 'express'
import prisma from '../db/client'
import { requireAuth, requireRole } from '../middleware/auth'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const page = Number(req.query.page ?? 1)
  const limit = Number(req.query.limit ?? 50)
  const [data, total] = await Promise.all([
    prisma.ingredient.findMany({ skip: (page - 1) * limit, take: limit }),
    prisma.ingredient.count(),
  ])
  res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
})

router.get('/:id', requireAuth, async (req, res) => {
  const item = await prisma.ingredient.findUnique({ where: { id: Number(req.params.id) } })
  if (!item) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到原料' } }); return }
  res.json({ success: true, data: item })
})

router.post('/', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const { name, unit, description } = req.body
  const item = await prisma.ingredient.create({ data: { name, unit, description: description ?? '' } })
  res.status(201).json({ success: true, data: item })
})

router.put('/:id', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const { name, unit, description } = req.body
  const item = await prisma.ingredient.update({ where: { id: Number(req.params.id) }, data: { name, unit, description } })
  res.json({ success: true, data: item })
})

router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.ingredient.delete({ where: { id: Number(req.params.id) } })
    res.json({ success: true, message: '已刪除' })
  } catch (err) {
    next(err)
  }
})

export default router
