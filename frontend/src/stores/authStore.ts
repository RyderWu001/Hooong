import { create } from 'zustand'
import type { User } from '../types'

interface AuthStore {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  clearAuth: () => void
}

function loadUser() {
  try {
    const stored = localStorage.getItem('user')
    if (!stored || stored === 'undefined' || stored === 'null') return null
    return JSON.parse(stored)
  } catch {
    localStorage.removeItem('user')
    return null
  }
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: localStorage.getItem('token'),
  user: loadUser(),
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
