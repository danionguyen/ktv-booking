import { dayjs, TZ } from '@utils/format'
import type { PriceRule } from '@/types/domain'
import { dayTypeOf, quote } from './pricing'

const at = (s: string) => dayjs.tz(s, 'YYYY-MM-DD HH:mm', TZ)

const standard: PriceRule[] = [
  { roomTypeId: 1, dayType: 'WEEKDAY', startHour: '09:00', endHour: '17:00', pricePerHour: 120000 },
  { roomTypeId: 1, dayType: 'WEEKDAY', startHour: '17:00', endHour: '02:00', pricePerHour: 180000 },
  { roomTypeId: 1, dayType: 'WEEKEND', startHour: '09:00', endHour: '02:00', pricePerHour: 220000 },
  { roomTypeId: 1, dayType: 'HOLIDAY', startHour: '09:00', endHour: '02:00', pricePerHour: 250000 },
]
const vip = standard.map((r) => ({ ...r, pricePerHour: r.pricePerHour * 1.5 }))

describe('quote (BR-20)', () => {
  it('ví dụ docs: Standard thứ Tư 16:00–19:00 = 480.000đ, tách 2 khung', () => {
    const q = quote(standard, [], at('2026-10-28 16:00'), at('2026-10-28 19:00'))
    expect(q.total).toBe(480000)
    expect(q.breakdown).toMatchObject([
      { from: '16:00', to: '17:00', hours: 1, unitPrice: 120000 },
      { from: '17:00', to: '19:00', hours: 2, unitPrice: 180000 },
    ])
  })

  it('ví dụ FD-BKG-01: VIP 19:00–21:30 ngày thường = 675.000đ', () => {
    expect(quote(vip, [], at('2026-10-28 19:00'), at('2026-10-28 21:30')).total).toBe(675000)
  })

  it('qua nửa đêm vẫn thuộc ngày kinh doanh trước (thứ Sáu 23:00 → thứ Bảy 01:00 = giá ngày thường)', () => {
    const q = quote(standard, [], at('2026-10-30 23:00'), at('2026-10-31 01:00'))
    expect(q.breakdown).toHaveLength(1)
    expect(q.breakdown[0].dayType).toBe('WEEKDAY')
    expect(q.total).toBe(360000)
  })

  it('ngày lễ dùng giá HOLIDAY', () => {
    const holidays = [{ date: '2026-10-28', name: 'Test' }]
    expect(dayTypeOf(at('2026-10-28 20:00'), holidays)).toBe('HOLIDAY')
    expect(quote(standard, holidays, at('2026-10-28 20:00'), at('2026-10-28 21:00')).total).toBe(
      250000,
    )
  })

  it('thiếu khung giá → lỗi PRICE_NOT_CONFIGURED', () => {
    expect(() => quote(standard, [], at('2026-10-28 05:00'), at('2026-10-28 06:00'))).toThrow()
  })
})
