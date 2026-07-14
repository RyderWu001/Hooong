import client from './client'
import type { RiskLevel, AbnormalEventStatus } from '../types'

export const getFormulaRisks = (params?: { riskLevel?: RiskLevel }) =>
  client.get('/risks/formulas', { params })

export const createFormulaRisk = (data: {
  formulaId: number; riskLevel: RiskLevel; riskType: string
  description: string; mitigation: string; nextReviewAt: string
}) => client.post('/risks/formulas', data)

export const updateFormulaRisk = (id: number, data: Partial<{
  riskLevel: RiskLevel; riskType: string; description: string; mitigation: string; nextReviewAt: string
}>) => client.put(`/risks/formulas/${id}`, data)

export const deleteFormulaRisk = (id: number) => client.delete(`/risks/formulas/${id}`)

export const getIngredientRisks = (params?: { riskLevel?: RiskLevel }) =>
  client.get('/risks/ingredients', { params })

export const createIngredientRisk = (data: {
  ingredientId: number; riskLevel: RiskLevel; riskType: string
  hazardDescription: string; safeHandling: string; storageRequirements: string
}) => client.post('/risks/ingredients', data)

export const updateIngredientRisk = (id: number, data: Partial<{
  riskLevel: RiskLevel; riskType: string; hazardDescription: string
  safeHandling: string; storageRequirements: string
}>) => client.put(`/risks/ingredients/${id}`, data)

export const deleteIngredientRisk = (id: number) => client.delete(`/risks/ingredients/${id}`)

export const getAbnormalEvents = (params?: {
  status?: AbnormalEventStatus; severity?: RiskLevel; eventType?: string; page?: number; limit?: number
}) => client.get('/risks/events', { params })

export const createAbnormalEvent = (data: {
  title: string; description: string; eventType: string; severity: RiskLevel
  occurredAt: string; relatedFormulaId?: number; relatedIngredientId?: number
}) => client.post('/risks/events', data)

export const updateAbnormalEvent = (id: number, data: Partial<{
  status: AbnormalEventStatus; resolution: string; resolvedAt: string
}>) => client.put(`/risks/events/${id}`, data)

export const deleteAbnormalEvent = (id: number) => client.delete(`/risks/events/${id}`)

export const getRiskReport = () => client.get('/risks/report')
