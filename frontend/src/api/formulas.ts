import client from './client'
import type { Formula, FormulaStatus, FormulaIngredient, Ingredient } from '../types'

export const getFormulas = (params?: {
  name?: string
  productType?: string
  status?: FormulaStatus
  page?: number
  limit?: number
}) => client.get('/formulas', { params })

export const getFormula = (id: number) => client.get<{ data: Formula }>(`/formulas/${id}`)

export const createFormula = (data: {
  code: string
  name: string
  category?: string | null
  formulaType?: string | null
  productType: string
  description: string
  ingredients: FormulaIngredient[]
}) => client.post('/formulas', data)

export const updateFormula = (
  id: number,
  data: {
    name: string
    category?: string | null
    formulaType?: string | null
    productType: string
    description: string
    changeNote: string
    ingredients: FormulaIngredient[]
  }
) => client.put(`/formulas/${id}`, data)

export const copyFormula = (id: number, data: { newCode: string; newName?: string }) =>
  client.post(`/formulas/${id}/copy`, data)

export const promoteFormula = (id: number) =>
  client.post(`/formulas/${id}/promote`, {})

export const rollbackFormula = (id: number, data: { version: number; changeNote?: string }) =>
  client.post(`/formulas/${id}/rollback`, data)

// 審核流程
export const submitFormulaForReview = (id: number) => client.post(`/formulas/${id}/submit`, {})
export const approveFormula = (id: number) => client.post(`/formulas/${id}/approve`, {})
export const rejectFormula = (id: number) => client.post(`/formulas/${id}/reject`, {})
export const archiveFormula = (id: number) => client.post(`/formulas/${id}/archive`, {})

export const deleteFormula = (id: number) => client.delete(`/formulas/${id}`)

export const getFormulaIngredients = (id: number) =>
  client.get(`/formulas/${id}/ingredients`)

export const getFormulaVersions = (id: number) =>
  client.get(`/formulas/${id}/versions`)

export const getFormulaVersion = (id: number, version: number) =>
  client.get(`/formulas/${id}/versions/${version}`)

// Ingredients
export const getIngredients = (params?: { name?: string; page?: number; limit?: number }) =>
  client.get<{ data: Ingredient[] }>('/ingredients', { params })

export const getIngredient = (id: number) =>
  client.get<{ data: Ingredient }>(`/ingredients/${id}`)

export type IngredientPayload = {
  name: string; code?: string | null; casNo?: string | null; englishName?: string | null
  category?: string | null; industry?: string | null; status?: string; packageSpec?: string | null
  unit: string; unitPrice?: number | null; description?: string
}

export const createIngredient = (data: IngredientPayload) => client.post('/ingredients', data)
export const updateIngredient = (id: number, data: IngredientPayload) => client.put(`/ingredients/${id}`, data)

// Documents
export const getIngredientDocuments = (id: number) => client.get(`/ingredients/${id}/documents`)
export const uploadIngredientDocument = (id: number, formData: FormData) =>
  client.post(`/ingredients/${id}/documents`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const deleteIngredientDocument = (docId: number) => client.delete(`/ingredients/documents/${docId}`)

// Batches
export const getIngredientBatches = (id: number) => client.get(`/ingredients/${id}/batches`)
export const createIngredientBatch = (id: number, data: FormData | object) =>
  client.post(`/ingredients/${id}/batches`, data,
    data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {})
export const updateIngredientBatch = (batchId: number, data: FormData | object) =>
  client.put(`/ingredients/batches/${batchId}`, data,
    data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {})
export const deleteIngredientBatch = (batchId: number) => client.delete(`/ingredients/batches/${batchId}`)
export const getExpiringBatches = (days = 30) => client.get(`/ingredients/batches/expiring?days=${days}`)

export const deleteIngredient = (id: number) => client.delete(`/ingredients/${id}`)
