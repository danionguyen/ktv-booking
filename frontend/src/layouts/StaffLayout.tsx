import { useBranches } from '@hooks/queries/useCatalog'
import { useStaffBranch } from '@hooks/useStaffBranch'
import { DashboardLayout, type NavItem } from './DashboardLayout'

const navItems: NavItem[] = [
  { to: '/staff', label: 'Timeline phòng', end: true },
  { to: '/staff/room-map', label: 'Sơ đồ phòng' },
  { to: '/staff/today', label: 'Đơn hôm nay', match: ['/staff/bookings/:id'] },
  { to: '/staff/profile', label: 'Hồ sơ' },
]

export function StaffLayout() {
  const { branchId } = useStaffBranch()
  const branches = useBranches()
  const branch = branches.data?.find((b) => b.id === branchId)
  const short = branch?.name.replace(/^KTV\s+/, '')
  return (
    <DashboardLayout
      section={branch?.name ?? 'Quầy'}
      subtitle={short ? `Quầy · CN ${short}` : 'Quầy lễ tân'}
      navItems={navItems}
    />
  )
}
