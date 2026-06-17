import axios from 'axios'
import { resolveMock, resolveWriteMock } from '../mocks/handlers'

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
    // 後端不存在（502 / 網路錯誤）或使用 mock token 遇到 401 時，回傳 mock 資料
    const isMockToken = localStorage.getItem('token') === 'mock-token'
    const isProxyError =
      error.response?.status === 502 || error.response?.status === 503 || !error.response ||
      (error.response?.status === 401 && isMockToken)

    if (isProxyError) {
      const url = error.config?.url ?? ''
      const method = error.config?.method?.toUpperCase() ?? 'GET'

      if (method === 'GET') {
        const params = new URLSearchParams(error.config?.params ?? {}).toString()
        const fullUrl = params ? `${url}?${params}` : url
        const mock = resolveMock(fullUrl)
        if (mock !== null) {
          return Promise.resolve({ data: mock, status: 200, config: error.config })
        }
      } else {
        let body: unknown = {}
        try { body = JSON.parse(error.config?.data ?? '{}') } catch { /* ignore */ }
        const result = resolveWriteMock(url, method, body)
        return Promise.resolve({ data: result, status: 200, config: error.config })
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
