import { MutationCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiRequestError } from './client'

declare module '@tanstack/react-query' {
  interface Register {
    // `meta: { silent: true }` → mutation tự hiển thị lỗi, không toast chung
    mutationMeta: { silent?: boolean }
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) return error.message
  if (error instanceof Error && error.message === 'Network Error') {
    return 'Không kết nối được máy chủ, vui lòng thử lại'
  }
  return 'Đã có lỗi xảy ra, vui lòng thử lại'
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Lỗi nghiệp vụ (4xx) không retry
      retry: (count, error) =>
        !(error instanceof ApiRequestError && (error.status ?? 500) < 500) && count < 2,
    },
  },
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      if (!mutation.meta?.silent) toast.error(errorMessage(error))
    },
  }),
})
