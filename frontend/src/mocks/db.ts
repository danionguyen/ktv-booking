import type { Role } from '@/types/auth'
import type {
  BookingStatus,
  Branch,
  Holiday,
  MenuItem,
  PaymentMethod,
  PriceRule,
  RoomStatus,
  RoomType,
  Voucher,
} from '@/types/domain'
import { createSeed } from './seed'

// Bản ghi trong DB mock — gần với bảng trong docs/02-architecture.md
export interface DbUser {
  id: number
  email: string
  password: string
  fullName: string
  phone: string
  role: Role
  branchId: number | null
  enabled: boolean
  createdAt: string
}

export type DbBranch = Omit<Branch, 'roomCount' | 'roomTypeCount'>

export interface DbRoom {
  id: number
  branchId: number
  roomTypeId: number
  code: string
  status: RoomStatus
  posX: number
  posY: number
  width: number
  height: number
  images: string[]
}

export interface DbBooking {
  id: number
  code: string
  userId: number | null
  guestName: string | null
  guestPhone: string | null
  roomId: number
  startTime: string
  endTime: string
  people: number
  status: BookingStatus
  holdExpiresAt: string | null
  roomAmount: number
  discount: number
  voucherId: number | null
  paymentMethod: PaymentMethod | null
  cancelReason: string | null
  checkedInAt: string | null
  checkedOutAt: string | null
  staffId: number | null
  createdAt: string
}

export interface DbBookingItem {
  id: number
  bookingId: number
  menuItemId: number
  quantity: number
  unitPrice: number
  preordered: boolean
  createdAt: string
}

export interface DbPayment {
  id: number
  bookingId: number
  method: PaymentMethod
  amount: number
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUND_PENDING'
  txnRef: string
  paidAt: string | null
}

export interface DbReview {
  id: number
  bookingId: number
  rating: number
  comment: string
  createdAt: string
}

export interface MockDb {
  version: number
  users: DbUser[]
  branches: DbBranch[]
  roomTypes: RoomType[]
  rooms: DbRoom[]
  priceRules: Required<PriceRule>[]
  holidays: Holiday[]
  menuItems: MenuItem[]
  vouchers: Voucher[]
  bookings: DbBooking[]
  bookingItems: DbBookingItem[]
  payments: DbPayment[]
  reviews: DbReview[]
  resetTokens: Record<string, number>
}

const STORAGE_KEY = 'ktv-mock-db'
const DB_VERSION = 2 // tăng khi đổi seed → dữ liệu cũ trong localStorage tự tạo lại

let cache: MockDb | null = null

function read(): MockDb | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const db = JSON.parse(raw) as MockDb
    return db.version === DB_VERSION ? db : null
  } catch {
    return null
  }
}

/** DB mock dùng chung giữa các tab: lưu ở localStorage, tab khác ghi thì nạp lại. */
export function getDb(): MockDb {
  if (!cache) {
    cache = read() ?? createSeed(DB_VERSION)
    save()
  }
  return cache
}

export function save() {
  if (!cache) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
  } catch {
    // localStorage đầy hoặc bị chặn — vẫn chạy được trong bộ nhớ
  }
}

export function resetDb() {
  cache = createSeed(DB_VERSION)
  save()
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) cache = null
  })
}

export function nextId(rows: { id: number }[]): number {
  return rows.reduce((max, r) => Math.max(max, r.id), 0) + 1
}
