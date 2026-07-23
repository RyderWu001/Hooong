import client from './client'

export const getProductReworks = (params?: { page?: number; limit?: number }) =>
  client.get('/product-reworks', { params })

export const getProductRework = (id: number) =>
  client.get(`/product-reworks/${id}`)

export const createProductRework = (data: object) =>
  client.post('/product-reworks', data)

export const updateProductRework = (id: number, data: object) =>
  client.put(`/product-reworks/${id}`, data)

export const deleteProductRework = (id: number) =>
  client.delete(`/product-reworks/${id}`)
