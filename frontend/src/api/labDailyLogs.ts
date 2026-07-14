import client from './client'

export const getLabDailyLogs = (params?: { page?: number; limit?: number }) =>
  client.get('/lab-daily-logs', { params })

export const getLabDailyLog = (id: number) =>
  client.get(`/lab-daily-logs/${id}`)

export const createLabDailyLog = (data: object) =>
  client.post('/lab-daily-logs', data)

export const updateLabDailyLog = (id: number, data: object) =>
  client.put(`/lab-daily-logs/${id}`, data)

export const deleteLabDailyLog = (id: number) =>
  client.delete(`/lab-daily-logs/${id}`)
