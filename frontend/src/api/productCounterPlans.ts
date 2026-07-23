import client from './client'

export const getProductCounterPlans = (params?: { page?: number; limit?: number }) =>
  client.get('/product-counter-plans', { params })

export const getProductCounterPlan = (id: number) =>
  client.get(`/product-counter-plans/${id}`)

export const createProductCounterPlan = (data: object) =>
  client.post('/product-counter-plans', data)

export const updateProductCounterPlan = (id: number, data: object) =>
  client.put(`/product-counter-plans/${id}`, data)

export const deleteProductCounterPlan = (id: number) =>
  client.delete(`/product-counter-plans/${id}`)
