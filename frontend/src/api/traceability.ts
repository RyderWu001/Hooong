import client from './client'

export const getFormulaTraceability = (formulaId: number) =>
  client.get(`/traceability/formula/${formulaId}`)

export const getIngredientTraceability = (ingredientId: number) =>
  client.get(`/traceability/ingredient/${ingredientId}`)
