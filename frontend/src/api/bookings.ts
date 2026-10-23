import { request } from './client'
import type { Page } from '@/types/api'
import type {
  Booking,
  CancelResult,
  ConfirmRequest,
  ConfirmResult,
  HoldRequest,
  MyBookingGroup,
  Review,
  VnpayReturn,
  VoucherValidation,
} from '@/types/domain'

export const bookingsApi = {
  hold: (body: HoldRequest) =>
    request<Booking>({ method: 'POST', url: '/bookings/hold', data: body }),
  releaseHold: (id: number) => request<Booking>({ method: 'DELETE', url: `/bookings/${id}/hold` }),
  setItems: (id: number, items: { menuItemId: number; quantity: number }[]) =>
    request<Booking>({ method: 'PUT', url: `/bookings/${id}/items`, data: { items } }),
  confirm: (id: number, body: ConfirmRequest) =>
    request<ConfirmResult>({ method: 'POST', url: `/bookings/${id}/confirm`, data: body }),
  mine: (group: MyBookingGroup, page = 0, size = 10) =>
    request<Page<Booking>>({ url: '/bookings/me', params: { group, page, size } }),
  get: (id: number) => request<Booking>({ url: `/bookings/${id}` }),
  cancel: (id: number, reason: string) =>
    request<CancelResult>({ method: 'POST', url: `/bookings/${id}/cancel`, data: { reason } }),
  validateVoucher: (bookingId: number, code: string) =>
    request<VoucherValidation>({
      method: 'POST',
      url: '/vouchers/validate',
      data: { bookingId, code },
    }),
  createVnpay: (bookingId: number) =>
    request<{ paymentUrl: string; paymentExpiresAt: string }>({
      method: 'POST',
      url: '/payments/vnpay/create',
      data: { bookingId },
    }),
  vnpayReturn: (query: string) => request<VnpayReturn>({ url: `/payments/vnpay/return?${query}` }),
  review: (body: { bookingId: number; rating: number; comment: string }) =>
    request<Review>({ method: 'POST', url: '/reviews', data: body }),
}
