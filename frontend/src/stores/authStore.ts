import { create } from 'zustand'
import type { AuthUser } from '@/types/auth'

type AuthStatus = 'loading' | 'authenticated' | 'guest'

interface AuthState {
  status: AuthStatus
  // Access token chỉ giữ trong bộ nhớ; refresh token nằm ở cookie httpOnly
  accessToken: string | null
  user: AuthUser | null
  setSession: (accessToken: string, user: AuthUser) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  accessToken: null,
  user: null,
  setSession: (accessToken, user) => set({ status: 'authenticated', accessToken, user }),
  clearSession: () => set({ status: 'guest', accessToken: null, user: null }),
}))
