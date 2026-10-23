import { request } from './client'
import type {
  Booking,
  CheckoutResult,
  ExtendOptions,
  Invoice,
  Timeline,
  WalkInRequest,
} from '@/types/domain'

export const staffApi = {
  timeline: (date: string, branchId?: number) =>
    request<Timeline>({ url: '/staff/bookings/timeline', params: { date, branchId } }),
  booking: (id: number) => request<Booking>({ url: `/staff/bookings/${id}` }),
  walkIn: (body: WalkInRequest) =>
    request<Booking>({ method: 'POST', url: '/staff/bookings', data: body }),
  checkIn: (id: number) =>
    request<Booking>({ method: 'POST', url: `/staff/bookings/${id}/check-in` }),
  addItem: (id: number, menuItemId: number, quantity: number) =>
    request<Booking>({
      method: 'POST',
      url: `/staff/bookings/${id}/items`,
      data: { menuItemId, quantity },
    }),
  removeItem: (id: number, itemId: number) =>
    request<Booking>({ method: 'DELETE', url: `/staff/bookings/${id}/items/${itemId}` }),
  extendOptions: (id: number) =>
    request<ExtendOptions>({ url: `/staff/bookings/${id}/extend-options` }),
  extend: (id: number, minutes: number) =>
    request<Booking>({ method: 'POST', url: `/staff/bookings/${id}/extend`, data: { minutes } }),
  invoice: (id: number) => request<Invoice>({ url: `/staff/bookings/${id}/invoice` }),
  checkOut: (id: number, receivedAmount: number) =>
    request<CheckoutResult>({
      method: 'POST',
      url: `/staff/bookings/${id}/check-out`,
      data: { receivedAmount },
    }),
}
