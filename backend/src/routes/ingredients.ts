import { Router } from 'express'
import multer from 'multer'
import prisma from '../db/client'
import { uploadToStorage } from '../db/storage'
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

const ING_INCLUDE = { createdBy: { select: { username: true } } } as const

function formatIng(i: any) {
  return { ...i, createdByName: i.createdBy?.username ?? null, createdBy: undefined }
}

// GET /ingredients
router.get('/', requireAuth, async (req, res) => {
  const page = Number(req.query.page ?? 1)
  const limit = Number(req.query.limit ?? 50)
  const name = req.query.name as string | undefined
  const category = req.query.category as string | undefined
  const status = req.query.status as string | undefined

  const where: any = {}
  if (name) where.name = { contains: name, mode: 'insensitive' }
  if (category) where.category = category
  if (status) where.status = status

  const [data, total] = await Promise.all([
    prisma.ingredient.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' }, include: ING_INCLUDE }),
    prisma.ingredient.count({ where }),
  ])
  res.json({ success: true, data: data.map(formatIng), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
})

// GET /ingredients/batches/expiring（MUST be before /:id）
router.get('/batches/expiring', requireAuth, async (req, res) => {
  const days = Number(req.query.days ?? 30)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + days)

  const batches = await prisma.ingredientBatch.findMany({
    where: { expiryDate: { not: null, lte: cutoff }, status: { not: '報廢' } },
    include: { ingredient: { select: { id: true, name: true, unit: true } } },
    orderBy: { expiryDate: 'asc' },
  })
  res.json({ success: true, data: batches.map((b) => ({
    ...b, ingredientName: b.ingredient.name, ingredientUnit: b.ingredient.unit, ingredient: undefined,
  })) })
})

// GET /ingredients/:id
router.get('/:id', requireAuth, async (req, res) => {
  const item = await prisma.ingredient.findUnique({ where: { id: Number(req.params.id) }, include: ING_INCLUDE })
  if (!item) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到原料' } }); return }
  res.json({ success: true, data: formatIng(item) })
})

// POST /ingredients
router.post('/', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req: AuthRequest, res) => {
  const {
    name, code, casNo, englishName, category, industry, status,
    solidContent, density, appearance, storageCondition, shelfLife,
    packageSpec, unit, unitPrice, description,
  } = req.body
  const item = await prisma.ingredient.create({
    data: {
      name, code: code ?? null, casNo: casNo ?? null, englishName: englishName ?? null,
      category: category ?? null, industry: industry ?? null,
      status: status ?? '使用中',
      solidContent: solidContent ?? null, density: density ?? null,
      appearance: appearance ?? null, storageCondition: storageCondition ?? null,
      shelfLife: shelfLife ?? null,
      packageSpec: packageSpec ?? null, unit,
      unitPrice: unitPrice != null ? Number(unitPrice) : null,
      description: description ?? '',
      createdById: req.user!.id,
    },
    include: ING_INCLUDE,
  })
  res.status(201).json({ success: true, data: formatIng(item) })
})

// PUT /ingredients/:id
router.put('/:id', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  const {
    name, code, casNo, englishName, category, industry, status,
    solidContent, density, appearance, storageCondition, shelfLife,
    packageSpec, unit, unitPrice, description,
  } = req.body
  const item = await prisma.ingredient.update({
    where: { id: Number(req.params.id) },
    data: {
      name, code: code ?? null, casNo: casNo ?? null, englishName: englishName ?? null,
      category: category ?? null, industry: industry ?? null, status,
      solidContent: solidContent ?? null, density: density ?? null,
      appearance: appearance ?? null, storageCondition: storageCondition ?? null,
      shelfLife: shelfLife ?? null,
      packageSpec: packageSpec ?? null, unit,
      unitPrice: unitPrice != null ? Number(unitPrice) : null,
      description,
    },
    include: ING_INCLUDE,
  })
  res.json({ success: true, data: formatIng(item) })
})

// DELETE /ingredients/:id
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  await prisma.ingredient.delete({ where: { id: Number(req.params.id) } })
  res.json({ success: true, message: '已刪除' })
})

// ── 文件管理 ─────────────────────────────────────────────────────────────────

router.get('/:id/documents', requireAuth, async (req, res) => {
  const docs = await prisma.ingredientDocument.findMany({
    where: { ingredientId: Number(req.params.id) },
    include: { uploadedBy: { select: { username: true } } },
    orderBy: { uploadedAt: 'desc' },
  })
  res.json({ success: true, data: docs.map((d) => ({ ...d, uploaderName: d.uploadedBy.username, uploadedBy: undefined })) })
})

router.post('/:id/documents', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), upload.single('file'), async (req: AuthRequest, res) => {
  const ingredientId = Number(req.params.id)
  const { fileType } = req.body
  const file = req.file

  if (!file) { res.status(400).json({ success: false, error: { code: 'NO_FILE', message: '請上傳檔案' } }); return }

  const ingredient = await prisma.ingredient.findUnique({ where: { id: ingredientId } })
  if (!ingredient) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到原料' } }); return }

  const fileUrl = await uploadToStorage(file.buffer, file.originalname, file.mimetype)
  const doc = await prisma.ingredientDocument.create({
    data: { ingredientId, fileUrl, fileName: file.originalname, fileType: fileType ?? 'OTHER', uploadedById: req.user!.id },
    include: { uploadedBy: { select: { username: true } } },
  })
  res.status(201).json({ success: true, data: { ...doc, uploaderName: doc.uploadedBy.username, uploadedBy: undefined } })
})

router.delete('/documents/:docId', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  await prisma.ingredientDocument.delete({ where: { id: Number(req.params.docId) } })
  res.json({ success: true, message: '已刪除' })
})

// ── 批號管理 ─────────────────────────────────────────────────────────────────

router.get('/:id/batches', requireAuth, async (req, res) => {
  const batches = await prisma.ingredientBatch.findMany({
    where: { ingredientId: Number(req.params.id) },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ success: true, data: batches })
})

router.post('/:id/batches', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), upload.fields([
  { name: 'qcPhotoAppearance', maxCount: 1 },
  { name: 'qcPhotoSolid', maxCount: 1 },
]), async (req: AuthRequest, res) => {
  const ingredientId = Number(req.params.id)
  const {
    batchNo, supplierBatch, mfgDate, expiryDate,
    arrivalDate, warehousingDate, usageDate, usageQuantity, remainingQty,
    openedDate, openedExpiry, quantity, unit, status, notes,
    acceptanceNo, orderDate, qcItems, qcNotes,
  } = req.body
  const files = req.files as Record<string, Express.Multer.File[]> | undefined
  let qcPhotoAppearanceUrl: string | null = null
  let qcPhotoSolidUrl: string | null = null
  if (files?.qcPhotoAppearance?.[0]) {
    const f = files.qcPhotoAppearance[0]
    qcPhotoAppearanceUrl = await uploadToStorage(f.buffer, f.originalname, f.mimetype)
  }
  if (files?.qcPhotoSolid?.[0]) {
    const f = files.qcPhotoSolid[0]
    qcPhotoSolidUrl = await uploadToStorage(f.buffer, f.originalname, f.mimetype)
  }
  const batch = await prisma.ingredientBatch.create({
    data: {
      ingredientId, batchNo,
      supplierBatch: supplierBatch ?? null,
      mfgDate: mfgDate ? new Date(mfgDate) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      arrivalDate: arrivalDate ? new Date(arrivalDate) : null,
      warehousingDate: warehousingDate ? new Date(warehousingDate) : null,
      usageDate: usageDate ? new Date(usageDate) : null,
      usageQuantity: usageQuantity != null ? Number(usageQuantity) : null,
      remainingQty: remainingQty != null ? Number(remainingQty) : null,
      openedDate: openedDate ? new Date(openedDate) : null,
      openedExpiry: openedExpiry != null ? Number(openedExpiry) : null,
      quantity: Number(quantity), unit,
      status: status ?? '正常', notes: notes ?? '',
      acceptanceNo: acceptanceNo ?? null,
      orderDate: orderDate ? new Date(orderDate) : null,
      qcItems: qcItems ? JSON.parse(qcItems) : null,
      qcNotes: qcNotes ?? null,
      qcPhotoAppearance: qcPhotoAppearanceUrl,
      qcPhotoSolid: qcPhotoSolidUrl,
    },
  })
  res.status(201).json({ success: true, data: batch })
})

router.put('/batches/:batchId', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), upload.fields([
  { name: 'qcPhotoAppearance', maxCount: 1 },
  { name: 'qcPhotoSolid', maxCount: 1 },
]), async (req: AuthRequest, res) => {
  const {
    batchNo, supplierBatch, mfgDate, expiryDate,
    arrivalDate, warehousingDate, usageDate, usageQuantity, remainingQty,
    openedDate, openedExpiry, quantity, unit, status, notes,
    acceptanceNo, orderDate, qcItems, qcNotes,
  } = req.body
  const files = req.files as Record<string, Express.Multer.File[]> | undefined
  const existing = await prisma.ingredientBatch.findUnique({ where: { id: Number(req.params.batchId) } })
  let qcPhotoAppearanceUrl = existing?.qcPhotoAppearance ?? null
  let qcPhotoSolidUrl = existing?.qcPhotoSolid ?? null
  if (files?.qcPhotoAppearance?.[0]) {
    const f = files.qcPhotoAppearance[0]
    qcPhotoAppearanceUrl = await uploadToStorage(f.buffer, f.originalname, f.mimetype)
  }
  if (files?.qcPhotoSolid?.[0]) {
    const f = files.qcPhotoSolid[0]
    qcPhotoSolidUrl = await uploadToStorage(f.buffer, f.originalname, f.mimetype)
  }
  const batch = await prisma.ingredientBatch.update({
    where: { id: Number(req.params.batchId) },
    data: {
      batchNo, supplierBatch: supplierBatch ?? null,
      mfgDate: mfgDate ? new Date(mfgDate) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      arrivalDate: arrivalDate ? new Date(arrivalDate) : null,
      warehousingDate: warehousingDate ? new Date(warehousingDate) : null,
      usageDate: usageDate ? new Date(usageDate) : null,
      usageQuantity: usageQuantity != null ? Number(usageQuantity) : null,
      remainingQty: remainingQty != null ? Number(remainingQty) : null,
      openedDate: openedDate ? new Date(openedDate) : null,
      openedExpiry: openedExpiry != null ? Number(openedExpiry) : null,
      quantity: Number(quantity), unit, status, notes,
      acceptanceNo: acceptanceNo ?? null,
      orderDate: orderDate ? new Date(orderDate) : null,
      qcItems: qcItems ? JSON.parse(qcItems) : null,
      qcNotes: qcNotes ?? null,
      qcPhotoAppearance: qcPhotoAppearanceUrl,
      qcPhotoSolid: qcPhotoSolidUrl,
    },
  })
  res.json({ success: true, data: batch })
})

router.delete('/batches/:batchId', requireAuth, requireRole('ADMIN', 'LAB_STAFF'), async (req, res) => {
  await prisma.ingredientBatch.delete({ where: { id: Number(req.params.batchId) } })
  res.json({ success: true, message: '已刪除' })
})

export default router
