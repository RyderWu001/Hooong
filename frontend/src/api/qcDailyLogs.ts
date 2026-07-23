import client from './client'

export const getQcDailyLogs = (params?: { page?: number; limit?: number }) =>
  client.get('/qc-daily-logs', { params })

export const getQcDailyLog = (id: number) =>
  client.get(`/qc-daily-logs/${id}`)

export const createQcDailyLog = (data: object) =>
  client.post('/qc-daily-logs', data)

export const updateQcDailyLog = (id: number, data: object) =>
  client.put(`/qc-daily-logs/${id}`, data)

export const deleteQcDailyLog = (id: number) =>
  client.delete(`/qc-daily-logs/${id}`)
