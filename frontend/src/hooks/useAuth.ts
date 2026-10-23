import { useMutation } from '@tanstack/react-query'
import { useLocation, useNavigate, type Location } from 'react-router-dom'
import { toast } from 'sonner'
import { authApi } from '@api/auth'
import { bookingsApi } from '@api/bookings'
import { errorMessage, queryClient } from '@api/queryClient'
import { useAuthStore } from '@stores/authStore'
import type { AuthTokenResponse, Role } from '@/types/auth'
import { takePendingHold } from './useHoldRoom'

export const HOME_BY_ROLE: Record<Role, string> = {
  CUSTOMER: '/',
  STAFF: '/staff',
  ADMIN: '/admin',
}

export function useAuth() {
  const status = useAuthStore((s) => s.status)
  const user = useAuthStore((s) => s.user)
  return { status, user, isAuthenticated: status === 'authenticated' }
}

/** Sau đăng nhập/đăng ký: tiếp tục giữ chỗ đang chờ, hoặc quay lại trang trước, hoặc trang chủ theo role. */
function useAfterAuth() {
  const navigate = useNavigate()
  const location = useLocation()
  return async ({ accessToken, user }: AuthTokenResponse) => {
    useAuthStore.getState().setSession(accessToken, user)
    const pending = takePendingHold()
    if (pending && user.role === 'CUSTOMER') {
      try {
        const booking = await bookingsApi.hold(pending)
        toast.success('Đã giữ phòng cho bạn trong 10 phút')
        navigate(`/checkout/${booking.id}`, { replace: true })
        return
      } catch (e) {
        toast.error(errorMessage(e))
      }
    }
    const from = (location.state as { from?: Location } | null)?.from
    const target =
      from && from.pathname !== '/login'
        ? `${from.pathname}${from.search}`
        : HOME_BY_ROLE[user.role]
    navigate(target, { replace: true })
  }
}

export function useLogin() {
  const afterAuth = useAfterAuth()
  return useMutation({ mutationFn: authApi.login, onSuccess: afterAuth, meta: { silent: true } })
}

export function useRegister() {
  const afterAuth = useAfterAuth()
  return useMutation({ mutationFn: authApi.register, onSuccess: afterAuth, meta: { silent: true } })
}

export function useLogout() {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      useAuthStore.getState().clearSession()
      queryClient.clear()
      navigate('/login', { replace: true })
    },
  })
}
