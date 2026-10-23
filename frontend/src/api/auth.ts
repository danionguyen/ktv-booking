import { request } from './client'
import type { AuthTokenResponse, LoginRequest } from '@types/auth'

export const authApi = {
  login: (body: LoginRequest) =>
    request<AuthTokenResponse>({ method: 'POST', url: '/auth/login', data: body }),
  logout: () => request<void>({ method: 'POST', url: '/auth/logout' }),
}
