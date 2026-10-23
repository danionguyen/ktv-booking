import type { Role } from './auth'

export type DayType = 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY'
export type RoomStatus = 'ACTIVE' | 'MAINTENANCE'
/** Trạng thái hiển thị trên sơ đồ phòng (FD-ROM-03). */
export type LiveRoomStatus = 'AVAILABLE' | 'HELD' | 'BOOKED' | 'IN_USE' | 'CLEANING' | 'MAINTENANCE'
export type BookingStatus =
  'HOLD' | 'PENDING_PAYMENT' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED'
export type PaymentMethod = 'VNPAY' | 'CASH'
export type MenuCategory = 'FOOD' | 'DRINK' | 'COMBO'
export type VoucherType = 'PERCENT' | 'FIXED'
export type MyBookingGroup = 'UPCOMING' | 'DONE' | 'CANCELLED'

// ---------- Chi nhánh, phòng ----------

export interface Branch {
  id: number
  name: string
  address: string
  phone: string
  openTime: string // "09:00"
  closeTime: string // "02:00" (qua đêm)
  mapWidth: number
  mapHeight: number
  roomCount: number
  roomTypeCount: number
}

export interface RoomTypeSummary {
  id: number
  name: string
  capacity: number
  roomCount: number
  minPrice: number
}

export interface BranchDetail extends Branch {
  roomTypes: RoomTypeSummary[]
}

export interface RoomType {
  id: number
  name: string
  capacity: number
  description: string
}

export interface Room {
  id: number
  branchId: number
  branchName: string
  roomTypeId: number
  type: string
  capacity: number
  code: string
  status: RoomStatus
  posX: number
  posY: number
  width: number
  height: number
  images: string[]
}

export interface RoomDetail extends Room {
  branch: Pick<Branch, 'id' | 'name' | 'address' | 'openTime' | 'closeTime'>
  roomType: RoomType
  rating: { average: number; count: number }
}

export interface PriceLine {
  from: string // "19:00"
  to: string
  dayType: DayType
  unitPrice: number
  hours: number
  amount: number
}

export interface PriceQuote {
  roomId: number
  start: string
  end: string
  breakdown: PriceLine[]
  total: number
}

export interface AvailabilityGroup {
  roomType: Pick<RoomType, 'id' | 'name' | 'capacity'>
  quote: { total: number; breakdown: PriceLine[] }
  rooms: { id: number; code: string; available: boolean }[]
}

export interface AvailabilityResult {
  start: string
  end: string
  groups: AvailabilityGroup[]
  suggestions: { start: string; end: string }[]
}

export interface MapRoom {
  id: number
  code: string
  type: string
  capacity: number
  posX: number
  posY: number
  width: number
  height: number
  status: LiveRoomStatus
  holdExpiresAt: string | null
}

export interface RoomMapSnapshot {
  branch: Pick<Branch, 'id' | 'name' | 'mapWidth' | 'mapHeight'>
  rooms: MapRoom[]
  serverTime: string
}

export type RoomEventType =
  | 'HOLD'
  | 'RELEASED'
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'EXTENDED'
  | 'MAINTENANCE_CHANGED'

/** Payload WebSocket `/topic/branches/{branchId}/rooms`. */
export interface RoomStatusEvent {
  branchId: number
  roomId: number
  event: RoomEventType
  status: LiveRoomStatus
  from: string | null
  to: string | null
  holdExpiresAt: string | null
  at: string
}

export interface PriceRule {
  id?: number
  roomTypeId: number
  dayType: DayType
  startHour: string // "09:00"
  endHour: string // "17:00"; nhỏ hơn startHour = qua đêm
  pricePerHour: number
}

export interface PriceTable {
  roomTypes: { roomType: Pick<RoomType, 'id' | 'name' | 'capacity'>; rules: PriceRule[] }[]
}

export interface Holiday {
  date: string // "2026-01-01"
  name: string
}

export interface MenuItem {
  id: number
  name: string
  category: MenuCategory
  price: number
  image: string | null
  available: boolean
}

// ---------- Đặt phòng ----------

export interface BookingItem {
  id: number
  menuItemId: number
  name: string
  quantity: number
  unitPrice: number
  amount: number
  preordered: boolean
  createdAt: string
}

export interface BookingActions {
  canCancel: boolean
  refundPercent: number
  canReview: boolean
  canPay: boolean
  canContinue: boolean
}

export interface Booking {
  id: number
  code: string
  status: BookingStatus
  branch: Pick<Branch, 'id' | 'name' | 'address' | 'phone'>
  room: { id: number; code: string; type: string; capacity: number }
  customer: { id: number | null; name: string; phone: string; email: string | null }
  startTime: string
  endTime: string
  people: number
  holdExpiresAt: string | null
  items: BookingItem[]
  priceBreakdown: PriceLine[]
  roomAmount: number
  fnbAmount: number
  discount: number
  total: number
  voucherCode: string | null
  paymentMethod: PaymentMethod | null
  paidAmount: number
  cancelReason: string | null
  checkedInAt: string | null
  checkedOutAt: string | null
  createdAt: string
  actions: BookingActions
  review: { rating: number; comment: string } | null
  serverTime: string
}

export interface HoldRequest {
  roomId: number
  startTime: string
  hours: number
  people: number
}

export interface ConfirmRequest {
  paymentMethod: PaymentMethod
  voucherCode?: string
}

export interface ConfirmResult {
  id: number
  code: string
  status: BookingStatus
  total: number
  paymentUrl?: string
  paymentExpiresAt?: string
}

export interface CancelResult {
  id: number
  status: BookingStatus
  refundPercent: number
  refundAmount: number
}

export interface VoucherValidation {
  code: string
  type: VoucherType
  value: number
  subtotal: number
  discount: number
  totalAfterDiscount: number
}

export interface VnpayReturn {
  bookingId: number
  bookingCode: string
  bookingStatus: BookingStatus
  responseCode: string
  amount: number
}

export interface Review {
  id: number
  bookingId: number
  rating: number
  comment: string
  customerName: string
  createdAt: string
}

// ---------- Nhân viên ----------

export interface TimelineBooking {
  id: number
  code: string
  status: BookingStatus
  start: string
  end: string
  customerName: string
  phone: string
  paymentMethod: PaymentMethod | null
  people: number
}

export interface Timeline {
  date: string
  branch: Pick<Branch, 'id' | 'name' | 'openTime' | 'closeTime'>
  rooms: {
    id: number
    code: string
    type: string
    capacity: number
    status: RoomStatus
    bookings: TimelineBooking[]
  }[]
}

export interface WalkInRequest {
  roomId: number
  hours: number
  people: number
  guestName: string
  guestPhone: string
  items: { menuItemId: number; quantity: number }[]
}

export interface ExtendOptions {
  maxMinutes: number
  options: { minutes: number; newEnd: string; amount: number }[]
}

export interface Invoice {
  type: 'DRAFT' | 'FINAL'
  code: string
  branch: Pick<Branch, 'name' | 'address' | 'phone'>
  room: string
  customer: string
  startTime: string
  endTime: string
  checkedInAt: string | null
  checkedOutAt: string | null
  roomLines: PriceLine[]
  itemLines: {
    name: string
    quantity: number
    unitPrice: number
    amount: number
    preordered: boolean
  }[]
  subtotal: number
  discount: number
  voucherCode: string | null
  total: number
  payments: { method: PaymentMethod; amount: number }[]
  paidBefore: number
  due: number
  staffName: string
  printedAt: string
}

export interface CheckoutResult {
  status: BookingStatus
  total: number
  paidBefore: number
  collected: number
  receivedAmount: number
  change: number
}

// ---------- Admin ----------

export interface User {
  id: number
  email: string
  fullName: string
  phone: string
  role: Role
  branchId: number | null
  branchName: string | null
  enabled: boolean
  createdAt: string
}

export interface Voucher {
  id: number
  code: string
  type: VoucherType
  value: number
  maxDiscount: number | null
  minOrder: number
  startAt: string
  endAt: string
  usageLimit: number
  usedCount: number
}

export interface StatsSummary {
  revenue: number
  bookings: number
  completedBookings: number
  cancelledBookings: number
  occupancyRate: number
  avgTicket: number
}

export interface RevenuePoint {
  period: string
  amount: number
}

export interface Occupancy {
  rate: number
  byHour: { hour: number; rate: number }[]
}

export interface TopRoom {
  roomId: number
  code: string
  type: string
  branchName: string
  bookings: number
  revenue: number
}

export interface TopItem {
  menuItemId: number
  name: string
  category: MenuCategory
  quantity: number
  revenue: number
}

export interface StatsFilter {
  from: string
  to: string
  branchId?: number
}
