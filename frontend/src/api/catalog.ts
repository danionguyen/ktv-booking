import { request } from './client'
import type {
  AvailabilityResult,
  Branch,
  BranchDetail,
  MenuCategory,
  MenuItem,
  PriceQuote,
  PriceTable,
  Review,
  RoomDetail,
  RoomMapSnapshot,
  RoomType,
} from '@/types/domain'

export interface AvailabilityQuery {
  branchId: number
  start: string
  hours: number
  people: number
}

export const catalogApi = {
  branches: () => request<Branch[]>({ url: '/branches' }),
  branch: (id: number) => request<BranchDetail>({ url: `/branches/${id}` }),
  priceTable: (branchId: number) =>
    request<PriceTable>({ url: `/branches/${branchId}/price-table` }),
  roomMap: (branchId: number, window?: { start: string; end: string }) =>
    request<RoomMapSnapshot>({ url: `/branches/${branchId}/rooms`, params: window }),
  roomTypes: () => request<RoomType[]>({ url: '/room-types' }),
  room: (id: number) => request<RoomDetail>({ url: `/rooms/${id}` }),
  availability: (q: AvailabilityQuery) =>
    request<AvailabilityResult>({ url: '/rooms/availability', params: q }),
  priceQuote: (roomId: number, start: string, hours: number) =>
    request<PriceQuote>({ url: `/rooms/${roomId}/price-quote`, params: { start, hours } }),
  roomReviews: (roomId: number) => request<Review[]>({ url: `/rooms/${roomId}/reviews` }),
  menu: (params?: { category?: MenuCategory; available?: boolean }) =>
    request<MenuItem[]>({ url: '/menu-items', params }),
}
