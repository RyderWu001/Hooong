import axios from 'axios'
import { resolveMock } from '../mocks/handlers'

const client = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (res) => res,
  (error) => {
    // 後端不存在（502 / 網路錯誤）時，回傳 mock 資料
    const isProxyError =
      error.response?.status === 502 || error.response?.status === 503 || !error.response

    if (isProxyError) {
      const url = error.config?.url ?? ''
      const params = new URLSearchParams(error.config?.params ?? {}).toString()
      const fullUrl = params ? `${url}?${params}` : url
      const mock = resolveMock(fullUrl)
      if (mock !== null) {
        return Promise.resolve({ data: mock, status: 200, config: error.config })
      }
      // 寫入 / 刪除操作（POST/PUT/PATCH/DELETE）直接回傳成功
      const method = error.config?.method?.toUpperCase()
      if (method && method !== 'GET') {
        return Promise.resolve({ data: { success: true, data: {}, message: '（Mock）操作成功' }, status: 200 })
      }
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)

export default client
