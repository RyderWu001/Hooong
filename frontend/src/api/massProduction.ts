import client from './client'

export const getMassProductionApprovals = () =>
  client.get('/mass-production-approvals')

export const getMassProductionApproval = (id: number) =>
  client.get(`/mass-production-approvals/${id}`)

export const createMassProductionApproval = (data: object) =>
  client.post('/mass-production-approvals', data)

export const updateMassProductionApproval = (id: number, data: object) =>
  client.put(`/mass-production-approvals/${id}`, data)

export const deleteMassProductionApproval = (id: number) =>
  client.delete(`/mass-production-approvals/${id}`)
