export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export type ApiResponse<T> = { success: true; data: T } | { success: false; error: ApiError }

export interface Page<T> {
  items: T[]
  page: number
  size: number
  total: number
}
