import { formatDateTime, formatVND } from './format'

describe('formatVND', () => {
  it('dùng dấu chấm phân cách hàng nghìn và hậu tố đ', () => {
    expect(formatVND(480000)).toBe('480.000đ')
    expect(formatVND(0)).toBe('0đ')
  })
})

describe('formatDateTime', () => {
  it('hiển thị theo giờ Việt Nam', () => {
    expect(formatDateTime('2026-10-21T12:00:00Z')).toBe('19:00 21/10/2026')
  })
})
