import type {
  BookingStatus,
  DayType,
  LiveRoomStatus,
  MenuCategory,
  PaymentMethod,
  VoucherType,
} from '@/types/domain'
import type { Role } from '@/types/auth'
import type { TagColor } from '@components/Tag'

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  HOLD: 'Đang giữ chỗ',
  PENDING_PAYMENT: 'Chờ thanh toán',
  CONFIRMED: 'Đã xác nhận',
  CHECKED_IN: 'Đang hát',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  EXPIRED: 'Hết hạn',
}

/** Màu Tag trạng thái đơn (theo Figma: xác nhận = xanh, đang hát = vàng). */
export const BOOKING_STATUS_COLOR: Record<BookingStatus, TagColor> = {
  HOLD: 'orange',
  PENDING_PAYMENT: 'orange',
  CONFIRMED: 'blue',
  CHECKED_IN: 'gold',
  COMPLETED: 'green',
  CANCELLED: 'red',
  EXPIRED: 'gray',
}

/** Màu khối trên timeline nhân viên. */
export const BOOKING_BLOCK_CLASS: Record<BookingStatus, string> = {
  HOLD: 'bg-room-held-bg border-room-held text-room-held',
  PENDING_PAYMENT: 'bg-room-held-bg border-room-held text-room-held',
  CONFIRMED: 'bg-info-bg border-info text-info',
  CHECKED_IN: 'bg-secondary border-primary text-link',
  COMPLETED: 'bg-room-maintenance-bg border-room-maintenance text-muted-foreground',
  CANCELLED: 'bg-room-maintenance-bg border-room-maintenance/50 text-muted-foreground line-through',
  EXPIRED: 'bg-room-maintenance-bg border-room-maintenance/50 text-muted-foreground',
}

export const LIVE_STATUS_LABEL: Record<LiveRoomStatus, string> = {
  AVAILABLE: 'Trống',
  HELD: 'Đang giữ',
  BOOKED: 'Đã đặt',
  IN_USE: 'Đang hát',
  CLEANING: 'Đang dọn',
  MAINTENANCE: 'Bảo trì',
}

/** Nền + viền ô phòng (Figma Library › Room Tile) — token `room-*` trong index.css. */
export const LIVE_STATUS_CLASS: Record<LiveRoomStatus, string> = {
  AVAILABLE: 'bg-room-available-bg border-room-available',
  HELD: 'bg-room-held-bg border-room-held',
  BOOKED: 'bg-room-booked-bg border-room-booked',
  IN_USE: 'bg-room-booked-bg border-room-booked',
  CLEANING: 'bg-room-maintenance-bg border-dashed border-room-maintenance',
  MAINTENANCE: 'bg-room-maintenance-bg border-room-maintenance',
}

/** Màu tên phòng trên ô. */
export const LIVE_STATUS_TEXT: Record<LiveRoomStatus, string> = {
  AVAILABLE: 'text-room-available',
  HELD: 'text-room-held',
  BOOKED: 'text-room-booked',
  IN_USE: 'text-room-booked',
  CLEANING: 'text-room-maintenance',
  MAINTENANCE: 'text-room-maintenance',
}

export const LIVE_STATUS_DOT: Record<LiveRoomStatus, string> = {
  AVAILABLE: 'bg-room-available',
  HELD: 'bg-room-held',
  BOOKED: 'bg-room-booked',
  IN_USE: 'bg-room-booked',
  CLEANING: 'border border-dashed border-room-maintenance',
  MAINTENANCE: 'bg-room-maintenance',
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  VNPAY: 'VNPay',
  CASH: 'Tại quầy',
}

export const DAY_TYPE_LABEL: Record<DayType, string> = {
  WEEKDAY: 'Ngày thường (T2–T6)',
  WEEKEND: 'Cuối tuần (T7, CN)',
  HOLIDAY: 'Ngày lễ',
}

/** Nhãn ngắn trong dòng giá, vd. "3 giờ × 180.000đ (T2–T6, 17:00–02:00)". */
export const DAY_TYPE_SHORT: Record<DayType, string> = {
  WEEKDAY: 'T2–T6',
  WEEKEND: 'T7, CN',
  HOLIDAY: 'Ngày lễ',
}

export const MENU_CATEGORY_LABEL: Record<MenuCategory, string> = {
  FOOD: 'Đồ ăn',
  DRINK: 'Đồ uống',
  COMBO: 'Combo',
}

export const MENU_CATEGORY_COLOR: Record<MenuCategory, TagColor> = {
  FOOD: 'orange',
  DRINK: 'blue',
  COMBO: 'gold',
}

export const PAYMENT_METHOD_COLOR: Record<PaymentMethod, TagColor> = {
  VNPAY: 'blue',
  CASH: 'gray',
}

export const VOUCHER_TYPE_LABEL: Record<VoucherType, string> = {
  PERCENT: 'Phần trăm',
  FIXED: 'Số tiền cố định',
}

export const ROLE_LABEL: Record<Role, string> = {
  CUSTOMER: 'Khách hàng',
  STAFF: 'Nhân viên',
  ADMIN: 'Admin',
}

export const ROLE_COLOR: Record<Role, TagColor> = {
  CUSTOMER: 'gray',
  STAFF: 'blue',
  ADMIN: 'gold',
}

/** Trạng thái đơn đang chặn lịch phòng (BR-05). */
export const BLOCKING_STATUSES: BookingStatus[] = [
  'HOLD',
  'PENDING_PAYMENT',
  'CONFIRMED',
  'CHECKED_IN',
]

/** Thông báo cho mã lỗi API thường gặp (fallback khi message rỗng). */
export const VOUCHER_REASON_LABEL: Record<string, string> = {
  NOT_FOUND: 'Mã voucher không tồn tại',
  EXPIRED: 'Voucher đã hết hạn',
  NOT_STARTED: 'Voucher chưa đến thời gian áp dụng',
  USAGE_LIMIT: 'Voucher đã hết lượt sử dụng',
  MIN_ORDER: 'Đơn hàng chưa đạt giá trị tối thiểu',
}
