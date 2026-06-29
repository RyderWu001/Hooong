import client from './client'
import type { ResultStatus } from '../types'

export const getResults = (params?: {
  experimentCode?: string
  formulaName?: string
  status?: ResultStatus
  experimenterId?: number
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}) => client.get('/results', { params })

export const getResult = (experimentId: number) =>
  client.get(`/experiments/${experimentId}/result`)

export const createResult = (
  experimentId: number,
  data: {
    status: ResultStatus
    score?: number | null
    description: string
    reflection: string
    issueRecord: string
    abnormalReason?: string | null
    improvement: string
    improvementAction?: string | null
    clientFeedback: string
    clientFeedbackResult?: string | null
    notes: string
  }
) => client.post(`/experiments/${experimentId}/result`, data)

export const updateResult = (experimentId: number, data: Partial<{
  status: ResultStatus
  score: number | null
  description: string
  reflection: string
  issueRecord: string
  abnormalReason: string | null
  improvement: string
  improvementAction: string | null
  clientFeedback: string
  clientFeedbackResult: string | null
  notes: string
}>) => client.put(`/experiments/${experimentId}/result`, data)

export const uploadResultAttachment = (experimentId: number, file: File, fileType: 'image' | 'video') => {
  const form = new FormData()
  form.append('file', file)
  form.append('fileType', fileType)
  return client.post(`/experiments/${experimentId}/result/attachments`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const deleteResultAttachment = (experimentId: number, attachmentId: number) =>
  client.delete(`/experiments/${experimentId}/result/attachments/${attachmentId}`)
