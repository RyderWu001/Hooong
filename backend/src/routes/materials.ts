import { requirePermission } from '../middleware/permission'
import { Router, NextFunction, Request, Response } from 'express'
import prisma from '../db/client'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { validateNumericParams } from '../lib/query'

const router = Router()
validateNumericParams(router)

const inventoryInclude = {
  ingredient: { select: { name: true, unit: true } },
}

const validStock = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
const badStock = { success: false, error: { code: 'INVALID_STOCK', message: '庫存數量須為有限的非負數；入庫與出庫數量須大於零' } }

function formatInv(i: any) {
  return {
    ...i,
    ingredientName: i.ingredient.name,
    unit: i.ingredient.unit,
    ingredient: undefined,
  }
}

// ── Inventory ─────────────────────────────────────────────────
router.get('/inventory', requireAuth, requirePermission('materials', 'view'), async (req, res) => {
  const { ingredientId } = req.query
  const where = ingredientId ? { ingredientId: Number(ingredientId) } : {}
  const data = await prisma.materialInventory.findMany({ where, include: inventoryInclude, orderBy: { id: 'asc' } })
  res.json({ success: true, data: data.map(formatInv) })
})

router.post('/inventory', requireAuth, requirePermission('materials', 'create'), async (req, res) => {
  const { ingredientId, currentStock, safetyStock, supplier, expiryDate } = req.body
  if (!Number.isInteger(ingredientId) || ingredientId < 1 || !validStock(currentStock === undefined ? 0 : currentStock) || !validStock(safetyStock === undefined ? 0 : safetyStock)) {
    res.status(400).json(badStock); return
  }
  const item = await prisma.materialInventory.create({
    data: { ingredientId, currentStock, safetyStock, supplier, expiryDate: expiryDate ? new Date(expiryDate) : undefined },
    include: inventoryInclude,
  })
  res.status(201).json({ success: true, data: formatInv(item) })
})

router.put('/inventory/:id', requireAuth, requirePermission('materials', 'edit'), async (req, res) => {
  const { safetyStock, supplier, expiryDate } = req.body
  if (safetyStock !== undefined && !validStock(safetyStock)) { res.status(400).json(badStock); return }
  const item = await prisma.materialInventory.update({
    where: { id: Number(req.params.id) },
    data: { safetyStock, supplier, expiryDate: expiryDate ? new Date(expiryDate) : undefined },
    include: inventoryInclude,
  })
  res.json({ success: true, data: formatInv(item) })
})

router.delete('/inventory/:id', requireAuth, requirePermission('materials', 'delete'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.materialInventory.delete({ where: { id: Number(req.params.id) } })
    res.json({ success: true, message: '已刪除' })
  } catch (err) {
    next(err)
  }
})

// 調整庫存
router.post('/inventory/:id/adjust', requireAuth, requirePermission('materials', 'edit'), async (req: AuthRequest, res) => {
  const { transactionType, quantity, note } = req.body
  if (!['IN', 'OUT', 'ADJUST'].includes(transactionType) || !validStock(quantity) || (transactionType !== 'ADJUST' && quantity === 0)) {
    res.status(400).json(badStock); return
  }
  const outcome = await prisma.$transaction(async tx => {
    const inv = await tx.materialInventory.findUnique({ where: { id: Number(req.params.id) } })
    if (!inv) return { status: 404, code: 'NOT_FOUND', message: '找不到庫存紀錄' }
    if (transactionType === 'OUT' && quantity > inv.currentStock) return { status: 409, code: 'INSUFFICIENT_STOCK', message: '出庫數量超過目前庫存' }
    const newStock = transactionType === 'IN' ? inv.currentStock + quantity : transactionType === 'OUT' ? inv.currentStock - quantity : quantity
    if (!validStock(newStock)) return { status: 400, code: 'INVALID_STOCK', message: '調整後庫存超出有效數值範圍' }
    // Compare-and-set prevents a concurrent adjustment from silently overwriting stock.
    const changed = await tx.materialInventory.updateMany({ where: { id: inv.id, currentStock: inv.currentStock }, data: { currentStock: newStock } })
    if (changed.count !== 1) return { status: 409, code: 'STOCK_CHANGED', message: '庫存已被其他操作更新，請重新載入後再試' }
    await tx.materialTransaction.create({ data: { inventoryId: inv.id, transactionType, quantity, operatorId: req.user!.id, note: note ?? '' } })
    return { status: 200, newStock }
  })
  if (outcome.status !== 200) {
    res.status(outcome.status).json({ success: false, error: { code: outcome.code, message: outcome.message } }); return
  }
  res.json({ success: true, message: '庫存已調整', data: { newStock: outcome.newStock } })
})

// ── Transactions ──────────────────────────────────────────────
router.get('/transactions', requireAuth, requirePermission('materials', 'view'), async (req, res) => {
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
router.get('/traceability/:ingredientId', requireAuth, requirePermission('traceability', 'view'), async (req, res) => {
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
        experimentId: e.id, experimentCode: e.code, formulaName: e.formula?.name ?? '—', experimentDate: e.experimentDate,
      })),
    },
  })
})

export default router
