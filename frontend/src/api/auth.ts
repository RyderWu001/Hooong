import client from './client'
import type { User, Role } from '../types'

export const login = (email: string, password: string) =>
  client.post<{ data: { token: string; user: User } }>('/auth/login', { email, password })

export const logout = () => client.post('/auth/logout')

export const register = (data: { username: string; email: string; password: string }) =>
  client.post<{ data: { token: string; user: User } }>('/auth/register', data)

export const adminRegister = (data: { username: string; email: string; password: string; role: Role }) =>
  client.post('/auth/admin/register', data)

export const forgotPassword = (email: string) =>
  client.post('/auth/forgot-password', { email })

export const getMe = () => client.get<{ data: User }>('/auth/me')

export const getUsers = (params?: { role?: Role; isActive?: boolean; page?: number; limit?: number }) =>
  client.get('/users', { params })

export const updateUser = (id: number, data: { role?: Role; isActive?: boolean }) =>
  client.patch(`/users/${id}`, data)
