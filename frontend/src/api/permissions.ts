import client from './client'
import type { RolePermission } from '../types'

export const getAllPermissions = () => client.get('/permissions')

export const getMyPermissions = () => client.get('/permissions/my')

export const updatePermissions = (permissions: Omit<RolePermission, 'id'>[]) =>
  client.put('/permissions', { permissions })

export const resetPermissions = () => client.post('/permissions/reset', {})
