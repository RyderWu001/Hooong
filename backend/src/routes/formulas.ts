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
      unit: fi.unit,
      ratio: fi.ratio,
      unitPrice: fi.ingredient.unitPrice ?? null,
    })),
  }
}

function buildSnapshot(ingredients: any[]) {
  return ingredients.map((fi: any) => ({
    ingredientId: fi.ingredientId,
    ingredientName: fi.ingredient?.name ?? fi.ingredientName ?? '',
    ratio: fi.ratio,
    unit: fi.unit,
    unitPrice: fi.ingredient?.unitPrice ?? fi.unitPrice ?? null,
  }))
}

// GET /formulas
router.get('/', requireAuth, async (req, res) => {
  const page = Number(req.query.page ?? 1)
  const limit = Number(req.query.limit ?? 20)
  const status = req.query.status as string | undefined
  const category = req.query.category as string | undefined
  const formulaType = req.query.formulaType as string | undefined
  const name = req.query.name as string | undefined

  const where: any = {}
  if (status) where.status = status
  if (category) where.category = category
  if (formulaType) where.formulaType = formulaType
  if (name) where.name = { contains: name, mode: 'insensitive' }

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
  const { code, name, category, formulaType, productType, description, ingredients } = req.body
  const f = await prisma.formula.create({
    data: {
      code, name, category, formulaType, productType, description: description ?? '',
      ingredients: {
        create: (ingredients ?? []).map((i: any) => ({
          ingredientId: i.ingredientId, ratio: i.ratio, unit: i.unit,
        })),
      },
      versions: { create: [{ version: 1, changeNote: '初始版本', userId: req.user!.id, ingredientsSnapshot: ingredients ?? [] }] },
    },
    include: formulaInclude,
  })
  res.status(201).json({ success: true, data: formatFormula(f) })
})

// PUT /formulas/:id
router.put('/:id', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id)
  const { name, category, formulaType, productType, description, status, ingredients, changeNote } = req.body
  const existing = await prisma.formula.findUnique({ where: { id } })
  if (!existing) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到配方' } }); return }

  const newVersion = existing.currentVersion + 1
  await prisma.formulaIngredient.deleteMany({ where: { formulaId: id } })

  const f = await prisma.formula.update({
    where: { id },
    data: {
      name, category, formulaType, productType, description, status,
      currentVersion: newVersion,
      ingredients: { create: (ingredients ?? []).map((i: any) => ({ ingredientId: i.ingredientId, ratio: i.ratio, unit: i.unit })) },
      versions: {
        create: [{
          version: newVersion,
          changeNote: changeNote ?? '',
          userId: req.user!.id,
          ingredientsSnapshot: (ingredients ?? []).map((i: any) => ({
            ingredientId: i.ingredientId,
            ingredientName: i.ingredientName ?? '',
            ratio: i.ratio,
            unit: i.unit,
            unitPrice: i.unitPrice ?? null,
          })),
        }],
      },
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

// POST /formulas/:id/submit — 提交審核 (DRAFT/ACTIVE → REVIEWING)
router.post('/:id/submit', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id)
  const f = await prisma.formula.findUnique({ where: { id } })
  if (!f) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到配方' } }); return }
  if (!['DRAFT', 'ACTIVE', 'PUBLISHED'].includes(f.status)) {
    res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: '僅草稿/已發布狀態可提交審核' } }); return
  }
  const updated = await prisma.formula.update({ where: { id }, data: { status: 'REVIEWING' }, include: formulaInclude })
  res.json({ success: true, data: formatFormula(updated) })
})

// POST /formulas/:id/approve — 核准 (REVIEWING → PUBLISHED)
router.post('/:id/approve', requireAuth, requireRole('ADMIN', 'MANAGER'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id)
  const f = await prisma.formula.findUnique({ where: { id } })
  if (!f) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到配方' } }); return }
  if (f.status !== 'REVIEWING') {
    res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: '僅審核中狀態可核准' } }); return
  }
  const updated = await prisma.formula.update({ where: { id }, data: { status: 'PUBLISHED' }, include: formulaInclude })
  res.json({ success: true, data: formatFormula(updated) })
})

// POST /formulas/:id/reject — 退回 (REVIEWING → DRAFT)
router.post('/:id/reject', requireAuth, requireRole('ADMIN', 'MANAGER'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id)
  const f = await prisma.formula.findUnique({ where: { id } })
  if (!f) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到配方' } }); return }
  if (f.status !== 'REVIEWING') {
    res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: '僅審核中狀態可退回' } }); return
  }
  const updated = await prisma.formula.update({ where: { id }, data: { status: 'DRAFT' }, include: formulaInclude })
  res.json({ success: true, data: formatFormula(updated) })
})

// POST /formulas/:id/archive — 封存 (PUBLISHED/ACTIVE → ARCHIVED)
router.post('/:id/archive', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id)
  const f = await prisma.formula.findUnique({ where: { id } })
  if (!f) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到配方' } }); return }
  if (!['PUBLISHED', 'ACTIVE'].includes(f.status)) {
    res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: '僅已發布/啟用狀態可封存' } }); return
  }
  const updated = await prisma.formula.update({ where: { id }, data: { status: 'ARCHIVED' }, include: formulaInclude })
  res.json({ success: true, data: formatFormula(updated) })
})

// POST /formulas/:id/copy — 複製配方
router.post('/:id/copy', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id)
  const { newCode, newName } = req.body

  const source = await prisma.formula.findUnique({ where: { id }, include: formulaInclude })
  if (!source) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到配方' } }); return }

  const snapshot = buildSnapshot(source.ingredients)
  const copied = await prisma.formula.create({
    data: {
      code: newCode,
      name: newName ?? `${source.name}（複製）`,
      category: source.category,
      formulaType: source.formulaType,
      productType: source.productType,
      description: source.description,
      status: 'ACTIVE',
      ingredients: {
        create: source.ingredients.map((fi) => ({
          ingredientId: fi.ingredientId, ratio: fi.ratio, unit: fi.unit,
        })),
      },
      versions: {
        create: [{
          version: 1,
          changeNote: `複製自 ${source.code}`,
          userId: req.user!.id,
          ingredientsSnapshot: snapshot,
        }],
      },
    },
    include: formulaInclude,
  })
  res.status(201).json({ success: true, data: formatFormula(copied) })
})

// POST /formulas/:id/promote — 轉正式配方
router.post('/:id/promote', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id)
  const existing = await prisma.formula.findUnique({ where: { id }, include: formulaInclude })
  if (!existing) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到配方' } }); return }

  if (existing.formulaType === '正式產品') {
    res.status(400).json({ success: false, error: { code: 'ALREADY_FORMAL', message: '此配方已是正式產品' } })
    return
  }

  const newVersion = existing.currentVersion + 1
  const snapshot = buildSnapshot(existing.ingredients)

  const f = await prisma.formula.update({
    where: { id },
    data: {
      formulaType: '正式產品',
      status: 'ACTIVE',
      currentVersion: newVersion,
      versions: {
        create: [{
          version: newVersion,
          changeNote: '轉為正式產品配方',
          userId: req.user!.id,
          ingredientsSnapshot: snapshot,
        }],
      },
    },
    include: formulaInclude,
  })
  res.json({ success: true, data: formatFormula(f) })
})

// POST /formulas/:id/rollback — 回滾到指定版本
router.post('/:id/rollback', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id)
  const { version, changeNote } = req.body

  const targetVersion = await prisma.formulaVersion.findFirst({
    where: { formulaId: id, version: Number(version) },
  })
  if (!targetVersion) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此版本' } }); return }
  if (!targetVersion.ingredientsSnapshot) {
    res.status(400).json({ success: false, error: { code: 'NO_SNAPSHOT', message: '此版本無成分快照，無法回滾' } })
    return
  }

  const existing = await prisma.formula.findUnique({ where: { id } })
  if (!existing) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到配方' } }); return }

  const snapshot = targetVersion.ingredientsSnapshot as any[]
  const newVersion = existing.currentVersion + 1

  await prisma.formulaIngredient.deleteMany({ where: { formulaId: id } })
  const f = await prisma.formula.update({
    where: { id },
    data: {
      currentVersion: newVersion,
      ingredients: {
        create: snapshot.map((s: any) => ({
          ingredientId: s.ingredientId, ratio: s.ratio, unit: s.unit,
        })),
      },
      versions: {
        create: [{
          version: newVersion,
          changeNote: changeNote ?? `回滾至 v${version}`,
          userId: req.user!.id,
          ingredientsSnapshot: snapshot,
        }],
      },
    },
    include: formulaInclude,
  })
  res.json({ success: true, data: formatFormula(f) })
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
  res.json({ success: true, data: items.map((i) => ({
    ingredientId: i.ingredientId,
    ingredientName: i.ingredient.name,
    ratio: i.ratio,
    unit: i.unit,
    unitPrice: i.ingredient.unitPrice ?? null,
  })) })
})

export default router
