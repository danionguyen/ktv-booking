import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query'
import { adminApi, type AdminBookingQuery } from '@api/admin'
import { qk } from '@api/keys'
import type { Role } from '@/types/auth'
import type { StatsFilter } from '@/types/domain'

export const useAdminBranches = () =>
  useQuery({ queryKey: qk.admin.branches, queryFn: adminApi.branches.list })
export const useAdminRoomTypes = () =>
  useQuery({ queryKey: qk.admin.roomTypes, queryFn: adminApi.roomTypes.list })
export const useAdminRooms = (branchId?: number) =>
  useQuery({
    queryKey: qk.admin.rooms(branchId),
    queryFn: () => adminApi.rooms.listByBranch(branchId),
  })
export const usePriceRules = (roomTypeId: number | undefined) =>
  useQuery({
    queryKey: qk.admin.priceRules(roomTypeId!),
    queryFn: () => adminApi.roomTypes.priceRules(roomTypeId!),
    enabled: !!roomTypeId,
  })
export const useHolidays = () =>
  useQuery({ queryKey: qk.admin.holidays, queryFn: adminApi.holidays.list })
export const useAdminMenu = () => useQuery({ queryKey: qk.admin.menu, queryFn: adminApi.menu.list })
export const useAdminVouchers = () =>
  useQuery({ queryKey: qk.admin.vouchers, queryFn: adminApi.vouchers.list })

export const useAdminUsers = (params: { q?: string; role?: Role; page: number; size: number }) =>
  useQuery({
    queryKey: qk.admin.users(params),
    queryFn: () => adminApi.users.list(params),
    placeholderData: keepPreviousData,
  })

export const useAdminBookings = (params: AdminBookingQuery) =>
  useQuery({
    queryKey: qk.admin.bookings(params),
    queryFn: () => adminApi.bookings.list(params),
    placeholderData: keepPreviousData,
  })

export const useAdminBooking = (id: number | null) =>
  useQuery({
    queryKey: qk.admin.booking(id!),
    queryFn: () => adminApi.bookings.get(id!),
    enabled: !!id,
  })

/**
 * Mutation admin dùng chung: sau khi thành công làm mới các key liên quan.
 * Dữ liệu công khai (chi nhánh, menu, giá...) cũng bị ảnh hưởng nên invalidate luôn.
 */
export function useAdminMutation<TVars, TData>(
  mutationFn: (vars: TVars) => Promise<TData>,
  invalidate: QueryKey[],
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      for (const key of invalidate) void qc.invalidateQueries({ queryKey: key })
    },
  })
}

/** Chỉ số tổng hợp của một khoảng (dùng để so với kỳ trước trên dashboard). */
export const useStatsSummary = (f: StatsFilter) =>
  useQuery({
    queryKey: qk.admin.stats('summary', f),
    queryFn: () => adminApi.stats.summary(f),
    placeholderData: keepPreviousData,
  })

export const useStats = (f: StatsFilter, groupBy: 'DAY' | 'MONTH') => {
  const opts = { placeholderData: keepPreviousData }
  return {
    summary: useQuery({
      queryKey: qk.admin.stats('summary', f),
      queryFn: () => adminApi.stats.summary(f),
      ...opts,
    }),
    revenue: useQuery({
      queryKey: qk.admin.stats('revenue', { ...f, groupBy }),
      queryFn: () => adminApi.stats.revenue({ ...f, groupBy }),
      ...opts,
    }),
    occupancy: useQuery({
      queryKey: qk.admin.stats('occupancy', f),
      queryFn: () => adminApi.stats.occupancy(f),
      ...opts,
    }),
    topRooms: useQuery({
      queryKey: qk.admin.stats('top-rooms', f),
      queryFn: () => adminApi.stats.topRooms(f),
      ...opts,
    }),
    topItems: useQuery({
      queryKey: qk.admin.stats('top-items', f),
      queryFn: () => adminApi.stats.topItems(f),
      ...opts,
    }),
  }
}
