import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth, requireRole } from '../middleware/auth'

const router = Router()

// GET /dropdowns — 取得所有類別與選項
router.get('/', requireAuth, async (_req, res) => {
  const categories = await prisma.dropdownCategory.findMany({
    include: {
      options: {
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { id: 'asc' },
  })
  res.json({ success: true, data: categories })
})

// GET /dropdowns/:key — 取得特定類別的啟用選項
router.get('/:key', requireAuth, async (req, res) => {
  const category = await prisma.dropdownCategory.findUnique({
    where: { key: req.params.key },
    include: {
      options: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  })
  if (!category) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此類別' } })
    return
  }
  res.json({ success: true, data: category.options })
})

// POST /dropdowns/:key/options — 新增選項（ADMIN）
router.post('/:key/options', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { value, label, sortOrder } = req.body
  const category = await prisma.dropdownCategory.findUnique({ where: { key: req.params.key } })
  if (!category) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此類別' } })
    return
  }
  // sortOrder 預設為目前最大值 + 1
  const maxOrder = await prisma.dropdownOption.aggregate({
    where: { categoryId: category.id },
    _max: { sortOrder: true },
  })
  const nextOrder = sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1

  const option = await prisma.dropdownOption.create({
    data: { categoryId: category.id, value, label, sortOrder: nextOrder },
  })
  res.status(201).json({ success: true, data: option })
})

// PUT /dropdowns/options/:id — 更新選項（ADMIN）
router.put('/options/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { value, label, isActive } = req.body
  const option = await prisma.dropdownOption.update({
    where: { id: Number(req.params.id) },
    data: { value, label, isActive },
  })
  res.json({ success: true, data: option })
})

// DELETE /dropdowns/options/:id — 刪除選項（ADMIN）
router.delete('/options/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  await prisma.dropdownOption.delete({ where: { id: Number(req.params.id) } })
  res.json({ success: true, message: '已刪除' })
})

// PUT /dropdowns/:key/options/reorder — 批量更新排序（ADMIN）
router.put('/:key/options/reorder', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const orders: { id: number; sortOrder: number }[] = req.body.orders
  await Promise.all(
    orders.map((o) =>
      prisma.dropdownOption.update({ where: { id: o.id }, data: { sortOrder: o.sortOrder } })
    )
  )
  res.json({ success: true, message: '排序已更新' })
})

export default router
