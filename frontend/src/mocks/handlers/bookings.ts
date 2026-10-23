import { http } from 'msw'
import type { ConfirmRequest, HoldRequest, MyBookingGroup } from '@/types/domain'
import { toApiTime, validateBookingWindow, vn } from '@utils/time'
import { getDb, nextId, type DbBooking } from '../db'
import { api, fail, notFound, num, ok, readBody, requireUser, route } from '../http'
import {
  actionsFor,
  applyVoucher,
  branchOf,
  fnbOf,
  HOLD_MIN,
  isFree,
  MAX_HOLDS,
  markVoucherUsed,
  nextCode,
  PAYMENT_MIN,
  quoteRoom,
  refundPercentFor,
  releaseVoucher,
  roomEvent,
  toBooking,
  totalOf,
  typeOf,
} from '../logic'
import { roundTo1000 } from '../pricing'
import { publish } from '../realtime'

const GROUP_STATUSES: Record<MyBookingGroup, DbBooking['status'][]> = {
  UPCOMING: ['HOLD', 'PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN'],
  DONE: ['COMPLETED'],
  CANCELLED: ['CANCELLED', 'EXPIRED'],
}

function ownBooking(request: Request, id: number) {
  const user = requireUser(request, ['CUSTOMER', 'ADMIN'])
  const b = getDb().bookings.find((x) => x.id === id) ?? notFound('Không tìm thấy đơn đặt phòng')
  if (user.role !== 'ADMIN' && b.userId !== user.id)
    fail(403, 'FORBIDDEN', 'Đây không phải đơn của bạn')
  return { user, b }
}

function assertActiveHold(b: DbBooking) {
  if (b.status !== 'HOLD' || !b.holdExpiresAt || vn(b.holdExpiresAt).isBefore(vn())) {
    fail(410, 'HOLD_EXPIRED', 'Giữ chỗ đã hết hạn, vui lòng chọn lại phòng')
  }
}

/** URL "cổng VNPay" giả lập — trang /mock-vnpay trong chính app. */
const paymentUrlOf = (b: DbBooking, amount: number) =>
  `/mock-vnpay?txnRef=VNP${b.id}-${Date.now().toString(36)}&bookingId=${b.id}&amount=${amount}&code=${b.code}`

export const bookingHandlers = [
  // FD-BKG-01: giữ chỗ 10 phút
  http.post(
    api('/bookings/hold'),
    route(async ({ request }) => {
      const user = requireUser(request, ['CUSTOMER'])
      const body = await readBody<HoldRequest>(request)
      const db = getDb()
      const now = vn()
      const room =
        db.rooms.find((r) => r.id === body.roomId && r.status === 'ACTIVE') ??
        notFound('Phòng không tồn tại hoặc đang bảo trì')
      const type = typeOf(db, room.roomTypeId)
      const start = vn(body.startTime)
      const end = start.add(body.hours * 60, 'minute')
      const error = validateBookingWindow(start, body.hours, branchOf(db, room.branchId), now)
      if (error) fail(400, 'VALIDATION_ERROR', error)
      if (body.people < 1 || body.people > type.capacity) {
        fail(400, 'VALIDATION_ERROR', `Phòng ${type.name} chứa tối đa ${type.capacity} người`)
      }
      const activeHolds = db.bookings.filter(
        (b) =>
          b.userId === user.id &&
          (b.status === 'HOLD' || b.status === 'PENDING_PAYMENT') &&
          b.holdExpiresAt &&
          vn(b.holdExpiresAt).isAfter(now),
      )
      if (activeHolds.length >= MAX_HOLDS) {
        fail(
          409,
          'HOLD_LIMIT_EXCEEDED',
          'Bạn đang giữ tối đa 2 phòng. Hãy hoàn tất hoặc bỏ giữ chỗ trước.',
        )
      }
      if (!isFree(db, room.id, start, end)) {
        fail(409, 'ROOM_NOT_AVAILABLE', 'Phòng vừa có người giữ hoặc đặt, vui lòng chọn phòng khác')
      }
      const q = quoteRoom(db, room, start, end)
      const booking: DbBooking = {
        id: nextId(db.bookings),
        code: nextCode(db, start),
        userId: user.id,
        guestName: null,
        guestPhone: null,
        roomId: room.id,
        startTime: toApiTime(start),
        endTime: toApiTime(end),
        people: body.people,
        status: 'HOLD',
        holdExpiresAt: toApiTime(now.add(HOLD_MIN, 'minute')),
        roomAmount: q.total,
        discount: 0,
        voucherId: null,
        paymentMethod: null,
        cancelReason: null,
        checkedInAt: null,
        checkedOutAt: null,
        staffId: null,
        createdAt: toApiTime(now),
      }
      db.bookings.push(booking)
      publish(roomEvent(db, booking, 'HOLD'))
      return ok(toBooking(db, booking), 201)
    }),
  ),

  // FD-BKG-02: bỏ giữ chỗ
  http.delete(
    api('/bookings/:id/hold'),
    route(({ request, params }) => {
      const { b } = ownBooking(request, num(params.id))
      const db = getDb()
      if (b.status !== 'HOLD' && b.status !== 'PENDING_PAYMENT') {
        fail(422, 'INVALID_STATE', 'Đơn không ở trạng thái giữ chỗ')
      }
      b.status = 'EXPIRED'
      b.holdExpiresAt = null
      publish(roomEvent(db, b, 'RELEASED'))
      return ok(toBooking(db, b))
    }),
  ),

  // FD-BKG-04: đặt trước đồ ăn uống — thay thế toàn bộ
  http.put(
    api('/bookings/:id/items'),
    route(async ({ request, params }) => {
      const { b } = ownBooking(request, num(params.id))
      assertActiveHold(b)
      const { items } = await readBody<{ items: { menuItemId: number; quantity: number }[] }>(
        request,
      )
      const db = getDb()
      db.bookingItems = db.bookingItems.filter((i) => i.bookingId !== b.id)
      for (const { menuItemId, quantity } of items.filter((i) => i.quantity > 0)) {
        const menu = db.menuItems.find((m) => m.id === menuItemId && m.available)
        if (!menu) fail(422, 'ITEM_UNAVAILABLE', 'Có món đã ngừng bán, vui lòng chọn lại')
        db.bookingItems.push({
          id: nextId(db.bookingItems),
          bookingId: b.id,
          menuItemId,
          quantity,
          unitPrice: menu.price,
          preordered: true,
          createdAt: toApiTime(vn()),
        })
      }
      // Voucher đã áp có thể không còn đủ điều kiện khi tổng đổi — tính lại ở bước confirm
      b.discount = 0
      b.voucherId = null
      return ok(toBooking(db, b))
    }),
  ),

  // FD-BKG-05: xác nhận + chọn phương thức thanh toán
  http.post(
    api('/bookings/:id/confirm'),
    route(async ({ request, params }) => {
      const { b } = ownBooking(request, num(params.id))
      assertActiveHold(b)
      const body = await readBody<ConfirmRequest>(request)
      if (body.paymentMethod !== 'CASH' && body.paymentMethod !== 'VNPAY') {
        fail(400, 'VALIDATION_ERROR', 'Phương thức thanh toán không hợp lệ')
      }
      const db = getDb()
      const subtotal = b.roomAmount + fnbOf(db, b.id)
      if (body.voucherCode) {
        const { voucher, discount } = applyVoucher(db, body.voucherCode, subtotal)
        b.voucherId = voucher.id
        b.discount = discount
      } else {
        b.voucherId = null
        b.discount = 0
      }
      const total = totalOf(db, b)
      b.paymentMethod = body.paymentMethod
      if (body.paymentMethod === 'CASH') {
        b.status = 'CONFIRMED'
        b.holdExpiresAt = null
        markVoucherUsed(db, b.voucherId)
        publish(roomEvent(db, b, 'CONFIRMED'))
        return ok({ id: b.id, code: b.code, status: b.status, total })
      }
      b.status = 'PENDING_PAYMENT'
      b.holdExpiresAt = toApiTime(vn().add(PAYMENT_MIN, 'minute'))
      publish(roomEvent(db, b, 'PENDING_PAYMENT'))
      return ok({
        id: b.id,
        code: b.code,
        status: b.status,
        total,
        paymentUrl: paymentUrlOf(b, total),
        paymentExpiresAt: b.holdExpiresAt,
      })
    }),
  ),

  http.get(
    api('/bookings/me'),
    route(({ request }) => {
      const user = requireUser(request, ['CUSTOMER'])
      const db = getDb()
      const url = new URL(request.url)
      const group = (url.searchParams.get('group') ?? 'UPCOMING') as MyBookingGroup
      const page = Number(url.searchParams.get('page') ?? 0)
      const size = Number(url.searchParams.get('size') ?? 10)
      const statuses = GROUP_STATUSES[group] ?? GROUP_STATUSES.UPCOMING
      const rows = db.bookings
        .filter((b) => b.userId === user.id && statuses.includes(b.status))
        .sort((x, y) =>
          group === 'UPCOMING'
            ? x.startTime.localeCompare(y.startTime)
            : y.startTime.localeCompare(x.startTime),
        )
      return ok({
        items: rows.slice(page * size, page * size + size).map((b) => toBooking(db, b)),
        page,
        size,
        total: rows.length,
      })
    }),
  ),

  http.get(
    api('/bookings/:id'),
    route(({ request, params }) => {
      const { b } = ownBooking(request, num(params.id))
      return ok(toBooking(getDb(), b))
    }),
  ),

  // FD-BKG-07: hủy theo chính sách mục 4.6
  http.post(
    api('/bookings/:id/cancel'),
    route(async ({ request, params }) => {
      const { b } = ownBooking(request, num(params.id))
      const { reason } = await readBody<{ reason?: string }>(request)
      const db = getDb()
      const now = vn()
      if (b.status !== 'CONFIRMED' && b.status !== 'PENDING_PAYMENT') {
        fail(422, 'INVALID_STATE', 'Không thể hủy đơn ở trạng thái hiện tại')
      }
      if (!actionsFor(db, b, now).canCancel) {
        fail(
          422,
          'CANCEL_NOT_ALLOWED',
          'Còn dưới 2 giờ trước giờ hát — vui lòng liên hệ quầy để hủy',
        )
      }
      const percent = refundPercentFor(b, now)
      const paid = db.payments
        .filter((p) => p.bookingId === b.id && p.status === 'SUCCESS')
        .reduce((s, p) => s + p.amount, 0)
      const refundAmount = roundTo1000((paid * percent) / 100)
      if (refundAmount > 0) {
        // BR-50: chỉ ghi nhận hoàn tiền
        db.payments.push({
          id: nextId(db.payments),
          bookingId: b.id,
          method: 'VNPAY',
          amount: -refundAmount,
          status: 'REFUND_PENDING',
          txnRef: `REFUND${b.id}`,
          paidAt: null,
        })
      }
      if (b.voucherId && b.status === 'CONFIRMED') releaseVoucher(db, b.voucherId)
      b.status = 'CANCELLED'
      b.holdExpiresAt = null
      b.cancelReason = reason?.trim() || 'Khách hủy'
      publish(roomEvent(db, b, 'CANCELLED'))
      return ok({ id: b.id, status: b.status, refundPercent: paid > 0 ? percent : 0, refundAmount })
    }),
  ),

  // FD-VCH-01
  http.post(
    api('/vouchers/validate'),
    route(async ({ request }) => {
      const { code, bookingId } = await readBody<{ code: string; bookingId: number }>(request)
      const { b } = ownBooking(request, bookingId)
      const db = getDb()
      const subtotal = b.roomAmount + fnbOf(db, b.id)
      const { voucher, discount } = applyVoucher(db, code, subtotal)
      return ok({
        code: voucher.code,
        type: voucher.type,
        value: voucher.value,
        subtotal,
        discount,
        totalAfterDiscount: roundTo1000(subtotal - discount),
      })
    }),
  ),

  // FD-PAY-01: thanh toán lại đơn PENDING_PAYMENT
  http.post(
    api('/payments/vnpay/create'),
    route(async ({ request }) => {
      const { bookingId } = await readBody<{ bookingId: number }>(request)
      const { b } = ownBooking(request, bookingId)
      const db = getDb()
      if (!actionsFor(db, b, vn()).canPay)
        fail(422, 'INVALID_STATE', 'Đơn không còn chờ thanh toán')
      return ok({ paymentUrl: paymentUrlOf(b, totalOf(db, b)), paymentExpiresAt: b.holdExpiresAt })
    }),
  ),

  // FD-PAY-01/02: trang return — mock gộp luôn bước IPN (idempotent theo txnRef)
  http.get(
    api('/payments/vnpay/return'),
    route(({ request }) => {
      const url = new URL(request.url)
      const txnRef = url.searchParams.get('vnp_TxnRef') ?? ''
      const responseCode = url.searchParams.get('vnp_ResponseCode') ?? '99'
      const amount = Number(url.searchParams.get('vnp_Amount') ?? 0) / 100
      const bookingId = Number(txnRef.match(/^VNP(\d+)/)?.[1])
      const db = getDb()
      const b = db.bookings.find((x) => x.id === bookingId)
      if (!b) fail(400, 'INVALID_SIGNATURE', 'Giao dịch không hợp lệ')
      const already = db.payments.find((p) => p.txnRef === txnRef)
      if (!already && b.status === 'PENDING_PAYMENT') {
        const success = responseCode === '00'
        db.payments.push({
          id: nextId(db.payments),
          bookingId: b.id,
          method: 'VNPAY',
          amount,
          status: success ? 'SUCCESS' : 'FAILED',
          txnRef,
          paidAt: success ? toApiTime(vn()) : null,
        })
        b.holdExpiresAt = null
        if (success) {
          b.status = 'CONFIRMED'
          markVoucherUsed(db, b.voucherId)
          publish(roomEvent(db, b, 'CONFIRMED'))
        } else {
          b.status = 'EXPIRED'
          publish(roomEvent(db, b, 'RELEASED'))
        }
      }
      return ok({
        bookingId: b.id,
        bookingCode: b.code,
        bookingStatus: b.status,
        responseCode,
        amount,
      })
    }),
  ),

  // FD-REV-01
  http.post(
    api('/reviews'),
    route(async ({ request }) => {
      const body = await readBody<{ bookingId: number; rating: number; comment: string }>(request)
      const { b } = ownBooking(request, body.bookingId)
      const db = getDb()
      if (db.reviews.some((r) => r.bookingId === b.id))
        fail(409, 'REVIEW_NOT_ALLOWED', 'Đơn này đã được đánh giá')
      if (!actionsFor(db, b, vn()).canReview) {
        fail(422, 'REVIEW_NOT_ALLOWED', 'Chỉ đánh giá được đơn đã hoàn thành trong vòng 7 ngày')
      }
      if (body.rating < 1 || body.rating > 5)
        fail(400, 'VALIDATION_ERROR', 'Điểm đánh giá từ 1 đến 5')
      const review = {
        id: nextId(db.reviews),
        bookingId: b.id,
        rating: body.rating,
        comment: body.comment?.trim() ?? '',
        createdAt: toApiTime(vn()),
      }
      db.reviews.push(review)
      return ok(review, 201)
    }),
  ),
]
