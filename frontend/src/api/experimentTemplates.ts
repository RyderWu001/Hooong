import client from './client'
import type { ExperimentTemplate, TemplateField } from '../types'

export const getExperimentTemplates = (all = false) =>
  client.get<{ success: boolean; data: ExperimentTemplate[] }>('/experiment-templates', { params: all ? { all: 1 } : undefined })

export const createExperimentTemplate = (data: {
  key: string; name: string; domain?: string | null; description?: string; fields: TemplateField[]
}) => client.post('/experiment-templates', data)

export const updateExperimentTemplate = (id: number, data: {
  name?: string; domain?: string | null; description?: string; fields?: TemplateField[]; isActive?: boolean
}) => client.put(`/experiment-templates/${id}`, data)

export const deleteExperimentTemplate = (id: number) => client.delete(`/experiment-templates/${id}`)
