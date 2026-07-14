import client from './client'
import type { SupplierStatus, PurchaseStatus } from '../types'

export const getSuppliers = (params?: { name?: string; status?: SupplierStatus; page?: number; limit?: number }) =>
  client.get('/suppliers', { params })

export const getSupplier = (id: number) => client.get(`/suppliers/${id}`)

export const createSupplier = (data: {
  code: string; name: string; contactPerson: string; phone: string
  email: string; address: string; supplyItems: string
}) => client.post('/suppliers', data)

export const updateSupplier = (id: number, data: {
  name?: string; contactPerson?: string; phone?: string
  email?: string; address?: string; supplyItems?: string; status?: SupplierStatus
}) => client.put(`/suppliers/${id}`, data)

export const deleteSupplier = (id: number) => client.delete(`/suppliers/${id}`)

export const getEvaluations = (params?: { supplierId?: number }) =>
  client.get('/evaluations', { params })

export const getSupplierEvaluations = (supplierId: number) =>
  client.get(`/suppliers/${supplierId}/evaluations`)

export const createEvaluation = (data: {
  supplierId: number; evaluationDate: string
  qualityScore: number; deliveryScore: number; priceScore: number; serviceScore: number; notes: string
}) => client.post('/evaluations', data)

export const getPurchases = (params?: {
  supplierId?: number; status?: PurchaseStatus; ingredientName?: string
  dateFrom?: string; dateTo?: string; page?: number; limit?: number
}) => client.get('/purchases', { params })

export const createPurchase = (data: {
  supplierId: number; ingredientId: number; quantity: number
  unitPrice: number; purchaseDate: string; notes?: string
}) => client.post('/purchases', data)

export const updatePurchase = (id: number, data: { status?: PurchaseStatus; deliveryDate?: string; notes?: string }) =>
  client.put(`/purchases/${id}`, data)
