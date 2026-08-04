import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth, requireRole } from '../middleware/auth'
import { MODULES, invalidatePermissionCache } from '../middleware/permission'

const router = Router()

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
  // 表單管理（13 張附件表單）
  { role: 'LAB_STAFF', module: 'forms',         canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
  { role: 'MANAGER', module: 'forms',           canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
]

/**
 * 補齊缺少的權限列。
 *
 * 權限判斷改為預設拒絕後，若只在資料表為空時才寫入預設值，既有安裝會因為缺少
 * 新模組（如 forms）的設定而突然失去存取權。改為補齊缺漏，同時保留管理者
 * 已調整過的既有設定。
 */
export async function ensureSeeded() {
  const existing = await prisma.rolePermission.findMany({
    select: { role: true, module: true },
  })
  const have = new Set(existing.map((p) => `${p.role}:${p.module}`))
  const missing = DEFAULT_PERMISSIONS.filter((p) => !have.has(`${p.role}:${p.module}`))
  if (missing.length > 0) {
    await prisma.rolePermission.createMany({ data: missing, skipDuplicates: true })
    invalidatePermissionCache()
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
  // 整批寫入包在單一交易，避免部分成功造成權限狀態不一致
  await prisma.$transaction(
    permissions
      .filter((p) => p.role !== 'ADMIN')
      .map((p) =>
        prisma.rolePermission.upsert({
          where: { role_module: { role: p.role, module: p.module } },
          create: p,
          update: { canView: p.canView, canCreate: p.canCreate, canEdit: p.canEdit, canDelete: p.canDelete },
        })
      )
  )
  invalidatePermissionCache()
  res.json({ success: true })
})

// POST /permissions/reset — reset to defaults
router.post('/reset', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { role: { in: ['LAB_STAFF', 'MANAGER'] } } }),
    prisma.rolePermission.createMany({ data: DEFAULT_PERMISSIONS }),
  ])
  invalidatePermissionCache()
  res.json({ success: true })
})

export default router
