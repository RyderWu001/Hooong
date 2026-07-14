import { Router, NextFunction, Request, Response } from 'express'
import prisma from '../db/client'
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth'

const router = Router()

const inventoryInclude = {
  ingredient: { select: { name: true, unit: true } },
}

function formatInv(i: any) {
  return {
    ...i,
    ingredientName: i.ingredient.name,
    unit: i.ingredient.unit,
    ingredient: undefined,
  }
}

// ── Inventory ─────────────────────────────────────────────────
router.get('/inventory', requireAuth, async (req, res) => {
  const { ingredientId } = req.query
  const where = ingredientId ? { ingredientId: Number(ingredientId) } : {}
  const data = await prisma.materialInventory.findMany({ where, include: inventoryInclude, orderBy: { id: 'asc' } })
  res.json({ success: true, data: data.map(formatInv) })
})

router.post('/inventory', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const { ingredientId, currentStock, safetyStock, supplier, expiryDate } = req.body
  const item = await prisma.materialInventory.create({
    data: { ingredientId, currentStock, safetyStock, supplier, expiryDate: expiryDate ? new Date(expiryDate) : undefined },
    include: inventoryInclude,
  })
  res.status(201).json({ success: true, data: formatInv(item) })
})

router.put('/inventory/:id', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const { safetyStock, supplier, expiryDate } = req.body
  const item = await prisma.materialInventory.update({
    where: { id: Number(req.params.id) },
    data: { safetyStock, supplier, expiryDate: expiryDate ? new Date(expiryDate) : undefined },
    include: inventoryInclude,
  })
  res.json({ success: true, data: formatInv(item) })
})

router.delete('/inventory/:id', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.materialInventory.delete({ where: { id: Number(req.params.id) } })
    res.json({ success: true, message: '已刪除' })
  } catch (err) {
    next(err)
  }
})

// 調整庫存
router.post('/inventory/:id/adjust', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req: AuthRequest, res) => {
  const { transactionType, quantity, note } = req.body
  const inv = await prisma.materialInventory.findUnique({ where: { id: Number(req.params.id) }, include: { ingredient: true } })
  if (!inv) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到庫存紀錄' } }); return }

  let newStock = inv.currentStock
  if (transactionType === 'IN') newStock += quantity
  else if (transactionType === 'OUT') newStock = Math.max(0, newStock - quantity)
  else if (transactionType === 'ADJUST') newStock = quantity

  await prisma.$transaction([
    prisma.materialInventory.update({ where: { id: inv.id }, data: { currentStock: newStock } }),
    prisma.materialTransaction.create({
      data: { inventoryId: inv.id, transactionType, quantity, operatorId: req.user!.id, note },
    }),
  ])
  res.json({ success: true, message: '庫存已調整', data: { newStock } })
})

// ── Transactions ──────────────────────────────────────────────
router.get('/transactions', requireAuth, async (req, res) => {
  const { ingredientId } = req.query
  const where = ingredientId
    ? { inventory: { ingredientId: Number(ingredientId) } }
    : {}
  const txs = await prisma.materialTransaction.findMany({
    where,
    include: {
      inventory: { include: { ingredient: { select: { name: true, unit: true } } } },
      operator: { select: { username: true } },
      relatedExperiment: { select: { code: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  const data = txs.map((t) => ({
    id: t.id,
    ingredientId: t.inventory.ingredientId,
    ingredientName: t.inventory.ingredient.name,
    transactionType: t.transactionType,
    quantity: t.quantity,
    unit: t.inventory.ingredient.unit,
    relatedExperimentId: t.relatedExperimentId,
    relatedExperimentCode: t.relatedExperiment?.code,
    operator: t.operator.username,
    note: t.note,
    createdAt: t.createdAt,
  }))
  res.json({ success: true, data })
})

// ── Traceability ──────────────────────────────────────────────
router.get('/traceability/:ingredientId', requireAuth, async (req, res) => {
  const ingredientId = Number(req.params.ingredientId)
  const ingredient = await prisma.ingredient.findUnique({ where: { id: ingredientId } })
  if (!ingredient) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到原料' } }); return }

  const [formulaUses, experimentUses] = await Promise.all([
    prisma.formulaIngredient.findMany({
      where: { ingredientId },
      include: { formula: { select: { id: true, code: true, name: true } } },
    }),
    prisma.experiment.findMany({
      where: { formula: { ingredients: { some: { ingredientId } } } },
      include: { formula: { select: { name: true } } },
      orderBy: { experimentDate: 'desc' },
    }),
  ])

  res.json({
    success: true,
    data: {
      ingredientId,
      ingredientName: ingredient.name,
      usedInFormulas: formulaUses.map((f) => ({
        formulaId: f.formula.id, formulaCode: f.formula.code, formulaName: f.formula.name, ratio: f.ratio, unit: f.unit,
      })),
      usedInExperiments: experimentUses.map((e) => ({
        experimentId: e.id, experimentCode: e.code, formulaName: e.formula.name, experimentDate: e.experimentDate,
      })),
    },
  })
})

export default router
