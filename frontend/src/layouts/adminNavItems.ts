import type { NavItem } from './DashboardLayout'

/** Đúng thứ tự Sidebar/Admin trong Figma. */
export const adminNavItems: NavItem[] = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/branches', label: 'Chi nhánh', end: true },
  { to: '/admin/layout', label: 'Sơ đồ mặt bằng', match: ['/admin/branches/:id/layout'] },
  { to: '/admin/room-types', label: 'Loại phòng' },
  { to: '/admin/rooms', label: 'Phòng' },
  { to: '/admin/price-rules', label: 'Bảng giá' },
  { to: '/admin/menu', label: 'Menu' },
  { to: '/admin/vouchers', label: 'Voucher' },
  { to: '/admin/users', label: 'Người dùng' },
  { to: '/admin/bookings', label: 'Đặt phòng' },
]
