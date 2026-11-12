import { useEffect, useState } from 'react'
import { getMyPermissions } from '../api/permissions'
import type { RolePermission } from '../types'
import { useAuthStore } from '../stores/authStore'

let cache: { token: string; rows: RolePermission[] } | null = null

export function usePermissions() {
  const { user, token } = useAuthStore()
  const [loaded, setLoaded] = useState(cache)
  const permissions = loaded?.token === token ? loaded.rows : []
  const [loading, setLoading] = useState(!cache || cache.token !== token)

  useEffect(() => {
    if (!user || !token) return
    let active = true
    if (cache?.token === token) { setLoaded(cache); setLoading(false); return }
    setLoading(true)
    getMyPermissions()
      .then((res) => {
        if (!active) return
        cache = { token, rows: res.data.data ?? [] }
        setLoaded(cache)
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user?.id, token])

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
