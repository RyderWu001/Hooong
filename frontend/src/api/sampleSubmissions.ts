import client from './client'

export const getSampleSubmissions = (params?: { page?: number; limit?: number }) =>
  client.get('/sample-submissions', { params })

export const getSampleSubmission = (id: number) =>
  client.get(`/sample-submissions/${id}`)

export const createSampleSubmission = (data: object) =>
  client.post('/sample-submissions', data)

export const updateSampleSubmission = (id: number, data: object) =>
  client.put(`/sample-submissions/${id}`, data)

export const deleteSampleSubmission = (id: number) =>
  client.delete(`/sample-submissions/${id}`)
