import { create } from 'zustand'
import type { User } from '../types'

interface AuthStore {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  clearAuth: () => void
}

function loadStoredAuth(): { token: string | null; user: User | null } {
  try {
    const token = localStorage.getItem('token')
    const raw = localStorage.getItem('user')
    if (!raw || raw === 'undefined' || raw === 'null') return { token: null, user: null }
    const user = JSON.parse(raw)
    return { token, user }
  } catch {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    return { token: null, user: null }
  }
}

const { token: storedToken, user: storedUser } = loadStoredAuth()

export const useAuthStore = create<AuthStore>((set) => ({
  token: storedToken,
  user: storedUser,
  setAuth: (token, user) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ token, user })
  },
  clearAuth: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ token: null, user: null })
  },
}))
