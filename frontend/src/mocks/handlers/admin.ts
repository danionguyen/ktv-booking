import { http } from 'msw'
import type { Holiday, MenuItem, PriceRule, RoomType, User, Voucher } from '@/types/domain'
import type { Role } from '@/types/auth'
import { minutesOf, toApiTime, vn } from '@utils/time'
import { getDb, nextId, type DbBranch, type DbRoom, type DbUser } from '../db'
import { api, fail, noContent, notFound, num, ok, readBody, requireUser, route } from '../http'
import { refundPercentFor, releaseVoucher, roomEvent, toBooking } from '../logic'
import { roundTo1000 } from '../pricing'
import { publish } from '../realtime'
import { toBranch, toRoom } from './catalog'

const admin = (request: Request) => requireUser(request, ['ADMIN'])

const inUse = (message: string) => fail(409, 'RESOURCE_IN_USE', message)

function toUser(u: DbUser): User {
  const db = getDb()
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone,
    role: u.role,
    branchId: u.branchId,
    branchName: db.branches.find((b) => b.id === u.branchId)?.name ?? null,
    enabled: u.enabled,
    createdAt: u.createdAt,
  }
}

function paginate<T>(rows: T[], url: URL) {
  const page = Number(url.searchParams.get('page') ?? 0)
  const size = Number(url.searchParams.get('size') ?? 20)
  return { items: rows.slice(page * size, page * size + size), page, size, total: rows.length }
}

/** BR-21: các khung trong cùng loại ngày không được chồng nhau. */
function validateRules(rules: PriceRule[]) {
  for (const r of rules) {
    if (r.pricePerHour <= 0) fail(400, 'VALIDATION_ERROR', 'Đơn giá phải lớn hơn 0')
    if (r.startHour === r.endHour && rules.filter((x) => x.dayType === r.dayType).length > 1) {
      fail(400, 'VALIDATION_ERROR', 'Khung "cả ngày" không được đi kèm khung khác cùng loại ngày')
    }
  }
  const expand = (r: PriceRule) => {
    const s = minutesOf(r.startHour)
    let e = minutesOf(r.endHour)
    if (e <= s) e += 24 * 60
    return [s, e] as const
  }
  for (const dayType of ['WEEKDAY', 'WEEKEND', 'HOLIDAY']) {
    const ranges = rules
      .filter((r) => r.dayType === dayType)
      .map(expand)
      .sort((a, b) => a[0] - b[0])
    for (let i = 1; i < ranges.length; i++) {
      if (ranges[i][0] < ranges[i - 1][1])
        fail(400, 'VALIDATION_ERROR', `Các khung giờ ${dayType} bị chồng nhau`)
    }
  }
}

export const adminHandlers = [
  // ---------- Chi nhánh ----------
  http.get(
    api('/admin/branches'),
    route(({ request }) => {
      admin(request)
      const db = getDb()
      return ok(db.branches.map((b) => toBranch(db, b.id)))
    }),
  ),
  http.post(
    api('/admin/branches'),
    route(async ({ request }) => {
      admin(request)
      const body = await readBody<
        Omit<DbBranch, 'id' | 'mapWidth' | 'mapHeight'> &
          Partial<Pick<DbBranch, 'mapWidth' | 'mapHeight'>>
      >(request)
      const db = getDb()
      if (db.branches.some((b) => b.name.toLowerCase() === body.name.trim().toLowerCase())) {
        fail(409, 'DUPLICATE_CODE', 'Tên chi nhánh đã tồn tại')
      }
      const branch = { mapWidth: 1000, mapHeight: 560, ...body, id: nextId(db.branches) }
      db.branches.push(branch)
      return ok(toBranch(db, branch.id), 201)
    }),
  ),
  http.put(
    api('/admin/branches/:id'),
    route(async ({ request, params }) => {
      admin(request)
      const db = getDb()
      const branch = db.branches.find((b) => b.id === num(params.id)) ?? notFound()
      Object.assign(branch, await readBody<Partial<DbBranch>>(request), { id: branch.id })
      return ok(toBranch(db, branch.id))
    }),
  ),
  http.delete(
    api('/admin/branches/:id'),
    route(({ request, params }) => {
      admin(request)
      const db = getDb()
      const id = num(params.id)
      if (db.rooms.some((r) => r.branchId === id))
        inUse('Chi nhánh còn phòng, hãy xóa hoặc chuyển phòng trước')
      if (db.users.some((u) => u.branchId === id)) inUse('Còn nhân viên được gán cho chi nhánh này')
      db.branches = db.branches.filter((b) => b.id !== id)
      return noContent()
    }),
  ),
  // FD-BRN-03: lưu vị trí phòng trên sơ đồ
  http.put(
    api('/admin/branches/:id/layout'),
    route(async ({ request, params }) => {
      admin(request)
      const db = getDb()
      const id = num(params.id)
      const branch = db.branches.find((b) => b.id === id) ?? notFound()
      const body = await readBody<{
        mapWidth: number
        mapHeight: number
        rooms: { id: number; posX: number; posY: number; width: number; height: number }[]
      }>(request)
      branch.mapWidth = body.mapWidth
      branch.mapHeight = body.mapHeight
      for (const pos of body.rooms) {
        const room = db.rooms.find((r) => r.id === pos.id && r.branchId === id)
        if (room) Object.assign(room, pos)
      }
      return ok(toBranch(db, id))
    }),
  ),

  // ---------- Loại phòng + bảng giá ----------
  http.get(
    api('/admin/room-types'),
    route(({ request }) => {
      admin(request)
      return ok(getDb().roomTypes)
    }),
  ),
  http.post(
    api('/admin/room-types'),
    route(async ({ request }) => {
      admin(request)
      const body = await readBody<Omit<RoomType, 'id'>>(request)
      const db = getDb()
      if (db.roomTypes.some((t) => t.name.toLowerCase() === body.name.trim().toLowerCase())) {
        fail(409, 'DUPLICATE_CODE', 'Tên loại phòng đã tồn tại')
      }
      const type = { ...body, id: nextId(db.roomTypes) }
      db.roomTypes.push(type)
      return ok(type, 201)
    }),
  ),
  http.put(
    api('/admin/room-types/:id'),
    route(async ({ request, params }) => {
      admin(request)
      const db = getDb()
      const type = db.roomTypes.find((t) => t.id === num(params.id)) ?? notFound()
      Object.assign(type, await readBody<Partial<RoomType>>(request), { id: type.id })
      return ok(type)
    }),
  ),
  http.delete(
    api('/admin/room-types/:id'),
    route(({ request, params }) => {
      admin(request)
      const db = getDb()
      const id = num(params.id)
      if (db.rooms.some((r) => r.roomTypeId === id)) inUse('Còn phòng thuộc loại này')
      db.roomTypes = db.roomTypes.filter((t) => t.id !== id)
      db.priceRules = db.priceRules.filter((r) => r.roomTypeId !== id)
      return noContent()
    }),
  ),
  http.get(
    api('/admin/room-types/:id/price-rules'),
    route(({ request, params }) => {
      admin(request)
      const id = num(params.id)
      return ok(getDb().priceRules.filter((r) => r.roomTypeId === id))
    }),
  ),
  http.put(
    api('/admin/room-types/:id/price-rules'),
    route(async ({ request, params }) => {
      admin(request)
      const db = getDb()
      const id = num(params.id)
      const { rules } = await readBody<{ rules: PriceRule[] }>(request)
      validateRules(rules)
      let seq = nextId(db.priceRules)
      db.priceRules = [
        ...db.priceRules.filter((r) => r.roomTypeId !== id),
        ...rules.map((r) => ({ ...r, roomTypeId: id, id: seq++ })),
      ]
      return ok(db.priceRules.filter((r) => r.roomTypeId === id))
    }),
  ),

  // ---------- Ngày lễ ----------
  http.get(
    api('/admin/holidays'),
    route(({ request }) => {
      admin(request)
      return ok([...getDb().holidays].sort((a, b) => a.date.localeCompare(b.date)))
    }),
  ),
  http.post(
    api('/admin/holidays'),
    route(async ({ request }) => {
      admin(request)
      const body = await readBody<Holiday>(request)
      const db = getDb()
      if (db.holidays.some((h) => h.date === body.date))
        fail(409, 'DUPLICATE_CODE', 'Ngày này đã có trong danh sách')
      db.holidays.push(body)
      return ok(body, 201)
    }),
  ),
  http.delete(
    api('/admin/holidays/:date'),
    route(({ request, params }) => {
      admin(request)
      const db = getDb()
      db.holidays = db.holidays.filter((h) => h.date !== params.date)
      return noContent()
    }),
  ),

  // ---------- Phòng ----------
  http.get(
    api('/admin/rooms'),
    route(({ request }) => {
      admin(request)
      const db = getDb()
      const branchId = new URL(request.url).searchParams.get('branchId')
      return ok(
        db.rooms
          .filter((r) => !branchId || r.branchId === Number(branchId))
          .sort((a, b) => a.branchId - b.branchId || a.code.localeCompare(b.code))
          .map((r) => toRoom(db, r)),
      )
    }),
  ),
  http.post(
    api('/admin/rooms'),
    route(async ({ request }) => {
      admin(request)
      const body =
        await readBody<Pick<DbRoom, 'branchId' | 'roomTypeId' | 'code' | 'status' | 'images'>>(
          request,
        )
      const db = getDb()
      const code = body.code.trim().toUpperCase()
      if (db.rooms.some((r) => r.branchId === body.branchId && r.code === code)) {
        fail(409, 'DUPLICATE_CODE', `Mã phòng ${code} đã tồn tại ở chi nhánh này`)
      }
      const siblings = db.rooms.filter((r) => r.branchId === body.branchId)
      const room: DbRoom = {
        id: nextId(db.rooms),
        branchId: body.branchId,
        roomTypeId: body.roomTypeId,
        code,
        status: body.status ?? 'ACTIVE',
        images: body.images ?? [],
        // Đặt tạm ở góc dưới sơ đồ — admin kéo thả lại sau
        posX: 40 + (siblings.length % 5) * 160,
        posY: 40 + Math.floor(siblings.length / 5) * 130,
        width: 140,
        height: 90,
      }
      db.rooms.push(room)
      return ok(toRoom(db, room), 201)
    }),
  ),
  http.put(
    api('/admin/rooms/:id'),
    route(async ({ request, params }) => {
      admin(request)
      const db = getDb()
      const room = db.rooms.find((r) => r.id === num(params.id)) ?? notFound()
      const body = await readBody<Partial<DbRoom>>(request)
      const code = (body.code ?? room.code).trim().toUpperCase()
      const branchId = body.branchId ?? room.branchId
      if (db.rooms.some((r) => r.id !== room.id && r.branchId === branchId && r.code === code)) {
        fail(409, 'DUPLICATE_CODE', `Mã phòng ${code} đã tồn tại ở chi nhánh này`)
      }
      Object.assign(room, body, { id: room.id, code })
      return ok(toRoom(db, room))
    }),
  ),
  http.patch(
    api('/admin/rooms/:id/status'),
    route(async ({ request, params }) => {
      admin(request)
      const db = getDb()
      const room = db.rooms.find((r) => r.id === num(params.id)) ?? notFound()
      const { status } = await readBody<{ status: DbRoom['status'] }>(request)
      room.status = status
      const now = toApiTime(vn())
      publish({
        branchId: room.branchId,
        roomId: room.id,
        event: 'MAINTENANCE_CHANGED',
        status: status === 'MAINTENANCE' ? 'MAINTENANCE' : 'AVAILABLE',
        from: null,
        to: null,
        holdExpiresAt: null,
        at: now,
      })
      // Đơn tương lai bị ảnh hưởng — trả về để admin xử lý (A05 → A10)
      const affected = db.bookings.filter(
        (b) =>
          b.roomId === room.id &&
          ['CONFIRMED', 'PENDING_PAYMENT'].includes(b.status) &&
          b.startTime > now,
      ).length
      return ok({ ...toRoom(db, room), affectedBookings: status === 'MAINTENANCE' ? affected : 0 })
    }),
  ),
  http.delete(
    api('/admin/rooms/:id'),
    route(({ request, params }) => {
      admin(request)
      const db = getDb()
      const id = num(params.id)
      if (db.bookings.some((b) => b.roomId === id))
        inUse('Phòng đã có lịch sử đặt — hãy chuyển sang Bảo trì thay vì xóa')
      db.rooms = db.rooms.filter((r) => r.id !== id)
      return noContent()
    }),
  ),

  // ---------- Menu ----------
  http.get(
    api('/admin/menu-items'),
    route(({ request }) => {
      admin(request)
      return ok(getDb().menuItems)
    }),
  ),
  http.post(
    api('/admin/menu-items'),
    route(async ({ request }) => {
      admin(request)
      const db = getDb()
      const item = { ...(await readBody<Omit<MenuItem, 'id'>>(request)), id: nextId(db.menuItems) }
      db.menuItems.push(item)
      return ok(item, 201)
    }),
  ),
  http.put(
    api('/admin/menu-items/:id'),
    route(async ({ request, params }) => {
      admin(request)
      const db = getDb()
      const item = db.menuItems.find((m) => m.id === num(params.id)) ?? notFound()
      Object.assign(item, await readBody<Partial<MenuItem>>(request), { id: item.id })
      return ok(item)
    }),
  ),
  http.patch(
    api('/admin/menu-items/:id/availability'),
    route(async ({ request, params }) => {
      admin(request)
      const db = getDb()
      const item = db.menuItems.find((m) => m.id === num(params.id)) ?? notFound()
      item.available = (await readBody<{ available: boolean }>(request)).available
      return ok(item)
    }),
  ),
  http.delete(
    api('/admin/menu-items/:id'),
    route(({ request, params }) => {
      admin(request)
      const db = getDb()
      const id = num(params.id)
      if (db.bookingItems.some((i) => i.menuItemId === id))
        inUse('Món đã có trong đơn — hãy chuyển sang Ngừng bán')
      db.menuItems = db.menuItems.filter((m) => m.id !== id)
      return noContent()
    }),
  ),

  // ---------- Voucher ----------
  http.get(
    api('/admin/vouchers'),
    route(({ request }) => {
      admin(request)
      return ok(getDb().vouchers)
    }),
  ),
  http.post(
    api('/admin/vouchers'),
    route(async ({ request }) => {
      admin(request)
      const body = await readBody<Omit<Voucher, 'id' | 'usedCount'>>(request)
      const db = getDb()
      const code = body.code.trim().toUpperCase()
      if (db.vouchers.some((v) => v.code === code))
        fail(409, 'DUPLICATE_CODE', 'Mã voucher đã tồn tại')
      const voucher = { ...body, code, id: nextId(db.vouchers), usedCount: 0 }
      db.vouchers.push(voucher)
      return ok(voucher, 201)
    }),
  ),
  http.put(
    api('/admin/vouchers/:id'),
    route(async ({ request, params }) => {
      admin(request)
      const db = getDb()
      const v = db.vouchers.find((x) => x.id === num(params.id)) ?? notFound()
      const body = await readBody<Partial<Voucher>>(request)
      const code = (body.code ?? v.code).trim().toUpperCase()
      if (db.vouchers.some((x) => x.id !== v.id && x.code === code))
        fail(409, 'DUPLICATE_CODE', 'Mã voucher đã tồn tại')
      Object.assign(v, body, { id: v.id, code, usedCount: v.usedCount })
      return ok(v)
    }),
  ),
  http.delete(
    api('/admin/vouchers/:id'),
    route(({ request, params }) => {
      admin(request)
      const db = getDb()
      const id = num(params.id)
      if (db.bookings.some((b) => b.voucherId === id))
        inUse('Voucher đã được dùng — hãy cho hết hạn thay vì xóa')
      db.vouchers = db.vouchers.filter((v) => v.id !== id)
      return noContent()
    }),
  ),

  // ---------- Người dùng ----------
  http.get(
    api('/admin/users'),
    route(({ request }) => {
      admin(request)
      const url = new URL(request.url)
      const q = url.searchParams.get('q')?.toLowerCase().trim()
      const role = url.searchParams.get('role') as Role | null
      const rows = getDb()
        .users.filter((u) => !role || u.role === role)
        .filter((u) => !q || `${u.fullName} ${u.email} ${u.phone}`.toLowerCase().includes(q))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(toUser)
      return ok(paginate(rows, url))
    }),
  ),
  http.post(
    api('/admin/users'),
    route(async ({ request }) => {
      admin(request)
      const body = await readBody<Omit<DbUser, 'id' | 'createdAt' | 'enabled'>>(request)
      const db = getDb()
      const email = body.email.trim().toLowerCase()
      if (db.users.some((u) => u.email === email))
        fail(409, 'EMAIL_ALREADY_EXISTS', 'Email đã được sử dụng')
      if (body.role === 'STAFF' && !body.branchId)
        fail(400, 'VALIDATION_ERROR', 'Nhân viên phải được gán chi nhánh')
      const user: DbUser = {
        ...body,
        email,
        branchId: body.role === 'STAFF' ? body.branchId : null,
        id: nextId(db.users),
        enabled: true,
        createdAt: toApiTime(vn()),
      }
      db.users.push(user)
      return ok(toUser(user), 201)
    }),
  ),
  http.put(
    api('/admin/users/:id'),
    route(async ({ request, params }) => {
      const me = admin(request)
      const db = getDb()
      const user = db.users.find((u) => u.id === num(params.id)) ?? notFound()
      const body = await readBody<Partial<DbUser>>(request)
      if (user.id === me.id && body.role && body.role !== 'ADMIN') {
        fail(422, 'INVALID_STATE', 'Không thể tự hạ quyền của chính mình')
      }
      const role = body.role ?? user.role
      if (role === 'STAFF' && !(body.branchId ?? user.branchId)) {
        fail(400, 'VALIDATION_ERROR', 'Nhân viên phải được gán chi nhánh')
      }
      Object.assign(user, {
        fullName: body.fullName ?? user.fullName,
        phone: body.phone ?? user.phone,
        role,
        branchId: role === 'STAFF' ? (body.branchId ?? user.branchId) : null,
      })
      return ok(toUser(user))
    }),
  ),
  http.patch(
    api('/admin/users/:id/status'),
    route(async ({ request, params }) => {
      const me = admin(request)
      const db = getDb()
      const user = db.users.find((u) => u.id === num(params.id)) ?? notFound()
      const { enabled } = await readBody<{ enabled: boolean }>(request)
      if (user.id === me.id && !enabled)
        fail(422, 'INVALID_STATE', 'Không thể tự khóa tài khoản của mình')
      user.enabled = enabled
      return ok(toUser(user))
    }),
  ),
  http.put(
    api('/admin/users/:id/password'),
    route(async ({ request, params }) => {
      admin(request)
      const db = getDb()
      const user = db.users.find((u) => u.id === num(params.id)) ?? notFound()
      const { newPassword } = await readBody<{ newPassword: string }>(request)
      if (!newPassword || newPassword.length < 6)
        fail(400, 'VALIDATION_ERROR', 'Mật khẩu tối thiểu 6 ký tự')
      user.password = newPassword
      return noContent()
    }),
  ),

  // ---------- Đặt phòng (FD-BKG-09) ----------
  http.get(
    api('/admin/bookings'),
    route(({ request }) => {
      admin(request)
      const db = getDb()
      const url = new URL(request.url)
      const status = url.searchParams.get('status')
      const branchId = url.searchParams.get('branchId')
      const from = url.searchParams.get('from')
      const to = url.searchParams.get('to')
      const q = url.searchParams.get('q')?.toLowerCase().trim()
      const rows = db.bookings
        .filter((b) => !status || b.status === status)
        .filter(
          (b) =>
            !branchId || db.rooms.find((r) => r.id === b.roomId)?.branchId === Number(branchId),
        )
        .filter((b) => !from || vn(b.startTime).format('YYYY-MM-DD') >= from)
        .filter((b) => !to || vn(b.startTime).format('YYYY-MM-DD') <= to)
        .map((b) => toBooking(db, b))
        .filter(
          (b) =>
            !q ||
            `${b.code} ${b.customer.name} ${b.customer.phone} ${b.customer.email ?? ''}`
              .toLowerCase()
              .includes(q),
        )
        .sort((a, b) => b.startTime.localeCompare(a.startTime))
      return ok(paginate(rows, url))
    }),
  ),
  http.get(
    api('/admin/bookings/:id'),
    route(({ request, params }) => {
      admin(request)
      const db = getDb()
      const b = db.bookings.find((x) => x.id === num(params.id)) ?? notFound()
      return ok(toBooking(db, b))
    }),
  ),
  // BR-51: admin hủy bất kỳ đơn nào kèm lý do
  http.post(
    api('/admin/bookings/:id/cancel'),
    route(async ({ request, params }) => {
      admin(request)
      const db = getDb()
      const b = db.bookings.find((x) => x.id === num(params.id)) ?? notFound()
      const { reason } = await readBody<{ reason: string }>(request)
      if (!reason?.trim()) fail(400, 'VALIDATION_ERROR', 'Nhập lý do hủy')
      if (['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(b.status)) {
        fail(422, 'INVALID_STATE', 'Đơn đã kết thúc, không thể hủy')
      }
      const paid = db.payments
        .filter((p) => p.bookingId === b.id && p.status === 'SUCCESS')
        .reduce((s, p) => s + p.amount, 0)
      // Admin hủy: hoàn 100% nếu lỗi phía cửa hàng — mock dùng bảng 4.6 nhưng tối thiểu 50%
      const percent = Math.max(50, refundPercentFor(b, vn()))
      const refundAmount = roundTo1000((paid * percent) / 100)
      if (refundAmount > 0) {
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
      b.cancelReason = `[Admin] ${reason.trim()}`
      publish(roomEvent(db, b, 'CANCELLED'))
      return ok({ id: b.id, status: b.status, refundPercent: paid > 0 ? percent : 0, refundAmount })
    }),
  ),
]
