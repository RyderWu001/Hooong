import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth, requireRole } from '../middleware/auth'

const router = Router()

const MODULES = [
  'formulas', 'materials', 'suppliers', 'risks',
  'experiments', 'results', 'samples', 'reports',
  'traceability', 'knowledge',
]

const DEFAULT_PERMISSIONS = [
  // LAB_STAFF
  { role: 'LAB_STAFF', module: 'formulas',      canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
  { role: 'LAB_STAFF', module: 'materials',     canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
  { role: 'LAB_STAFF', module: 'suppliers',     canView: true,  canCreate: false, canEdit: false, canDelete: false },
  { role: 'LAB_STAFF', module: 'risks',         canView: true,  canCreate: false, canEdit: false, canDelete: false },
  { role: 'LAB_STAFF', module: 'experiments',   canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
  { role: 'LAB_STAFF', module: 'results',       canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
  { role: 'LAB_STAFF', module: 'samples',       canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
  { role: 'LAB_STAFF', module: 'reports',       canView: true,  canCreate: false, canEdit: false, canDelete: false },
  { role: 'LAB_STAFF', module: 'traceability',  canView: true,  canCreate: false, canEdit: false, canDelete: false },
  { role: 'LAB_STAFF', module: 'knowledge',     canView: true,  canCreate: false, canEdit: false, canDelete: false },
  // MANAGER
  { role: 'MANAGER', module: 'formulas',        canView: true,  canCreate: false, canEdit: false, canDelete: false },
  { role: 'MANAGER', module: 'materials',       canView: true,  canCreate: false, canEdit: false, canDelete: false },
  { role: 'MANAGER', module: 'suppliers',       canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
  { role: 'MANAGER', module: 'risks',           canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
  { role: 'MANAGER', module: 'experiments',     canView: true,  canCreate: false, canEdit: false, canDelete: false },
  { role: 'MANAGER', module: 'results',         canView: true,  canCreate: false, canEdit: false, canDelete: false },
  { role: 'MANAGER', module: 'samples',         canView: true,  canCreate: false, canEdit: false, canDelete: false },
  { role: 'MANAGER', module: 'reports',         canView: true,  canCreate: false, canEdit: false, canDelete: false },
  { role: 'MANAGER', module: 'traceability',    canView: true,  canCreate: false, canEdit: false, canDelete: false },
  { role: 'MANAGER', module: 'knowledge',       canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
]

async function ensureSeeded() {
  const count = await prisma.rolePermission.count()
  if (count === 0) {
    await prisma.rolePermission.createMany({ data: DEFAULT_PERMISSIONS })
  }
}

// GET /permissions — admin: full matrix; others: own permissions
router.get('/', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  await ensureSeeded()
  const perms = await prisma.rolePermission.findMany({ orderBy: [{ role: 'asc' }, { module: 'asc' }] })
  res.json({ success: true, data: perms })
})

// GET /permissions/my — current user's permissions (cached in frontend)
router.get('/my', requireAuth, async (req: any, res) => {
  const role = req.user!.role as string
  if (role === 'ADMIN') {
    res.json({
      success: true,
      data: MODULES.map((m) => ({
        role: 'ADMIN', module: m,
        canView: true, canCreate: true, canEdit: true, canDelete: true,
      })),
    })
    return
  }
  await ensureSeeded()
  const perms = await prisma.rolePermission.findMany({ where: { role } })
  res.json({ success: true, data: perms })
})

// PUT /permissions — save permission matrix (ADMIN only)
router.put('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { permissions } = req.body as {
    permissions: { role: string; module: string; canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }[]
  }
  for (const p of permissions) {
    if (p.role === 'ADMIN') continue
    await prisma.rolePermission.upsert({
      where: { role_module: { role: p.role, module: p.module } },
      create: p,
      update: { canView: p.canView, canCreate: p.canCreate, canEdit: p.canEdit, canDelete: p.canDelete },
    })
  }
  res.json({ success: true })
})

// POST /permissions/reset — reset to defaults
router.post('/reset', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  await prisma.rolePermission.deleteMany({ where: { role: { in: ['LAB_STAFF', 'MANAGER'] } } })
  await prisma.rolePermission.createMany({ data: DEFAULT_PERMISSIONS })
  res.json({ success: true })
})

export default router
