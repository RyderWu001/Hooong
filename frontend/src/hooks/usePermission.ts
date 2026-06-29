import { useEffect, useState } from 'react'
import { getMyPermissions } from '../api/permissions'
import type { RolePermission } from '../types'
import { useAuthStore } from '../stores/authStore'

let cache: RolePermission[] | null = null

export function usePermissions() {
  const { user } = useAuthStore()
  const [permissions, setPermissions] = useState<RolePermission[]>(cache ?? [])
  const [loading, setLoading] = useState(!cache)

  useEffect(() => {
    if (!user) return
    if (cache) { setPermissions(cache); setLoading(false); return }
    getMyPermissions()
      .then((res) => {
        cache = res.data.data ?? []
        setPermissions(cache!)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id])

  const can = (module: string, action: 'view' | 'create' | 'edit' | 'delete') => {
    if (user?.role === 'ADMIN') return true
    const p = permissions.find((x) => x.module === module)
    if (!p) return false
    if (action === 'view') return p.canView
    if (action === 'create') return p.canCreate
    if (action === 'edit') return p.canEdit
    if (action === 'delete') return p.canDelete
    return false
  }

  return { permissions, loading, can }
}

export function clearPermissionsCache() {
  cache = null
}
