import { request } from './client'
import type { Page } from '@/types/api'
import type { Role } from '@/types/auth'
import type {
  Booking,
  BookingStatus,
  Branch,
  CancelResult,
  Holiday,
  MenuItem,
  Occupancy,
  PriceRule,
  RevenuePoint,
  Room,
  RoomStatus,
  RoomType,
  StatsFilter,
  StatsSummary,
  TopItem,
  TopRoom,
  User,
  Voucher,
} from '@/types/domain'

export type BranchInput = Pick<Branch, 'name' | 'address' | 'phone' | 'openTime' | 'closeTime'>
export type RoomInput = Pick<Room, 'branchId' | 'roomTypeId' | 'code' | 'status' | 'images'>
export type RoomTypeInput = Omit<RoomType, 'id'>
export type MenuItemInput = Omit<MenuItem, 'id'>
export type VoucherInput = Omit<Voucher, 'id' | 'usedCount'>
export type UserInput = {
  email: string
  password?: string
  fullName: string
  phone: string
  role: Role
  branchId: number | null
}
export type LayoutInput = {
  mapWidth: number
  mapHeight: number
  rooms: Pick<Room, 'id' | 'posX' | 'posY' | 'width' | 'height'>[]
}

export interface AdminBookingQuery {
  status?: BookingStatus
  branchId?: number
  from?: string
  to?: string
  q?: string
  page: number
  size: number
}

/** Bộ CRUD chuẩn cho một tài nguyên admin. */
function crud<T, Input>(path: string) {
  return {
    list: () => request<T[]>({ url: path }),
    create: (body: Input) => request<T>({ method: 'POST', url: path, data: body }),
    update: (id: number, body: Partial<Input>) =>
      request<T>({ method: 'PUT', url: `${path}/${id}`, data: body }),
    remove: (id: number) => request<void>({ method: 'DELETE', url: `${path}/${id}` }),
  }
}

export const adminApi = {
  branches: {
    ...crud<Branch, BranchInput>('/admin/branches'),
    saveLayout: (id: number, body: LayoutInput) =>
      request<Branch>({ method: 'PUT', url: `/admin/branches/${id}/layout`, data: body }),
  },
  roomTypes: {
    ...crud<RoomType, RoomTypeInput>('/admin/room-types'),
    priceRules: (id: number) =>
      request<PriceRule[]>({ url: `/admin/room-types/${id}/price-rules` }),
    savePriceRules: (id: number, rules: PriceRule[]) =>
      request<PriceRule[]>({
        method: 'PUT',
        url: `/admin/room-types/${id}/price-rules`,
        data: { rules },
      }),
  },
  rooms: {
    ...crud<Room, RoomInput>('/admin/rooms'),
    listByBranch: (branchId?: number) =>
      request<Room[]>({ url: '/admin/rooms', params: { branchId } }),
    setStatus: (id: number, status: RoomStatus) =>
      request<Room & { affectedBookings: number }>({
        method: 'PATCH',
        url: `/admin/rooms/${id}/status`,
        data: { status },
      }),
  },
  holidays: {
    list: () => request<Holiday[]>({ url: '/admin/holidays' }),
    create: (body: Holiday) =>
      request<Holiday>({ method: 'POST', url: '/admin/holidays', data: body }),
    remove: (date: string) => request<void>({ method: 'DELETE', url: `/admin/holidays/${date}` }),
  },
  menu: {
    ...crud<MenuItem, MenuItemInput>('/admin/menu-items'),
    setAvailability: (id: number, available: boolean) =>
      request<MenuItem>({
        method: 'PATCH',
        url: `/admin/menu-items/${id}/availability`,
        data: { available },
      }),
  },
  vouchers: crud<Voucher, VoucherInput>('/admin/vouchers'),
  users: {
    list: (params: { q?: string; role?: Role; page: number; size: number }) =>
      request<Page<User>>({ url: '/admin/users', params }),
    create: (body: UserInput) => request<User>({ method: 'POST', url: '/admin/users', data: body }),
    update: (id: number, body: Partial<UserInput>) =>
      request<User>({ method: 'PUT', url: `/admin/users/${id}`, data: body }),
    setStatus: (id: number, enabled: boolean) =>
      request<User>({ method: 'PATCH', url: `/admin/users/${id}/status`, data: { enabled } }),
    resetPassword: (id: number, newPassword: string) =>
      request<void>({ method: 'PUT', url: `/admin/users/${id}/password`, data: { newPassword } }),
  },
  bookings: {
    list: (params: AdminBookingQuery) => request<Page<Booking>>({ url: '/admin/bookings', params }),
    get: (id: number) => request<Booking>({ url: `/admin/bookings/${id}` }),
    cancel: (id: number, reason: string) =>
      request<CancelResult>({
        method: 'POST',
        url: `/admin/bookings/${id}/cancel`,
        data: { reason },
      }),
  },
  stats: {
    summary: (f: StatsFilter) => request<StatsSummary>({ url: '/admin/stats/summary', params: f }),
    revenue: (f: StatsFilter & { groupBy: 'DAY' | 'MONTH' }) =>
      request<RevenuePoint[]>({ url: '/admin/stats/revenue', params: f }),
    occupancy: (f: StatsFilter) => request<Occupancy>({ url: '/admin/stats/occupancy', params: f }),
    topRooms: (f: StatsFilter) =>
      request<TopRoom[]>({ url: '/admin/stats/top-rooms', params: { ...f, limit: 5 } }),
    topItems: (f: StatsFilter) =>
      request<TopItem[]>({ url: '/admin/stats/top-items', params: { ...f, limit: 5 } }),
  },
}
