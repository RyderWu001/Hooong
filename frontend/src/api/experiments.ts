import client from './client'

export const getExperiments = (params?: {
  code?: string; formulaId?: number; experimenterId?: number
  category?: string; dateFrom?: string; dateTo?: string; page?: number; limit?: number
}) => client.get('/experiments', { params })

export const getExperiment = (id: number) => client.get(`/experiments/${id}`)

export const createExperiment = (data: {
  code: string; formulaId?: number | null; experimentDate: string
  category?: string | null; temperature?: number; humidity?: number; notes?: string
  clientCompany?: string | null; fabricCode?: string | null; clientContact?: string | null
  commissionType?: string | null; expectedDate?: string | null; actualDate?: string | null
  testItems?: any[] | null; commissionNotes?: any | null
  conclusionBefore?: string | null; conclusionAfter?: string | null
}) => client.post('/experiments', data)

export const updateExperiment = (id: number, data: {
  category?: string | null; temperature?: number; humidity?: number
  notes?: string; experimentDate?: string
  clientCompany?: string | null; fabricCode?: string | null; clientContact?: string | null
  commissionType?: string | null; expectedDate?: string | null; actualDate?: string | null
  testItems?: any[] | null; commissionNotes?: any | null
  conclusionBefore?: string | null; conclusionAfter?: string | null
}) => client.patch(`/experiments/${id}`, data)

export const deleteExperiment = (id: number) => client.delete(`/experiments/${id}`)

// ── Groups ───────────────────────────────────────────────────────────────────

export const getGroups = (experimentId: number) =>
  client.get(`/experiments/${experimentId}/groups`)

export const createGroup = (experimentId: number, data: {
  name: string; experimentType?: string | null
  bathRatio?: string | null; startPH?: number | null; endPH?: number | null
  acidMethod?: string | null; tempRate?: string | null; holdTime?: number | null
  burningCondition?: string | null; washCondition?: string | null; dyeAuxiliaries?: string[] | null
  leveler?: string | null; fixer?: string | null; calciumChloride?: string | null
  colorFixative?: string | null; dyeCombination?: string | null; dyeAmount?: string | null
  fixingTemp?: string | null; fixingAuxAmount?: string | null; fiberSpec?: string | null
  widthShrinkage?: string | null; shrinkTime?: string | null; fixingAuxiliaries?: string[] | null
  notes?: string
}) => client.post(`/experiments/${experimentId}/groups`, data)

export const updateGroup = (experimentId: number, groupId: number, data: {
  name: string; experimentType?: string | null
  bathRatio?: string | null; startPH?: number | null; endPH?: number | null
  acidMethod?: string | null; tempRate?: string | null; holdTime?: number | null
  burningCondition?: string | null; washCondition?: string | null; dyeAuxiliaries?: string[] | null
  leveler?: string | null; fixer?: string | null; calciumChloride?: string | null
  colorFixative?: string | null; dyeCombination?: string | null; dyeAmount?: string | null
  fixingTemp?: string | null; fixingAuxAmount?: string | null; fiberSpec?: string | null
  widthShrinkage?: string | null; shrinkTime?: string | null; fixingAuxiliaries?: string[] | null
  notes?: string
}) => client.put(`/experiments/${experimentId}/groups/${groupId}`, data)

export const deleteGroup = (experimentId: number, groupId: number) =>
  client.delete(`/experiments/${experimentId}/groups/${groupId}`)

export const setGroupSuccess = (experimentId: number, groupId: number, isSuccess: boolean) =>
  client.patch(`/experiments/${experimentId}/groups/${groupId}/success`, { isSuccess })

// ── Group Steps ──────────────────────────────────────────────────────────────

export const addGroupStep = (experimentId: number, groupId: number, data: {
  description: string; stepOrder?: number
}) => client.post(`/experiments/${experimentId}/groups/${groupId}/steps`, data)

export const reorderGroupSteps = (experimentId: number, groupId: number, steps: {
  id: number; stepOrder: number; description: string; notes: string; isHighlight: boolean
}[]) => client.put(`/experiments/${experimentId}/groups/${groupId}/steps`, { steps })

export const deleteGroupStep = (experimentId: number, groupId: number, stepId: number) =>
  client.delete(`/experiments/${experimentId}/groups/${groupId}/steps/${stepId}`)

export const uploadStepAttachment = (
  experimentId: number, groupId: number, stepId: number,
  file: File, fileType: string
) => {
  const form = new FormData()
  form.append('file', file)
  form.append('fileType', fileType)
  return client.post(`/experiments/${experimentId}/groups/${groupId}/steps/${stepId}/attachments`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const deleteStepAttachment = (
  experimentId: number, groupId: number, stepId: number, attId: number
) => client.delete(`/experiments/${experimentId}/groups/${groupId}/steps/${stepId}/attachments/${attId}`)

// ── Group Attachments ────────────────────────────────────────────────────────

export const uploadGroupAttachment = (
  experimentId: number, groupId: number,
  file: File, fileType: string, imageCategory?: string | null
) => {
  const form = new FormData()
  form.append('file', file)
  form.append('fileType', fileType)
  if (imageCategory) form.append('imageCategory', imageCategory)
  return client.post(`/experiments/${experimentId}/groups/${groupId}/attachments`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const deleteGroupAttachment = (experimentId: number, groupId: number, attId: number) =>
  client.delete(`/experiments/${experimentId}/groups/${groupId}/attachments/${attId}`)

// ── Samples ──────────────────────────────────────────────────────────────────

export const getSamples = (experimentId: number) =>
  client.get(`/experiments/${experimentId}/samples`)

export const getSample = (experimentId: number, sampleId: number) =>
  client.get(`/experiments/${experimentId}/samples/${sampleId}`)

export const createSample = (experimentId: number, data: {
  sampleCode: string; sampleType?: string | null; clientName: string; label: string
  targetItem: string; sampleDate: string; quantity?: number | null; notes: string
  groupId?: number | null; category?: string | null; attribute?: string | null
  industry?: string | null; status?: string | null
  retentionDate?: string | null; retentionPeriod?: number | null
  retentionLocation?: string | null; storageCondition?: string | null
}) => client.post(`/experiments/${experimentId}/samples`, data)

export const updateSample = (experimentId: number, sampleId: number, data: {
  sampleType?: string | null; clientName?: string; label?: string; targetItem?: string
  notes?: string; quantity?: number | null; category?: string | null; attribute?: string | null
  industry?: string | null; status?: string | null; groupId?: number | null
  retentionDate?: string | null; retentionPeriod?: number | null
  retentionLocation?: string | null; storageCondition?: string | null
}) => client.patch(`/experiments/${experimentId}/samples/${sampleId}`, data)

export const uploadSamplePhoto = (experimentId: number, sampleId: number, file: File) => {
  const form = new FormData()
  form.append('file', file)
  return client.post(`/experiments/${experimentId}/samples/${sampleId}/photo`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const deleteSample = (experimentId: number, sampleId: number) =>
  client.delete(`/experiments/${experimentId}/samples/${sampleId}`)

export const getSampleAttachments = (experimentId: number, sampleId: number) =>
  client.get(`/experiments/${experimentId}/samples/${sampleId}/attachments`)

export const uploadSampleAttachment = (
  experimentId: number, sampleId: number, file: File, fileType: string
) => {
  const form = new FormData()
  form.append('file', file)
  form.append('fileType', fileType)
  return client.post(`/experiments/${experimentId}/samples/${sampleId}/attachments`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const deleteSampleAttachment = (experimentId: number, sampleId: number, attachmentId: number) =>
  client.delete(`/experiments/${experimentId}/samples/${sampleId}/attachments/${attachmentId}`)

// ── Experiment-level Attachments ──────────────────────────────────────────────

export const uploadAttachment = (
  id: number, file: File, fileType: string, imageCategory?: string | null
) => {
  const form = new FormData()
  form.append('file', file)
  form.append('fileType', fileType)
  if (imageCategory) form.append('imageCategory', imageCategory)
  return client.post(`/experiments/${id}/attachments`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const deleteAttachment = (experimentId: number, attachmentId: number) =>
  client.delete(`/experiments/${experimentId}/attachments/${attachmentId}`)

// ── Result ────────────────────────────────────────────────────────────────────

export const getResult = (id: number) => client.get(`/experiments/${id}/result`)
