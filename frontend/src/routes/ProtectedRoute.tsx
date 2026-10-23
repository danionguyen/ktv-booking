import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { FullPageSpinner } from '@components/FullPageSpinner'
import { useAuth } from '@hooks/useAuth'

/** Chặn khách chưa đăng nhập; chờ khôi phục phiên trước khi quyết định. */
export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <FullPageSpinner />
  if (status === 'guest') return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}
