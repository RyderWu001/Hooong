import client from './client'
import type { TransactionType } from '../types'

export const getInventory = (params?: { ingredientId?: number }) =>
  client.get('/materials/inventory', { params })

export const createInventory = (data: {
  ingredientId: number
  currentStock: number
  safetyStock: number
  supplier: string
  expiryDate?: string
}) => client.post('/materials/inventory', data)

export const updateInventory = (id: number, data: {
  safetyStock?: number
  supplier?: string
  expiryDate?: string
}) => client.put(`/materials/inventory/${id}`, data)

export const deleteInventory = (id: number) =>
  client.delete(`/materials/inventory/${id}`)

export const adjustStock = (id: number, data: {
  transactionType: TransactionType
  quantity: number
  note: string
}) => client.post(`/materials/inventory/${id}/adjust`, data)

export const getTransactions = (params?: { ingredientId?: number }) =>
  client.get('/materials/transactions', { params })

export const getTraceability = (ingredientId: number) =>
  client.get(`/materials/traceability/${ingredientId}`)
