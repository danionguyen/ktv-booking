import { http } from 'msw'
import type { AvailabilityGroup, BranchDetail, Room, RoomDetail } from '@/types/domain'
import { toApiTime, validateBookingWindow, vn } from '@utils/time'
import { getDb, type DbRoom, type MockDb } from '../db'
import { api, fail, notFound, num, ok, route } from '../http'
import { branchOf, isFree, liveStatus, quoteRoom, typeOf } from '../logic'

export function toRoom(db: MockDb, r: DbRoom): Room {
  const type = typeOf(db, r.roomTypeId)
  return {
    id: r.id,
    branchId: r.branchId,
    branchName: branchOf(db, r.branchId).name,
    roomTypeId: r.roomTypeId,
    type: type.name,
    capacity: type.capacity,
    code: r.code,
    status: r.status,
    posX: r.posX,
    posY: r.posY,
    width: r.width,
    height: r.height,
    images: r.images,
  }
}

export function toBranch(db: MockDb, id: number) {
  const b = branchOf(db, id)
  const rooms = db.rooms.filter((r) => r.branchId === id)
  return {
    ...b,
    roomCount: rooms.length,
    roomTypeCount: new Set(rooms.map((r) => r.roomTypeId)).size,
  }
}

/** Giá thấp nhất theo giờ của một loại phòng (hiển thị "từ ...đ/giờ"). */
const minPriceOf = (db: MockDb, roomTypeId: number) =>
  Math.min(...db.priceRules.filter((r) => r.roomTypeId === roomTypeId).map((r) => r.pricePerHour))

export function priceTable(db: MockDb) {
  return {
    roomTypes: db.roomTypes.map((t) => ({
      roomType: { id: t.id, name: t.name, capacity: t.capacity },
      rules: db.priceRules.filter((r) => r.roomTypeId === t.id),
    })),
  }
}

function parseWindow(url: URL) {
  const start = url.searchParams.get('start')
  const hours = Number(url.searchParams.get('hours'))
  if (!start || !Number.isFinite(hours)) fail(400, 'VALIDATION_ERROR', 'Thiếu start hoặc hours')
  const s = vn(start)
  return { start: s, hours, end: s.add(hours * 60, 'minute') }
}

export const catalogHandlers = [
  http.get(
    api('/branches'),
    route(() => {
      const db = getDb()
      return ok(db.branches.map((b) => toBranch(db, b.id)))
    }),
  ),

  http.get(
    api('/branches/:id'),
    route(({ params }) => {
      const db = getDb()
      const id = num(params.id)
      if (!db.branches.some((b) => b.id === id)) notFound('Không tìm thấy chi nhánh')
      const detail: BranchDetail = {
        ...toBranch(db, id),
        roomTypes: db.roomTypes
          .map((t) => ({
            id: t.id,
            name: t.name,
            capacity: t.capacity,
            roomCount: db.rooms.filter((r) => r.branchId === id && r.roomTypeId === t.id).length,
            minPrice: minPriceOf(db, t.id),
          }))
          .filter((t) => t.roomCount > 0),
      }
      return ok(detail)
    }),
  ),

  http.get(
    api('/branches/:id/price-table'),
    route(() => ok(priceTable(getDb()))),
  ),

  // Snapshot sơ đồ phòng (FD-ROM-03): bỏ trống start/end = hiện tại
  http.get(
    api('/branches/:id/rooms'),
    route(({ request, params }) => {
      const db = getDb()
      const id = num(params.id)
      const branch = db.branches.find((b) => b.id === id) ?? notFound('Không tìm thấy chi nhánh')
      const url = new URL(request.url)
      const start = url.searchParams.get('start') ? vn(url.searchParams.get('start')!) : vn()
      const end = url.searchParams.get('end')
        ? vn(url.searchParams.get('end')!)
        : start.add(1, 'minute')
      return ok({
        branch: {
          id: branch.id,
          name: branch.name,
          mapWidth: branch.mapWidth,
          mapHeight: branch.mapHeight,
        },
        rooms: db.rooms
          .filter((r) => r.branchId === id)
          .map((r) => {
            const t = typeOf(db, r.roomTypeId)
            return {
              id: r.id,
              code: r.code,
              type: t.name,
              capacity: t.capacity,
              posX: r.posX,
              posY: r.posY,
              width: r.width,
              height: r.height,
              ...liveStatus(db, r, start, end),
            }
          }),
        serverTime: toApiTime(vn()),
      })
    }),
  ),

  http.get(
    api('/room-types'),
    route(() => ok(getDb().roomTypes)),
  ),

  // Tìm phòng trống (FD-ROM-02) — đặt trước /rooms/:id để không bị nuốt route
  http.get(
    api('/rooms/availability'),
    route(({ request }) => {
      const db = getDb()
      const url = new URL(request.url)
      const branchId = num(url.searchParams.get('branchId') ?? undefined)
      const people = Number(url.searchParams.get('people') ?? 1)
      const { start, end, hours } = parseWindow(url)
      const branch =
        db.branches.find((b) => b.id === branchId) ?? notFound('Không tìm thấy chi nhánh')
      const error = validateBookingWindow(start, hours, branch)
      if (error) fail(400, 'VALIDATION_ERROR', error)

      const rooms = db.rooms.filter(
        (r) =>
          r.branchId === branchId &&
          r.status === 'ACTIVE' &&
          typeOf(db, r.roomTypeId).capacity >= people,
      )
      const groups: AvailabilityGroup[] = db.roomTypes
        .filter((t) => rooms.some((r) => r.roomTypeId === t.id))
        .sort((a, b) => a.capacity - b.capacity)
        .map((t) => {
          const typeRooms = rooms.filter((r) => r.roomTypeId === t.id)
          return {
            roomType: { id: t.id, name: t.name, capacity: t.capacity },
            quote: quoteRoom(db, typeRooms[0], start, end),
            rooms: typeRooms.map((r) => ({
              id: r.id,
              code: r.code,
              available: isFree(db, r.id, start, end),
            })),
          }
        })

      // Hết phòng → gợi ý ±30', ±60' (cùng thời lượng)
      const suggestions: { start: string; end: string }[] = []
      if (groups.every((g) => g.rooms.every((r) => !r.available))) {
        for (const delta of [-60, -30, 30, 60, 90]) {
          const s = start.add(delta, 'minute')
          const e = s.add(hours * 60, 'minute')
          if (validateBookingWindow(s, hours, branch)) continue
          if (rooms.some((r) => isFree(db, r.id, s, e)))
            suggestions.push({ start: toApiTime(s), end: toApiTime(e) })
        }
      }
      return ok({ start: toApiTime(start), end: toApiTime(end), groups, suggestions })
    }),
  ),

  http.get(
    api('/rooms/:id'),
    route(({ params }) => {
      const db = getDb()
      const room = db.rooms.find((r) => r.id === num(params.id)) ?? notFound('Không tìm thấy phòng')
      const branch = branchOf(db, room.branchId)
      const reviewIds = db.bookings.filter((b) => b.roomId === room.id).map((b) => b.id)
      const reviews = db.reviews.filter((r) => reviewIds.includes(r.bookingId))
      const detail: RoomDetail = {
        ...toRoom(db, room),
        branch: {
          id: branch.id,
          name: branch.name,
          address: branch.address,
          openTime: branch.openTime,
          closeTime: branch.closeTime,
        },
        roomType: typeOf(db, room.roomTypeId),
        rating: {
          average: reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0,
          count: reviews.length,
        },
      }
      return ok(detail)
    }),
  ),

  http.get(
    api('/rooms/:id/price-quote'),
    route(({ request, params }) => {
      const db = getDb()
      const room = db.rooms.find((r) => r.id === num(params.id)) ?? notFound('Không tìm thấy phòng')
      const { start, end } = parseWindow(new URL(request.url))
      const q = quoteRoom(db, room, start, end)
      return ok({ roomId: room.id, start: toApiTime(start), end: toApiTime(end), ...q })
    }),
  ),

  http.get(
    api('/rooms/:id/reviews'),
    route(({ params }) => {
      const db = getDb()
      const roomId = num(params.id)
      const reviews = db.reviews
        .map((r) => ({ r, b: db.bookings.find((b) => b.id === r.bookingId)! }))
        .filter(({ b }) => b.roomId === roomId)
        .sort((x, y) => y.r.createdAt.localeCompare(x.r.createdAt))
        .slice(0, 20)
        .map(({ r, b }) => ({
          id: r.id,
          bookingId: r.bookingId,
          rating: r.rating,
          comment: r.comment,
          customerName: db.users.find((u) => u.id === b.userId)?.fullName ?? 'Khách hàng',
          createdAt: r.createdAt,
        }))
      return ok(reviews)
    }),
  ),

  http.get(
    api('/menu-items'),
    route(({ request }) => {
      const url = new URL(request.url)
      const category = url.searchParams.get('category')
      const onlyAvailable = url.searchParams.get('available') === 'true'
      return ok(
        getDb().menuItems.filter(
          (m) => (!category || m.category === category) && (!onlyAvailable || m.available),
        ),
      )
    }),
  ),
]
