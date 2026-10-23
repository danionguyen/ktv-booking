import { http } from 'msw'
import { businessWindow, vn } from '@utils/time'
import { getDb, type DbBooking, type MockDb } from '../db'
import { api, ok, requireUser, route } from '../http'
import { roomOf, totalOf, typeOf } from '../logic'

function filterFrom(request: Request) {
  const url = new URL(request.url)
  const today = vn().format('YYYY-MM-DD')
  return {
    url,
    from: url.searchParams.get('from') ?? vn().subtract(29, 'day').format('YYYY-MM-DD'),
    to: url.searchParams.get('to') ?? today,
    branchId: url.searchParams.get('branchId') ? Number(url.searchParams.get('branchId')) : null,
  }
}

function inRange(db: MockDb, request: Request) {
  const f = filterFrom(request)
  const bookings = db.bookings.filter((b) => {
    const day = vn(b.startTime).format('YYYY-MM-DD')
    return (
      day >= f.from &&
      day <= f.to &&
      (!f.branchId || roomOf(db, b.roomId)?.branchId === f.branchId) &&
      b.status !== 'EXPIRED'
    )
  })
  return { ...f, bookings }
}

const OCCUPYING: DbBooking['status'][] = ['COMPLETED', 'CHECKED_IN', 'CONFIRMED']

/** Tỷ lệ lấp đầy = giờ đã bán / (số phòng hoạt động × giờ mở cửa × số ngày). */
function occupancy(db: MockDb, request: Request) {
  const { from, to, branchId, bookings } = inRange(db, request)
  const branches = db.branches.filter((b) => !branchId || b.id === branchId)
  const byHour = new Map<number, { used: number; capacity: number }>()
  let used = 0
  let capacity = 0
  // Đổi trước sang mili-giây theo phòng: vòng lặp giờ × phòng không phải parse ngày nữa
  const spans = new Map<number, [number, number][]>()
  for (const b of bookings) {
    if (!OCCUPYING.includes(b.status)) continue
    const list = spans.get(b.roomId) ?? []
    list.push([vn(b.startTime).valueOf(), vn(b.endTime).valueOf()])
    spans.set(b.roomId, list)
  }
  for (let d = vn(from); !d.isAfter(vn(to), 'day'); d = d.add(1, 'day')) {
    const date = d.format('YYYY-MM-DD')
    for (const branch of branches) {
      const { open, close } = businessWindow(date, branch.openTime, branch.closeTime)
      const rooms = db.rooms.filter((r) => r.branchId === branch.id && r.status === 'ACTIVE')
      for (let t = open; t.isBefore(close); t = t.add(1, 'hour')) {
        const start = t.valueOf()
        const end = start + 3_600_000
        const busy = rooms.filter((r) =>
          spans.get(r.id)?.some(([s, e]) => s < end && e > start),
        ).length
        const hour = t.hour()
        const cell = byHour.get(hour) ?? { used: 0, capacity: 0 }
        cell.used += busy
        cell.capacity += rooms.length
        byHour.set(hour, cell)
        used += busy
        capacity += rooms.length
      }
    }
  }
  const order = (h: number) => (h < 5 ? h + 24 : h)
  return {
    rate: capacity ? used / capacity : 0,
    byHour: [...byHour.entries()]
      .sort((a, b) => order(a[0]) - order(b[0]))
      .map(([hour, c]) => ({ hour, rate: c.capacity ? c.used / c.capacity : 0 })),
  }
}

const admin = (request: Request) => requireUser(request, ['ADMIN'])

export const statsHandlers = [
  http.get(
    api('/admin/stats/summary'),
    route(({ request }) => {
      admin(request)
      const db = getDb()
      const { bookings } = inRange(db, request)
      const completed = bookings.filter((b) => b.status === 'COMPLETED')
      const revenue = completed.reduce((s, b) => s + totalOf(db, b), 0)
      return ok({
        revenue,
        bookings: bookings.length,
        completedBookings: completed.length,
        cancelledBookings: bookings.filter((b) => b.status === 'CANCELLED').length,
        occupancyRate: occupancy(db, request).rate,
        avgTicket: completed.length ? Math.round(revenue / completed.length / 1000) * 1000 : 0,
      })
    }),
  ),
  http.get(
    api('/admin/stats/revenue'),
    route(({ request }) => {
      admin(request)
      const db = getDb()
      const { from, to, bookings, url } = inRange(db, request)
      const groupBy = url.searchParams.get('groupBy') === 'MONTH' ? 'MONTH' : 'DAY'
      const fmt = groupBy === 'MONTH' ? 'YYYY-MM' : 'YYYY-MM-DD'
      const buckets = new Map<string, number>()
      for (let d = vn(from); !d.isAfter(vn(to), 'day'); d = d.add(1, 'day'))
        buckets.set(d.format(fmt), 0)
      for (const b of bookings.filter((x) => x.status === 'COMPLETED')) {
        const key = vn(b.startTime).format(fmt)
        buckets.set(key, (buckets.get(key) ?? 0) + totalOf(db, b))
      }
      return ok([...buckets.entries()].map(([period, amount]) => ({ period, amount })))
    }),
  ),
  http.get(
    api('/admin/stats/occupancy'),
    route(({ request }) => {
      admin(request)
      return ok(occupancy(getDb(), request))
    }),
  ),
  http.get(
    api('/admin/stats/top-rooms'),
    route(({ request }) => {
      admin(request)
      const db = getDb()
      const { bookings, url } = inRange(db, request)
      const limit = Number(url.searchParams.get('limit') ?? 5)
      const map = new Map<number, { bookings: number; revenue: number }>()
      for (const b of bookings.filter((x) => x.status === 'COMPLETED')) {
        const cur = map.get(b.roomId) ?? { bookings: 0, revenue: 0 }
        cur.bookings += 1
        cur.revenue += totalOf(db, b)
        map.set(b.roomId, cur)
      }
      return ok(
        [...map.entries()]
          .sort((a, b) => b[1].revenue - a[1].revenue)
          .slice(0, limit)
          .map(([roomId, v]) => {
            const room = roomOf(db, roomId)!
            return {
              roomId,
              code: room.code,
              type: typeOf(db, room.roomTypeId).name,
              branchName: db.branches.find((b) => b.id === room.branchId)!.name,
              ...v,
            }
          }),
      )
    }),
  ),
  http.get(
    api('/admin/stats/top-items'),
    route(({ request }) => {
      admin(request)
      const db = getDb()
      const { bookings, url } = inRange(db, request)
      const limit = Number(url.searchParams.get('limit') ?? 5)
      const ids = new Set(bookings.filter((b) => b.status === 'COMPLETED').map((b) => b.id))
      const map = new Map<number, { quantity: number; revenue: number }>()
      for (const i of db.bookingItems.filter((x) => ids.has(x.bookingId))) {
        const cur = map.get(i.menuItemId) ?? { quantity: 0, revenue: 0 }
        cur.quantity += i.quantity
        cur.revenue += i.quantity * i.unitPrice
        map.set(i.menuItemId, cur)
      }
      return ok(
        [...map.entries()]
          .sort((a, b) => b[1].quantity - a[1].quantity)
          .slice(0, limit)
          .map(([menuItemId, v]) => {
            const m = db.menuItems.find((x) => x.id === menuItemId)
            return {
              menuItemId,
              name: m?.name ?? 'Món đã xóa',
              category: m?.category ?? 'FOOD',
              ...v,
            }
          }),
      )
    }),
  ),
]
