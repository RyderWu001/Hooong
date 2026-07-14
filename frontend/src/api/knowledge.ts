import client from './client'

export const getArticles = (params?: {
  keyword?: string
  category?: string
  page?: number
  limit?: number
}) => client.get('/knowledge', { params })

export const getArticleCategories = () => client.get('/knowledge/categories')

export const getArticle = (id: number) => client.get(`/knowledge/${id}`)

export const createArticle = (data: {
  title: string
  content: string
  category?: string
  tags?: string
}) => client.post('/knowledge', data)

export const updateArticle = (id: number, data: {
  title: string
  content: string
  category?: string
  tags?: string
}) => client.put(`/knowledge/${id}`, data)

export const deleteArticle = (id: number) => client.delete(`/knowledge/${id}`)

export const aiChat = (question: string, history?: { role: string; content: string }[]) =>
  client.post('/knowledge/ai-chat', { question, history })
