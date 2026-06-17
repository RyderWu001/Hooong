import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth'

const router = Router()

const formulaInclude = {
  ingredients: { include: { ingredient: true } },
}

function formatFormula(f: any) {
  return {
    ...f,
    ingredients: f.ingredients.map((fi: any) => ({
      ingredientId: fi.ingredientId,
      ingredientName: fi.ingredient.name,
      ratio: fi.ratio,
      unit: fi.unit,
    })),
  }
}

// GET /formulas
router.get('/', requireAuth, async (req, res) => {
  const page = Number(req.query.page ?? 1)
  const limit = Number(req.query.limit ?? 20)
  const status = req.query.status as string | undefined
  const where = status ? { status } : {}
  const [data, total] = await Promise.all([
    prisma.formula.findMany({ where, skip: (page - 1) * limit, take: limit, include: formulaInclude, orderBy: { createdAt: 'desc' } }),
    prisma.formula.count({ where }),
  ])
  res.json({ success: true, data: data.map(formatFormula), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
})

// GET /formulas/:id
router.get('/:id', requireAuth, async (req, res) => {
  const f = await prisma.formula.findUnique({ where: { id: Number(req.params.id) }, include: formulaInclude })
  if (!f) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到配方' } }); return }
  res.json({ success: true, data: formatFormula(f) })
})

// POST /formulas
router.post('/', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req: AuthRequest, res) => {
  const { code, name, productType, description, ingredients } = req.body
  const f = await prisma.formula.create({
    data: {
      code, name, productType, description: description ?? '',
      ingredients: {
        create: (ingredients ?? []).map((i: any) => ({
          ingredientId: i.ingredientId, ratio: i.ratio, unit: i.unit,
        })),
      },
      versions: { create: [{ version: 1, changeNote: '初始版本', userId: req.user!.id }] },
    },
    include: formulaInclude,
  })
  res.status(201).json({ success: true, data: formatFormula(f) })
})

// PUT /formulas/:id
router.put('/:id', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id)
  const { name, productType, description, status, ingredients, changeNote } = req.body
  const existing = await prisma.formula.findUnique({ where: { id } })
  if (!existing) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到配方' } }); return }

  const newVersion = existing.currentVersion + 1
  await prisma.formulaIngredient.deleteMany({ where: { formulaId: id } })

  const f = await prisma.formula.update({
    where: { id },
    data: {
      name, productType, description, status,
      currentVersion: newVersion,
      ingredients: { create: (ingredients ?? []).map((i: any) => ({ ingredientId: i.ingredientId, ratio: i.ratio, unit: i.unit })) },
      versions: { create: [{ version: newVersion, changeNote: changeNote ?? '', userId: req.user!.id }] },
    },
    include: formulaInclude,
  })
  res.json({ success: true, data: formatFormula(f) })
})

// DELETE /formulas/:id  (soft delete)
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  await prisma.formula.update({ where: { id: Number(req.params.id) }, data: { status: 'DELETED' } })
  res.json({ success: true, message: '已刪除' })
})

// GET /formulas/:id/versions
router.get('/:id/versions', requireAuth, async (req, res) => {
  const versions = await prisma.formulaVersion.findMany({
    where: { formulaId: Number(req.params.id) },
    include: { createdBy: { select: { username: true } } },
    orderBy: { version: 'desc' },
  })
  res.json({ success: true, data: versions.map((v) => ({ ...v, createdBy: v.createdBy.username })) })
})

// GET /formulas/:id/versions/:version
router.get('/:id/versions/:version', requireAuth, async (req, res) => {
  const v = await prisma.formulaVersion.findFirst({
    where: { formulaId: Number(req.params.id), version: Number(req.params.version) },
    include: { createdBy: { select: { username: true } } },
  })
  if (!v) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到版本' } }); return }
  res.json({ success: true, data: { ...v, createdBy: v.createdBy.username } })
})

// GET /formulas/:id/ingredients
router.get('/:id/ingredients', requireAuth, async (req, res) => {
  const items = await prisma.formulaIngredient.findMany({
    where: { formulaId: Number(req.params.id) },
    include: { ingredient: true },
  })
  res.json({ success: true, data: items.map((i) => ({ ingredientId: i.ingredientId, ingredientName: i.ingredient.name, ratio: i.ratio, unit: i.unit })) })
})

export default router
