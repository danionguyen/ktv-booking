export type Role = 'CUSTOMER' | 'STAFF' | 'ADMIN'

export interface AuthUser {
  id: number
  fullName: string
  email: string
  role: Role
  branchId: number | null
}

export interface LoginRequest {
  email: string
  password: string
  /** false → refresh token chỉ sống trong phiên trình duyệt */
  rememberMe?: boolean
}

export interface AuthTokenResponse {
  accessToken: string
  expiresIn: number
  user: AuthUser
}

export interface RegisterRequest {
  fullName: string
  email: string
  phone: string
  password: string
}

export interface ResetPasswordRequest {
  token: string
  newPassword: string
}
