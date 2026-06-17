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
  productType: string
  description: string
  ingredients: FormulaIngredient[]
}) => client.post('/formulas', data)

export const updateFormula = (
  id: number,
  data: {
    name: string
    productType: string
    description: string
    changeNote: string
    ingredients: FormulaIngredient[]
  }
) => client.put(`/formulas/${id}`, data)

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

export const createIngredient = (data: { name: string; unit: string; description: string }) =>
  client.post('/ingredients', data)

export const updateIngredient = (id: number, data: { name: string; unit: string; description: string }) =>
  client.put(`/ingredients/${id}`, data)

export const deleteIngredient = (id: number) => client.delete(`/ingredients/${id}`)
