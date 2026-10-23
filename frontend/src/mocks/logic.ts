import type { Dayjs } from 'dayjs'
import type {
  Booking,
  BookingActions,
  Invoice,
  LiveRoomStatus,
  RoomEventType,
  RoomStatusEvent,
} from '@/types/domain'
import { BLOCKING_STATUSES } from '@utils/booking'
import { toApiTime, vn } from '@utils/time'
import type { DbBooking, DbRoom, MockDb } from './db'
import { fail } from './http'
import { PriceNotConfiguredError, quote, roundTo1000 } from './pricing'

export const BUFFER_MIN = 15 // BR-06
export const HOLD_MIN = 10 // BR-10
export const PAYMENT_MIN = 15 // BR-44
export const MAX_HOLDS = 2 // BR-07

// ---------- Tra cứu ----------

export const roomOf = (db: MockDb, id: number) => db.rooms.find((r) => r.id === id)
export const typeOf = (db: MockDb, id: number) => db.roomTypes.find((t) => t.id === id)!
export const branchOf = (db: MockDb, id: number) => db.branches.find((b) => b.id === id)!

export function quoteRoom(db: MockDb, room: DbRoom, start: Dayjs, end: Dayjs) {
  try {
    return quote(
      db.priceRules.filter((r) => r.roomTypeId === room.roomTypeId),
      db.holidays,
      start,
      end,
    )
  } catch (e) {
    if (e instanceof PriceNotConfiguredError) return fail(422, 'PRICE_NOT_CONFIGURED', e.message)
    throw e
  }
}

export function fnbOf(db: MockDb, bookingId: number) {
  return db.bookingItems
    .filter((i) => i.bookingId === bookingId)
    .reduce((s, i) => s + i.quantity * i.unitPrice, 0)
}

export function paidOf(db: MockDb, bookingId: number) {
  return db.payments
    .filter(
      (p) => p.bookingId === bookingId && (p.status === 'SUCCESS' || p.status === 'REFUND_PENDING'),
    )
    .reduce((s, p) => s + p.amount, 0)
}

export function totalOf(db: MockDb, b: DbBooking) {
  return roundTo1000(b.roomAmount + fnbOf(db, b.id) - b.discount)
}

// ---------- Chống trùng lịch (BR-05, BR-06) ----------

export function isBlocking(b: DbBooking, now: Dayjs) {
  if (!BLOCKING_STATUSES.includes(b.status)) return false
  // HOLD quá hạn nhưng job chưa chạy vẫn coi là bận (FD-ROM-02)
  return !(b.holdExpiresAt && b.status === 'HOLD' && vn(b.holdExpiresAt).add(30, 's').isBefore(now))
}

/** Khoảng chặn = [start, end + 15'), giống exclusion constraint ở DB. */
export function overlaps(b: DbBooking, start: Dayjs, end: Dayjs) {
  const bs = vn(b.startTime)
  const be = vn(b.endTime).add(BUFFER_MIN, 'minute')
  return bs.isBefore(end.add(BUFFER_MIN, 'minute')) && start.isBefore(be)
}

export function conflicts(
  db: MockDb,
  roomId: number,
  start: Dayjs,
  end: Dayjs,
  excludeId?: number,
) {
  const now = vn()
  return db.bookings.filter(
    (b) =>
      b.roomId === roomId && b.id !== excludeId && isBlocking(b, now) && overlaps(b, start, end),
  )
}

export function isFree(db: MockDb, roomId: number, start: Dayjs, end: Dayjs, excludeId?: number) {
  return conflicts(db, roomId, start, end, excludeId).length === 0
}

/** Trạng thái phòng trên sơ đồ trong khoảng [start, end). */
export function liveStatus(
  db: MockDb,
  room: DbRoom,
  start: Dayjs,
  end: Dayjs,
): { status: LiveRoomStatus; holdExpiresAt: string | null } {
  if (room.status === 'MAINTENANCE') return { status: 'MAINTENANCE', holdExpiresAt: null }
  const now = vn()
  const hits = db.bookings.filter(
    (b) =>
      b.roomId === room.id &&
      isBlocking(b, now) &&
      vn(b.startTime).isBefore(end) &&
      start.isBefore(vn(b.endTime)),
  )
  const find = (...s: DbBooking['status'][]) => hits.find((b) => s.includes(b.status))
  const inUse = find('CHECKED_IN')
  if (inUse) return { status: 'IN_USE', holdExpiresAt: null }
  const booked = find('CONFIRMED')
  if (booked) return { status: 'BOOKED', holdExpiresAt: null }
  const held = find('HOLD', 'PENDING_PAYMENT')
  if (held) return { status: 'HELD', holdExpiresAt: held.holdExpiresAt }
  // Buffer dọn phòng: vướng 15' sau một lượt khác
  if (!isFree(db, room.id, start, end)) return { status: 'CLEANING', holdExpiresAt: null }
  const justOut = db.bookings.find(
    (b) =>
      b.roomId === room.id &&
      b.status === 'COMPLETED' &&
      b.checkedOutAt &&
      vn(b.checkedOutAt).add(BUFFER_MIN, 'minute').isAfter(start) &&
      !vn(b.checkedOutAt).isAfter(start),
  )
  if (justOut) return { status: 'CLEANING', holdExpiresAt: null }
  return { status: 'AVAILABLE', holdExpiresAt: null }
}

export function roomEvent(db: MockDb, b: DbBooking, event: RoomEventType): RoomStatusEvent {
  const room = roomOf(db, b.roomId)!
  const { status } = liveStatus(db, room, vn(b.startTime), vn(b.endTime))
  return {
    branchId: room.branchId,
    roomId: room.id,
    event,
    status,
    from: b.startTime,
    to: b.endTime,
    holdExpiresAt: b.holdExpiresAt,
    at: toApiTime(vn()),
  }
}

// ---------- Job nền (BKG-03, BKG-08, PAY) ----------

/** Như các @Scheduled job: hết hạn HOLD / PENDING_PAYMENT, hủy no-show đơn trả tại quầy. */
export function sweep(db: MockDb): RoomStatusEvent[] {
  const now = vn()
  const events: RoomStatusEvent[] = []
  for (const b of db.bookings) {
    if (
      (b.status === 'HOLD' || b.status === 'PENDING_PAYMENT') &&
      b.holdExpiresAt &&
      vn(b.holdExpiresAt).isBefore(now)
    ) {
      b.status = 'EXPIRED'
      b.holdExpiresAt = null
      events.push(roomEvent(db, b, 'RELEASED'))
    } else if (
      b.status === 'CONFIRMED' &&
      b.paymentMethod === 'CASH' &&
      vn(b.startTime).add(15, 'minute').isBefore(now)
    ) {
      b.status = 'CANCELLED'
      b.cancelReason = 'No-show: không check-in sau 15 phút'
      if (b.voucherId) releaseVoucher(db, b.voucherId)
      events.push(roomEvent(db, b, 'CANCELLED'))
    }
  }
  return events
}

// ---------- Voucher (FD-VCH-01) ----------

export function applyVoucher(db: MockDb, code: string, subtotal: number) {
  const now = vn()
  const voucher = db.vouchers.find((v) => v.code.toUpperCase() === code.trim().toUpperCase())
  const invalid = (reason: string, message: string, extra?: Record<string, unknown>) =>
    fail(422, 'VOUCHER_INVALID', message, { reason, ...extra })
  if (!voucher) return invalid('NOT_FOUND', 'Mã voucher không tồn tại')
  if (vn(voucher.startAt).isAfter(now))
    return invalid('NOT_STARTED', 'Voucher chưa đến thời gian áp dụng')
  if (vn(voucher.endAt).isBefore(now)) return invalid('EXPIRED', 'Voucher đã hết hạn')
  if (voucher.usedCount >= voucher.usageLimit)
    return invalid('USAGE_LIMIT', 'Voucher đã hết lượt sử dụng')
  if (subtotal < voucher.minOrder)
    return invalid('MIN_ORDER', 'Đơn hàng chưa đạt giá trị tối thiểu', {
      minOrder: voucher.minOrder,
    })
  const raw = voucher.type === 'PERCENT' ? (subtotal * voucher.value) / 100 : voucher.value
  const discount = roundTo1000(Math.min(raw, voucher.maxDiscount ?? Infinity, subtotal))
  return { voucher, discount }
}

export function releaseVoucher(db: MockDb, voucherId: number) {
  const v = db.vouchers.find((x) => x.id === voucherId)
  if (v && v.usedCount > 0) v.usedCount -= 1
}

export function markVoucherUsed(db: MockDb, voucherId: number | null) {
  const v = db.vouchers.find((x) => x.id === voucherId)
  if (v) v.usedCount += 1
}

// ---------- Mã đơn ----------

export function nextCode(db: MockDb, start: Dayjs) {
  const prefix = `KTV-${start.format('YYYYMMDD')}-`
  const seq = db.bookings.filter((b) => b.code.startsWith(prefix)).length + 1
  return `${prefix}${String(seq).padStart(4, '0')}`
}

// ---------- Chính sách (BookingPolicy) ----------

/** Bảng hoàn tiền mục 4.6: ≥24h → 100%, 2–24h → 50%, <2h → không hủy online. */
export function refundPercentFor(b: DbBooking, now: Dayjs) {
  const hoursLeft = vn(b.startTime).diff(now, 'minute') / 60
  if (hoursLeft >= 24) return 100
  if (hoursLeft >= 2) return 50
  return 0
}

export function actionsFor(db: MockDb, b: DbBooking, now: Dayjs): BookingActions {
  const hoursLeft = vn(b.startTime).diff(now, 'minute') / 60
  const canCancel = (b.status === 'CONFIRMED' || b.status === 'PENDING_PAYMENT') && hoursLeft >= 2
  const doneAt = b.checkedOutAt ?? b.endTime
  return {
    canCancel,
    refundPercent: canCancel ? refundPercentFor(b, now) : 0,
    canReview:
      b.status === 'COMPLETED' &&
      !!b.userId &&
      !db.reviews.some((r) => r.bookingId === b.id) &&
      now.diff(vn(doneAt), 'day', true) <= 7,
    canPay: b.status === 'PENDING_PAYMENT' && !!b.holdExpiresAt && vn(b.holdExpiresAt).isAfter(now),
    canContinue: b.status === 'HOLD' && !!b.holdExpiresAt && vn(b.holdExpiresAt).isAfter(now),
  }
}

// ---------- Serialize ----------

export function toBooking(db: MockDb, b: DbBooking): Booking {
  const now = vn()
  const room = roomOf(db, b.roomId)!
  const type = typeOf(db, room.roomTypeId)
  const branch = branchOf(db, room.branchId)
  const user = b.userId ? db.users.find((u) => u.id === b.userId) : undefined
  const items = db.bookingItems
    .filter((i) => i.bookingId === b.id)
    .map((i) => ({
      id: i.id,
      menuItemId: i.menuItemId,
      name: db.menuItems.find((m) => m.id === i.menuItemId)?.name ?? 'Món đã xóa',
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      amount: i.quantity * i.unitPrice,
      preordered: i.preordered,
      createdAt: i.createdAt,
    }))
  const review = db.reviews.find((r) => r.bookingId === b.id)
  const fnbAmount = items.reduce((s, i) => s + i.amount, 0)
  let priceBreakdown: Booking['priceBreakdown'] = []
  try {
    priceBreakdown = quote(
      db.priceRules.filter((r) => r.roomTypeId === room.roomTypeId),
      db.holidays,
      vn(b.startTime),
      vn(b.endTime),
    ).breakdown
  } catch {
    // Bảng giá đã bị admin sửa — đơn cũ vẫn giữ roomAmount đã chốt (BR-24)
  }
  return {
    id: b.id,
    code: b.code,
    status: b.status,
    branch: { id: branch.id, name: branch.name, address: branch.address, phone: branch.phone },
    room: { id: room.id, code: room.code, type: type.name, capacity: type.capacity },
    customer: {
      id: user?.id ?? null,
      name: user?.fullName ?? b.guestName ?? 'Khách vãng lai',
      phone: user?.phone ?? b.guestPhone ?? '',
      email: user?.email ?? null,
    },
    startTime: b.startTime,
    endTime: b.endTime,
    people: b.people,
    holdExpiresAt: b.holdExpiresAt,
    items,
    priceBreakdown,
    roomAmount: b.roomAmount,
    fnbAmount,
    discount: b.discount,
    total: roundTo1000(b.roomAmount + fnbAmount - b.discount),
    voucherCode: db.vouchers.find((v) => v.id === b.voucherId)?.code ?? null,
    paymentMethod: b.paymentMethod,
    paidAmount: paidOf(db, b.id),
    cancelReason: b.cancelReason,
    checkedInAt: b.checkedInAt,
    checkedOutAt: b.checkedOutAt,
    createdAt: b.createdAt,
    actions: actionsFor(db, b, now),
    review: review ? { rating: review.rating, comment: review.comment } : null,
    serverTime: toApiTime(now),
  }
}

export function toInvoice(db: MockDb, b: DbBooking, staffName: string): Invoice {
  const booking = toBooking(db, b)
  const subtotal = booking.roomAmount + booking.fnbAmount
  const succeeded = db.payments.filter((p) => p.bookingId === b.id && p.status === 'SUCCESS')
  const payments = succeeded.map((p) => ({ method: p.method, amount: p.amount }))
  const paidAll = succeeded.reduce((s, p) => s + p.amount, 0)
  // Khoản thu lúc check-out có txnRef "CASH…"; còn lại là trả trước (VNPay)
  const paidBefore = succeeded
    .filter((p) => !p.txnRef.startsWith('CASH'))
    .reduce((s, p) => s + p.amount, 0)
  return {
    type: b.status === 'COMPLETED' ? 'FINAL' : 'DRAFT',
    code: b.code,
    branch: {
      name: booking.branch.name,
      address: booking.branch.address,
      phone: booking.branch.phone,
    },
    room: `${booking.room.code} – ${booking.room.type}`,
    customer: booking.customer.name,
    startTime: b.startTime,
    endTime: b.endTime,
    checkedInAt: b.checkedInAt,
    checkedOutAt: b.checkedOutAt,
    roomLines: booking.priceBreakdown,
    itemLines: booking.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      amount: i.amount,
      preordered: i.preordered,
    })),
    subtotal,
    discount: booking.discount,
    voucherCode: booking.voucherCode,
    total: booking.total,
    payments,
    paidBefore,
    due: Math.max(0, booking.total - paidAll),
    staffName,
    printedAt: toApiTime(vn()),
  }
}
