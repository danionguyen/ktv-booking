import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import type { Role } from '@/types/auth'

/** Đặt bên trong ProtectedRoute: user đã đăng nhập nhưng sai role → /403. */
export function RoleGuard({ roles }: { roles: Role[] }) {
  const { user } = useAuth()
  if (!user || !roles.includes(user.role)) return <Navigate to="/403" replace />
  return <Outlet />
}
