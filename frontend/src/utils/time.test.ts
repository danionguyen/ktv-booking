import { dayjs, TZ } from './format'
import { startTimeOptions, validateBookingWindow } from './time'

const at = (s: string) => dayjs.tz(s, 'YYYY-MM-DD HH:mm', TZ)
const branch = { openTime: '09:00', closeTime: '02:00' }
const now = at('2026-10-28 10:00')

describe('validateBookingWindow (BR-01..03)', () => {
  it('hợp lệ', () => {
    expect(validateBookingWindow(at('2026-10-28 19:00'), 2.5, branch, now)).toBeNull()
  })
  it('qua đêm trong giờ mở cửa', () => {
    expect(validateBookingWindow(at('2026-10-28 23:30'), 2.5, branch, now)).toBeNull()
    expect(validateBookingWindow(at('2026-10-29 00:30'), 1.5, branch, now)).toBeNull()
  })
  it('vượt giờ đóng cửa', () => {
    expect(validateBookingWindow(at('2026-10-29 01:00'), 2, branch, now)).toMatch(/giờ mở cửa/)
  })
  it('sớm hơn now + 30 phút', () => {
    expect(validateBookingWindow(at('2026-10-28 10:15'), 1, branch, now)).toMatch(/30 phút/)
  })
  it('quá 14 ngày', () => {
    expect(validateBookingWindow(at('2026-11-15 19:00'), 1, branch, now)).toMatch(/14 ngày/)
  })
  it('thời lượng sai bước', () => {
    expect(validateBookingWindow(at('2026-10-28 19:00'), 1.25, branch, now)).toMatch(/bước 30 phút/)
    expect(validateBookingWindow(at('2026-10-28 19:00'), 7, branch, now)).toMatch(/1 đến 6/)
  })
})

describe('startTimeOptions', () => {
  it('từ giờ mở cửa tới đóng cửa − 1 giờ, bước 30 phút', () => {
    const opts = startTimeOptions('09:00', '02:00')
    expect(opts[0]).toBe('09:00')
    expect(opts.at(-1)).toBe('01:00')
    expect(opts).toContain('23:30')
  })
})
