import { request } from './client'
import type {
  AuthTokenResponse,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from '@/types/auth'

export const authApi = {
  login: (body: LoginRequest) =>
    request<AuthTokenResponse>({ method: 'POST', url: '/auth/login', data: body }),
  register: (body: RegisterRequest) =>
    request<AuthTokenResponse>({ method: 'POST', url: '/auth/register', data: body }),
  logout: () => request<void>({ method: 'POST', url: '/auth/logout' }),
  forgotPassword: (email: string) =>
    // devResetUrl chỉ có khi chạy mock (không có email thật)
    request<{ sent: boolean; devResetUrl?: string }>({
      method: 'POST',
      url: '/auth/forgot-password',
      data: { email },
    }),
  resetPassword: (body: ResetPasswordRequest) =>
    request<void>({ method: 'POST', url: '/auth/reset-password', data: body }),
}
