import client from './client'

export const getChemicalEvaluations = (params?: { page?: number; limit?: number }) =>
  client.get('/chemical-evaluations', { params })

export const getChemicalEvaluation = (id: number) =>
  client.get(`/chemical-evaluations/${id}`)

export const createChemicalEvaluation = (data: object) =>
  client.post('/chemical-evaluations', data)

export const updateChemicalEvaluation = (id: number, data: object) =>
  client.put(`/chemical-evaluations/${id}`, data)

export const deleteChemicalEvaluation = (id: number) =>
  client.delete(`/chemical-evaluations/${id}`)

export const getChemicalRequests = (params?: { page?: number; limit?: number }) =>
  client.get('/chemical-requests', { params })

export const getChemicalRequest = (id: number) =>
  client.get(`/chemical-requests/${id}`)

export const createChemicalRequest = (data: object) =>
  client.post('/chemical-requests', data)

export const updateChemicalRequest = (id: number, data: object) =>
  client.put(`/chemical-requests/${id}`, data)

export const deleteChemicalRequest = (id: number) =>
  client.delete(`/chemical-requests/${id}`)
