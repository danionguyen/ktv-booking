import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { bookingsApi } from '@api/bookings'
import { qk } from '@api/keys'
import type { Booking, ConfirmRequest, MyBookingGroup } from '@/types/domain'

export const useMyBookings = (group: MyBookingGroup, page: number) =>
  useQuery({
    queryKey: qk.myBookings(group, page),
    queryFn: () => bookingsApi.mine(group, page),
    placeholderData: keepPreviousData,
  })

export const useBooking = (id: number) =>
  useQuery({
    queryKey: qk.booking(id),
    queryFn: () => bookingsApi.get(id),
    retry: false,
    enabled: id > 0,
  })

/** Sau mọi thay đổi trạng thái đơn: làm mới danh sách, sơ đồ và kết quả tìm phòng. */
function useBookingInvalidation() {
  const qc = useQueryClient()
  return (booking?: Pick<Booking, 'id'>) => {
    if (booking) void qc.invalidateQueries({ queryKey: qk.booking(booking.id) })
    void qc.invalidateQueries({ queryKey: ['bookings', 'me'] })
    void qc.invalidateQueries({ queryKey: ['room-map'] })
    void qc.invalidateQueries({ queryKey: ['availability'] })
  }
}

export function useHold() {
  const invalidate = useBookingInvalidation()
  return useMutation({ mutationFn: bookingsApi.hold, onSuccess: (b) => invalidate(b) })
}

export function useReleaseHold() {
  const invalidate = useBookingInvalidation()
  return useMutation({ mutationFn: bookingsApi.releaseHold, onSuccess: (b) => invalidate(b) })
}

export function useSetItems(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (items: { menuItemId: number; quantity: number }[]) =>
      bookingsApi.setItems(id, items),
    onSuccess: (b) => qc.setQueryData(qk.booking(id), b),
  })
}

export function useConfirmBooking(id: number) {
  const invalidate = useBookingInvalidation()
  return useMutation({
    mutationFn: (body: ConfirmRequest) => bookingsApi.confirm(id, body),
    onSuccess: () => invalidate({ id }),
    meta: { silent: true },
  })
}

export function useCancelBooking(id: number) {
  const invalidate = useBookingInvalidation()
  return useMutation({
    mutationFn: (reason: string) => bookingsApi.cancel(id, reason),
    onSuccess: () => invalidate({ id }),
  })
}

export function useValidateVoucher(bookingId: number) {
  return useMutation({
    mutationFn: (code: string) => bookingsApi.validateVoucher(bookingId, code),
    meta: { silent: true },
  })
}

export function useRepay() {
  return useMutation({ mutationFn: bookingsApi.createVnpay })
}

export function useReview(bookingId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { rating: number; comment: string }) =>
      bookingsApi.review({ bookingId, ...body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.booking(bookingId) })
      void qc.invalidateQueries({ queryKey: ['bookings', 'me'] })
      void qc.invalidateQueries({ queryKey: ['rooms'] })
    },
  })
}
