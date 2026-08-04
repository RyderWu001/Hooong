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
    // 後端不存在時回傳 mock 資料。僅限開發模式：正式環境若在此偽造成功回應，
    // 使用者會看到「儲存成功」但資料從未寫入資料庫。
    if (import.meta.env.DEV) {
      const isProxyError =
        error.response?.status === 502 || error.response?.status === 503 || !error.response

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
          // 沒有對應 handler 時不可回傳 undefined，否則呼叫端讀 res.data.data 會拋 TypeError
          if (result !== undefined) {
            return Promise.resolve({ data: result, status: 200, config: error.config })
          }
        }
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
