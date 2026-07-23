import client from './client'

export const getSupplierComplianceAudits = (params?: { page?: number; limit?: number }) =>
  client.get('/supplier-compliance-audits', { params })

export const getSupplierComplianceAudit = (id: number) =>
  client.get(`/supplier-compliance-audits/${id}`)

export const createSupplierComplianceAudit = (data: object) =>
  client.post('/supplier-compliance-audits', data)

export const updateSupplierComplianceAudit = (id: number, data: object) =>
  client.put(`/supplier-compliance-audits/${id}`, data)

export const deleteSupplierComplianceAudit = (id: number) =>
  client.delete(`/supplier-compliance-audits/${id}`)
