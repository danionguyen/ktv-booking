import { request } from './client'
import type { Role } from '@/types/auth'

export interface Profile {
  id: number
  email: string
  fullName: string
  phone: string
  role: Role
  branchId: number | null
  createdAt: string
}

export const usersApi = {
  me: () => request<Profile>({ url: '/users/me' }),
  updateMe: (body: { fullName: string; phone: string }) =>
    request<Profile>({ method: 'PUT', url: '/users/me', data: body }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<void>({ method: 'PUT', url: '/users/me/password', data: body }),
}
