import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@stores/authStore'
import type { ApiError, ApiResponse } from '@types/api'
import type { AuthTokenResponse } from '@types/auth'

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1'

// withCredentials để trình duyệt gửi cookie refresh_token (Path=/api/v1/auth)
export const http = axios.create({ baseURL: API_URL, withCredentials: true })

export class ApiRequestError extends Error {
  readonly code: string
  readonly status?: number
  readonly details?: Record<string, unknown>

  constructor(error: ApiError, status?: number) {
    super(error.message)
    this.code = error.code
    this.status = status
    this.details = error.details
  }
}

/** Gọi API và bóc `data` khỏi envelope `{ success, data }`. */
export async function request<T>(config: Parameters<typeof http.request>[0]): Promise<T> {
  const res = await http.request<ApiResponse<T>>(config)
  if (res.status === 204) return undefined as T
  if (!res.data.success) throw new ApiRequestError(res.data.error, res.status)
  return res.data.data
}

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Mọi request 401 đồng thời cùng chờ một lần refresh duy nhất
let refreshPromise: Promise<string> | null = null

export function refreshSession(): Promise<string> {
  refreshPromise ??= http
    .post<ApiResponse<AuthTokenResponse>>('/auth/refresh')
    .then((res) => {
      if (!res.data.success) throw new ApiRequestError(res.data.error, res.status)
      const { accessToken, user } = res.data.data
      useAuthStore.getState().setSession(accessToken, user)
      return accessToken
    })
    .catch((err) => {
      useAuthStore.getState().clearSession()
      throw err
    })
    .finally(() => {
      refreshPromise = null
    })
  return refreshPromise
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout']

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const config = error.config as RetriableConfig | undefined
    const body = error.response?.data
    const apiError = body && !body.success ? body.error : undefined

    const canRefresh =
      config &&
      !config._retried &&
      error.response?.status === 401 &&
      apiError?.code === 'TOKEN_EXPIRED' &&
      !NO_REFRESH_PATHS.some((p) => config.url?.endsWith(p))

    if (canRefresh) {
      config._retried = true
      const token = await refreshSession()
      config.headers.Authorization = `Bearer ${token}`
      return http.request(config)
    }

    if (apiError) throw new ApiRequestError(apiError, error.response?.status)
    throw error
  },
)
