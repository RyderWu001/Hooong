import type { Response, NextFunction } from 'express'
import prisma from '../db/client'
import type { AuthRequest } from './auth'

/**
 * 依 RolePermission 資料表判斷權限。
 *
 * 先前系統雖然有權限矩陣的資料表與管理介面，但沒有任何 API 讀取它做判斷，
 * 實際生效的是各路由硬編碼的 requireRole(...)。管理者在畫面上取消勾選後
 * 資料有存進資料庫，行為卻完全沒有改變。此中介層讓矩陣真正生效。
 */

export const MODULES = [
  'formulas', 'materials', 'suppliers', 'risks',
  'experiments', 'results', 'samples', 'reports',
  'traceability', 'knowledge', 'forms',
] as const

export type Module = typeof MODULES[number]
export type Action = 'view' | 'create' | 'edit' | 'delete'

const COLUMN: Record<Action, 'canView' | 'canCreate' | 'canEdit' | 'canDelete'> = {
  view: 'canView',
  create: 'canCreate',
  edit: 'canEdit',
  delete: 'canDelete',
}

/**
 * 權限查詢快取。每次請求都查資料庫會讓所有 API 多一次往返；
 * 權限異動不頻繁，短期快取即可，PermissionsPage 存檔後會主動清除。
 */
const CACHE_TTL_MS = 60_000
let cache: { at: number; rows: Map<string, Record<string, boolean>> } | null = null

export function invalidatePermissionCache() {
  cache = null
}

async function loadPermissions() {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.rows
  const rows = await prisma.rolePermission.findMany()
  const map = new Map<string, Record<string, boolean>>()
  for (const r of rows) {
    map.set(`${r.role}:${r.module}`, {
      canView: r.canView, canCreate: r.canCreate, canEdit: r.canEdit, canDelete: r.canDelete,
    })
  }
  cache = { at: Date.now(), rows: map }
  return map
}

/** 程式內部查詢用，不經過 Express。ADMIN 一律放行。 */
export async function hasPermission(role: string, module: Module, action: Action): Promise<boolean> {
  if (role === 'ADMIN') return true
  const perms = await loadPermissions()
  const entry = perms.get(`${role}:${module}`)
  // 矩陣中沒有這筆設定時採用預設拒絕，避免新增模組時意外全開。
  if (!entry) return false
  return entry[COLUMN[action]] === true
}

/**
 * 路由守衛。用法：
 *   router.delete('/:id', requireAuth, requirePermission('forms', 'delete'), handler)
 */
export function requirePermission(module: Module, action: Action) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const role = req.user?.role
    if (!role) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '請先登入' } })
      return
    }
    if (await hasPermission(role, module, action)) {
      next()
      return
    }
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: '權限不足，請洽管理員調整權限設定' },
    })
  }
}
