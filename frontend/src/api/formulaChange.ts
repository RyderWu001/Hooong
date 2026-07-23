import client from './client'

export const getFormulaChanges = () =>
  client.get('/formula-changes')

export const getFormulaChange = (id: number) =>
  client.get(`/formula-changes/${id}`)

export const createFormulaChange = (data: object) =>
  client.post('/formula-changes', data)

export const updateFormulaChange = (id: number, data: object) =>
  client.put(`/formula-changes/${id}`, data)

export const deleteFormulaChange = (id: number) =>
  client.delete(`/formula-changes/${id}`)
