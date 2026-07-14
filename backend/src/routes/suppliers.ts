import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth'

// ── Suppliers (/api/v1/suppliers) ─────────────────────────────
export const suppliersRouter = Router()

suppliersRouter.get('/', requireAuth, async (req, res) => {
  const { name, status } = req.query
  const where: any = {}
  if (name) where.name = { contains: name as string }
  if (status) where.status = status
  const data = await prisma.supplier.findMany({ where, orderBy: { createdAt: 'desc' } })
  res.json({ success: true, data, pagination: { page: 1, limit: data.length, total: data.length, totalPages: 1 } })
})

suppliersRouter.get('/:id', requireAuth, async (req, res) => {
  const s = await prisma.supplier.findUnique({ where: { id: Number(req.params.id) } })
  if (!s) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到供應商' } }); return }
  res.json({ success: true, data: s })
})

suppliersRouter.post('/', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const { code, name, contactPerson, phone, email, address, supplyItems } = req.body
  const s = await prisma.supplier.create({ data: { code, name, contactPerson: contactPerson ?? '', phone: phone ?? '', email: email ?? '', address: address ?? '', supplyItems: supplyItems ?? '' } })
  res.status(201).json({ success: true, data: s })
})

suppliersRouter.put('/:id', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const { name, contactPerson, phone, email, address, supplyItems, status } = req.body
  const s = await prisma.supplier.update({ where: { id: Number(req.params.id) }, data: { name, contactPerson, phone, email, address, supplyItems, status } })
  res.json({ success: true, data: s })
})

suppliersRouter.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  await prisma.supplier.delete({ where: { id: Number(req.params.id) } })
  res.json({ success: true, message: '已刪除' })
})

suppliersRouter.get('/:id/evaluations', requireAuth, async (req, res) => {
  const evals = await prisma.supplierEvaluation.findMany({
    where: { supplierId: Number(req.params.id) },
    include: { evaluator: { select: { username: true } }, supplier: { select: { name: true } } },
    orderBy: { evaluationDate: 'desc' },
  })
  res.json({ success: true, data: evals.map((e) => ({ ...e, evaluator: e.evaluator.username, supplierName: e.supplier.name, supplier: undefined })) })
})

// ── Evaluations (/api/v1/evaluations) ─────────────────────────
export const evaluationsRouter = Router()

evaluationsRouter.get('/', requireAuth, async (req, res) => {
  const { supplierId } = req.query
  const where = supplierId ? { supplierId: Number(supplierId) } : {}
  const evals = await prisma.supplierEvaluation.findMany({
    where,
    include: { evaluator: { select: { username: true } }, supplier: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ success: true, data: evals.map((e) => ({ ...e, evaluator: e.evaluator.username, supplierName: e.supplier.name, supplier: undefined })) })
})

evaluationsRouter.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { supplierId, evaluationDate, qualityScore, deliveryScore, priceScore, serviceScore, notes } = req.body
  const totalScore = (qualityScore + deliveryScore + priceScore + serviceScore) / 4
  const level = totalScore >= 90 ? 'A' : totalScore >= 75 ? 'B' : totalScore >= 60 ? 'C' : 'D'
  const e = await prisma.supplierEvaluation.create({
    data: { supplierId, evaluationDate: new Date(evaluationDate), qualityScore, deliveryScore, priceScore, serviceScore, totalScore, level, notes: notes ?? '', evaluatorId: req.user!.id },
    include: { evaluator: { select: { username: true } }, supplier: { select: { name: true } } },
  })
  res.status(201).json({ success: true, data: { ...e, evaluator: e.evaluator.username, supplierName: e.supplier.name, supplier: undefined } })
})

// ── Purchases (/api/v1/purchases) ─────────────────────────────
export const purchasesRouter = Router()

purchasesRouter.get('/', requireAuth, async (req, res) => {
  const { supplierId, status, ingredientName, dateFrom, dateTo } = req.query
  const where: any = {}
  if (supplierId) where.supplierId = Number(supplierId)
  if (status) where.status = status
  if (ingredientName) where.ingredient = { name: { contains: ingredientName as string } }
  if (dateFrom || dateTo) {
    where.purchaseDate = {}
    if (dateFrom) where.purchaseDate.gte = new Date(dateFrom as string)
    if (dateTo) where.purchaseDate.lte = new Date(`${dateTo}T23:59:59Z`)
  }
  const data = await prisma.purchaseRecord.findMany({
    where,
    include: { supplier: { select: { name: true } }, ingredient: { select: { name: true, unit: true } } },
    orderBy: { purchaseDate: 'desc' },
  })
  res.json({
    success: true,
    data: data.map((p) => ({ ...p, supplierName: p.supplier.name, ingredientName: p.ingredient.name, unit: p.ingredient.unit, supplier: undefined, ingredient: undefined })),
  })
})

purchasesRouter.post('/', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const { supplierId, ingredientId, quantity, unitPrice, purchaseDate, notes } = req.body
  const totalAmount = quantity * unitPrice
  const p = await prisma.purchaseRecord.create({
    data: { supplierId, ingredientId, quantity, unitPrice, totalAmount, purchaseDate: new Date(purchaseDate), notes: notes ?? '' },
    include: { supplier: { select: { name: true } }, ingredient: { select: { name: true, unit: true } } },
  })
  res.status(201).json({ success: true, data: { ...p, supplierName: p.supplier.name, ingredientName: p.ingredient.name, unit: p.ingredient.unit, supplier: undefined, ingredient: undefined } })
})

purchasesRouter.put('/:id', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const { status, deliveryDate, notes } = req.body
  const p = await prisma.purchaseRecord.update({
    where: { id: Number(req.params.id) },
    data: { status, deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined, notes },
    include: { supplier: { select: { name: true } }, ingredient: { select: { name: true, unit: true } } },
  })
  res.json({ success: true, data: { ...p, supplierName: p.supplier.name, ingredientName: p.ingredient.name, unit: p.ingredient.unit, supplier: undefined, ingredient: undefined } })
})
