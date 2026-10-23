import { DashboardLayout } from './DashboardLayout'
import { adminNavItems } from './adminNavItems'

export function AdminLayout() {
  return (
    <DashboardLayout section="Quản trị" subtitle="Quản trị hệ thống" navItems={adminNavItems} />
  )
}
