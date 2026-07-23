import client from './client'

export const getChemPreparations = (params?: { page?: number; limit?: number }) =>
  client.get('/chem-preparations', { params })

export const getChemPreparation = (id: number) =>
  client.get(`/chem-preparations/${id}`)

export const createChemPreparation = (data: object) =>
  client.post('/chem-preparations', data)

export const updateChemPreparation = (id: number, data: object) =>
  client.put(`/chem-preparations/${id}`, data)

export const deleteChemPreparation = (id: number) =>
  client.delete(`/chem-preparations/${id}`)
