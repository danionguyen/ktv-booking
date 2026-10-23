import { http } from 'msw'
import type { Timeline, WalkInRequest } from '@/types/domain'
import { businessWindow, toApiTime, vn } from '@utils/time'
import { getDb, nextId, type DbBooking, type DbUser } from '../db'
import { api, fail, notFound, num, ok, readBody, requireUser, route } from '../http'
import {
  branchOf,
  isFree,
  nextCode,
  paidOf,
  quoteRoom,
  roomEvent,
  roomOf,
  toBooking,
  toInvoice,
  totalOf,
  typeOf,
} from '../logic'
import { publish } from '../realtime'

/** Nhân viên chỉ thấy chi nhánh được gán; admin chọn qua `branchId` (mặc định chi nhánh 1). */
function branchScope(user: DbUser, request: Request) {
  if (user.role === 'STAFF') return user.branchId!
  return Number(new URL(request.url).searchParams.get('branchId') ?? 1)
}

function staffBooking(request: Request, id: number) {
  const user = requireUser(request, ['STAFF', 'ADMIN'])
  const db = getDb()
  const b = db.bookings.find((x) => x.id === id) ?? notFound('Không tìm thấy đơn')
  if (user.role === 'STAFF' && roomOf(db, b.roomId)!.branchId !== user.branchId) {
    fail(403, 'FORBIDDEN', 'Đơn thuộc chi nhánh khác')
  }
  return { user, b, db }
}

/** Giờ đóng cửa của ngày kinh doanh chứa thời điểm `start` của đơn. */
function closingOf(b: DbBooking) {
  const db = getDb()
  const branch = branchOf(db, roomOf(db, b.roomId)!.branchId)
  const start = vn(b.startTime)
  const businessDate = start.format('HH:mm') < branch.openTime ? start.subtract(1, 'day') : start
  return businessWindow(businessDate.format('YYYY-MM-DD'), branch.openTime, branch.closeTime).close
}

function extendOptions(b: DbBooking) {
  const db = getDb()
  const room = roomOf(db, b.roomId)!
  const end = vn(b.endTime)
  const close = closingOf(b)
  const options: { minutes: number; newEnd: string; amount: number }[] = []
  for (let m = 30; m <= 180; m += 30) {
    const newEnd = end.add(m, 'minute')
    if (newEnd.isAfter(close) || !isFree(db, room.id, end, newEnd, b.id)) break
    options.push({
      minutes: m,
      newEnd: toApiTime(newEnd),
      amount: quoteRoom(db, room, end, newEnd).total,
    })
  }
  return { maxMinutes: options.at(-1)?.minutes ?? 0, options }
}

export const staffHandlers = [
  // FD-OPS-01
  http.get(
    api('/staff/bookings/timeline'),
    route(({ request }) => {
      const user = requireUser(request, ['STAFF', 'ADMIN'])
      const db = getDb()
      const branchId = branchScope(user, request)
      const branch = branchOf(db, branchId)
      const date = new URL(request.url).searchParams.get('date') ?? vn().format('YYYY-MM-DD')
      const { open, close } = businessWindow(date, branch.openTime, branch.closeTime)
      const timeline: Timeline = {
        date,
        branch: {
          id: branch.id,
          name: branch.name,
          openTime: branch.openTime,
          closeTime: branch.closeTime,
        },
        rooms: db.rooms
          .filter((r) => r.branchId === branchId)
          .map((r) => {
            const t = typeOf(db, r.roomTypeId)
            return {
              id: r.id,
              code: r.code,
              type: t.name,
              capacity: t.capacity,
              status: r.status,
              bookings: db.bookings
                .filter(
                  (b) =>
                    b.roomId === r.id &&
                    b.status !== 'EXPIRED' &&
                    vn(b.startTime).isBefore(close) &&
                    vn(b.endTime).isAfter(open),
                )
                .map((b) => {
                  const full = toBooking(db, b)
                  return {
                    id: b.id,
                    code: b.code,
                    status: b.status,
                    start: b.startTime,
                    end: b.endTime,
                    customerName: full.customer.name,
                    phone: full.customer.phone,
                    paymentMethod: b.paymentMethod,
                    people: b.people,
                  }
                }),
            }
          }),
      }
      return ok(timeline)
    }),
  ),

  // FD-OPS-02: khách vãng lai → CHECKED_IN ngay
  http.post(
    api('/staff/bookings'),
    route(async ({ request }) => {
      const user = requireUser(request, ['STAFF', 'ADMIN'])
      const body = await readBody<WalkInRequest>(request)
      const db = getDb()
      const room = db.rooms.find((r) => r.id === body.roomId) ?? notFound('Không tìm thấy phòng')
      if (room.status !== 'ACTIVE') fail(422, 'INVALID_STATE', 'Phòng đang bảo trì')
      if (user.role === 'STAFF' && room.branchId !== user.branchId)
        fail(403, 'FORBIDDEN', 'Phòng thuộc chi nhánh khác')
      if (!body.guestName?.trim()) fail(400, 'VALIDATION_ERROR', 'Nhập tên khách')
      if (!/^0\d{9}$/.test(body.guestPhone ?? ''))
        fail(400, 'VALIDATION_ERROR', 'Số điện thoại không hợp lệ')
      const type = typeOf(db, room.roomTypeId)
      if (body.people > type.capacity)
        fail(400, 'VALIDATION_ERROR', `Phòng chứa tối đa ${type.capacity} người`)
      const now = vn().second(0).millisecond(0)
      const end = now.add(body.hours * 60, 'minute')
      const branch = branchOf(db, room.branchId)
      const businessDate = now.format('HH:mm') < branch.openTime ? now.subtract(1, 'day') : now
      const { open, close } = businessWindow(
        businessDate.format('YYYY-MM-DD'),
        branch.openTime,
        branch.closeTime,
      )
      if (now.isBefore(open) || end.isAfter(close)) {
        fail(400, 'VALIDATION_ERROR', `Ngoài giờ mở cửa (${branch.openTime} – ${branch.closeTime})`)
      }
      if (!isFree(db, room.id, now, end))
        fail(409, 'ROOM_NOT_AVAILABLE', 'Phòng không trống trong khoảng này')
      const b: DbBooking = {
        id: nextId(db.bookings),
        code: nextCode(db, now),
        userId: null,
        guestName: body.guestName.trim(),
        guestPhone: body.guestPhone,
        roomId: room.id,
        startTime: toApiTime(now),
        endTime: toApiTime(end),
        people: body.people,
        status: 'CHECKED_IN',
        holdExpiresAt: null,
        roomAmount: quoteRoom(db, room, now, end).total,
        discount: 0,
        voucherId: null,
        paymentMethod: 'CASH',
        cancelReason: null,
        checkedInAt: toApiTime(now),
        checkedOutAt: null,
        staffId: user.id,
        createdAt: toApiTime(now),
      }
      db.bookings.push(b)
      for (const item of body.items ?? []) {
        const menu = db.menuItems.find((m) => m.id === item.menuItemId && m.available)
        if (!menu || item.quantity < 1) continue
        db.bookingItems.push({
          id: nextId(db.bookingItems),
          bookingId: b.id,
          menuItemId: menu.id,
          quantity: item.quantity,
          unitPrice: menu.price,
          preordered: false,
          createdAt: toApiTime(now),
        })
      }
      publish(roomEvent(db, b, 'CHECKED_IN'))
      return ok(toBooking(db, b), 201)
    }),
  ),

  http.get(
    api('/staff/bookings/:id'),
    route(({ request, params }) => {
      const { b, db } = staffBooking(request, num(params.id))
      return ok(toBooking(db, b))
    }),
  ),

  // FD-OPS-03
  http.post(
    api('/staff/bookings/:id/check-in'),
    route(({ request, params }) => {
      const { b, db, user } = staffBooking(request, num(params.id))
      const now = vn()
      if (b.status !== 'CONFIRMED') fail(422, 'INVALID_STATE', 'Chỉ check-in được đơn đã xác nhận')
      if (now.isBefore(vn(b.startTime).subtract(15, 'minute'))) {
        fail(422, 'CHECKIN_TOO_EARLY', 'Chỉ check-in được từ 15 phút trước giờ bắt đầu')
      }
      if (now.isAfter(vn(b.endTime))) fail(422, 'INVALID_STATE', 'Đã quá giờ kết thúc của đơn')
      b.status = 'CHECKED_IN'
      b.checkedInAt = toApiTime(now)
      b.staffId = user.id
      publish(roomEvent(db, b, 'CHECKED_IN'))
      return ok(toBooking(db, b))
    }),
  ),

  // FD-OPS-04
  http.post(
    api('/staff/bookings/:id/items'),
    route(async ({ request, params }) => {
      const { b, db } = staffBooking(request, num(params.id))
      if (b.status !== 'CHECKED_IN') fail(422, 'INVALID_STATE', 'Chỉ gọi món khi phòng đang hát')
      const { menuItemId, quantity } = await readBody<{ menuItemId: number; quantity: number }>(
        request,
      )
      const menu = db.menuItems.find((m) => m.id === menuItemId && m.available)
      if (!menu) fail(422, 'ITEM_UNAVAILABLE', 'Món không tồn tại hoặc đã ngừng bán')
      if (quantity < 1) fail(400, 'VALIDATION_ERROR', 'Số lượng tối thiểu là 1')
      db.bookingItems.push({
        id: nextId(db.bookingItems),
        bookingId: b.id,
        menuItemId,
        quantity,
        unitPrice: menu.price,
        preordered: false,
        createdAt: toApiTime(vn()),
      })
      return ok(toBooking(db, b))
    }),
  ),

  http.delete(
    api('/staff/bookings/:id/items/:itemId'),
    route(({ request, params }) => {
      const { b, db } = staffBooking(request, num(params.id))
      if (b.status !== 'CHECKED_IN') fail(422, 'INVALID_STATE', 'Chỉ sửa món khi phòng đang hát')
      const itemId = num(params.itemId)
      if (!db.bookingItems.some((i) => i.id === itemId && i.bookingId === b.id))
        notFound('Không tìm thấy món')
      db.bookingItems = db.bookingItems.filter((i) => i.id !== itemId)
      return ok(toBooking(db, b))
    }),
  ),

  // FD-OPS-05
  http.get(
    api('/staff/bookings/:id/extend-options'),
    route(({ request, params }) => {
      const { b } = staffBooking(request, num(params.id))
      if (b.status !== 'CHECKED_IN') fail(422, 'INVALID_STATE', 'Chỉ gia hạn khi phòng đang hát')
      return ok(extendOptions(b))
    }),
  ),

  http.post(
    api('/staff/bookings/:id/extend'),
    route(async ({ request, params }) => {
      const { b, db } = staffBooking(request, num(params.id))
      if (b.status !== 'CHECKED_IN') fail(422, 'INVALID_STATE', 'Chỉ gia hạn khi phòng đang hát')
      const { minutes } = await readBody<{ minutes: number }>(request)
      const option = extendOptions(b).options.find((o) => o.minutes === minutes)
      if (!option)
        fail(409, 'ROOM_NOT_AVAILABLE', 'Khoảng gia hạn đã có người đặt hoặc vượt giờ đóng cửa')
      b.endTime = option.newEnd
      b.roomAmount += option.amount
      publish(roomEvent(db, b, 'EXTENDED'))
      return ok(toBooking(db, b))
    }),
  ),

  // FD-OPS-07
  http.get(
    api('/staff/bookings/:id/invoice'),
    route(({ request, params }) => {
      const { b, db, user } = staffBooking(request, num(params.id))
      const staff = db.users.find((u) => u.id === b.staffId) ?? user
      return ok(toInvoice(db, b, staff.fullName))
    }),
  ),

  // FD-OPS-06
  http.post(
    api('/staff/bookings/:id/check-out'),
    route(async ({ request, params }) => {
      const { b, db, user } = staffBooking(request, num(params.id))
      if (b.status !== 'CHECKED_IN') fail(422, 'INVALID_STATE', 'Chỉ check-out được phòng đang hát')
      const { receivedAmount } = await readBody<{ receivedAmount: number }>(request)
      const total = totalOf(db, b)
      const paidBefore = paidOf(db, b.id)
      const due = Math.max(0, total - paidBefore)
      if (receivedAmount < due) {
        fail(400, 'VALIDATION_ERROR', 'Số tiền khách đưa chưa đủ', { due })
      }
      if (due > 0) {
        db.payments.push({
          id: nextId(db.payments),
          bookingId: b.id,
          method: 'CASH',
          amount: due,
          status: 'SUCCESS',
          txnRef: `CASH${b.id}-${Date.now().toString(36)}`,
          paidAt: toApiTime(vn()),
        })
      }
      b.status = 'COMPLETED'
      b.checkedOutAt = toApiTime(vn())
      b.staffId = user.id
      publish(roomEvent(db, b, 'CHECKED_OUT'))
      return ok({
        status: b.status,
        total,
        paidBefore,
        collected: due,
        receivedAmount,
        change: receivedAmount - due,
      })
    }),
  ),
]
