import { BLOCKING_STATUSES } from '@utils/booking'
import { vn } from '@utils/time'
import { createSeed } from './seed'

describe('createSeed', () => {
  const db = createSeed(1)

  it('có đủ dữ liệu demo', () => {
    expect(db.branches).toHaveLength(3)
    expect(db.rooms.length).toBeGreaterThanOrEqual(20)
    expect(db.users.map((u) => u.email)).toEqual(
      expect.arrayContaining(['admin@ktv.vn', 'staff@ktv.vn', 'customer@ktv.vn']),
    )
    expect(db.bookings.length).toBeGreaterThan(300)
  })

  it('không có 2 đơn đang chặn lịch chồng giờ trên cùng phòng (BR-05, BR-06)', () => {
    const active = db.bookings.filter((b) => BLOCKING_STATUSES.includes(b.status))
    for (const a of active) {
      for (const b of active) {
        if (a.id >= b.id || a.roomId !== b.roomId) continue
        const overlap =
          vn(a.startTime).isBefore(vn(b.endTime).add(15, 'minute')) &&
          vn(b.startTime).isBefore(vn(a.endTime).add(15, 'minute'))
        expect(overlap).toBe(false)
      }
    }
  })

  it('đủ nhỏ để lưu localStorage', () => {
    expect(JSON.stringify(db).length).toBeLessThan(2_500_000)
  })
})
