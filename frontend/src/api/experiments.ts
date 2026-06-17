import client from './client'

export const getExperiments = (params?: {
  code?: string
  formulaId?: number
  experimenterId?: number
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}) => client.get('/experiments', { params })

export const getExperiment = (id: number) => client.get(`/experiments/${id}`)

export const createExperiment = (data: {
  code: string
  formulaId: number
  experimentDate: string
  temperature: number
  humidity: number
  notes: string
}) => client.post('/experiments', data)

export const updateExperiment = (
  id: number,
  data: { temperature?: number; humidity?: number; notes?: string }
) => client.patch(`/experiments/${id}`, data)

// Steps
export const getSteps = (id: number) => client.get(`/experiments/${id}/steps`)

export const addSteps = (id: number, steps: { stepOrder: number; description: string }[]) =>
  client.post(`/experiments/${id}/steps`, { steps })

export const updateStep = (experimentId: number, stepId: number, data: { description: string }) =>
  client.patch(`/experiments/${experimentId}/steps/${stepId}`, data)

export const deleteStep = (experimentId: number, stepId: number) =>
  client.delete(`/experiments/${experimentId}/steps/${stepId}`)

// Attachments
export const uploadAttachment = (id: number, file: File, fileType: 'image' | 'video') => {
  const form = new FormData()
  form.append('file', file)
  form.append('fileType', fileType)
  return client.post(`/experiments/${id}/attachments`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const deleteAttachment = (experimentId: number, attachmentId: number) =>
  client.delete(`/experiments/${experimentId}/attachments/${attachmentId}`)

// Samples
export const getSamples = (experimentId: number) =>
  client.get(`/experiments/${experimentId}/samples`)

export const getSample = (experimentId: number, sampleId: number) =>
  client.get(`/experiments/${experimentId}/samples/${sampleId}`)

export const createSample = (
  experimentId: number,
  data: {
    sampleCode: string
    clientName: string
    label: string
    targetItem: string
    sampleDate: string
    notes: string
  }
) => client.post(`/experiments/${experimentId}/samples`, data)

export const updateSample = (
  experimentId: number,
  sampleId: number,
  data: { clientName?: string; label?: string; targetItem?: string; notes?: string }
) => client.patch(`/experiments/${experimentId}/samples/${sampleId}`, data)

export const uploadSamplePhoto = (experimentId: number, sampleId: number, file: File) => {
  const form = new FormData()
  form.append('file', file)
  return client.post(`/experiments/${experimentId}/samples/${sampleId}/photo`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const deleteSample = (experimentId: number, sampleId: number) =>
  client.delete(`/experiments/${experimentId}/samples/${sampleId}`)
