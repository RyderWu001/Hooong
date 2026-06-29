import client from './client'

export const getSamplesGlobal = (params?: {
  category?: string
  status?: string
  clientName?: string
  sampleCode?: string
  page?: number
  limit?: number
}) => client.get('/samples', { params })

export const getSampleById = (id: number) => client.get(`/samples/${id}`)
