import type { DayType, PriceRule } from '@/types/domain'
import { minutesOf } from './time'

/** Khung giá có phủ phút `minute` trong ngày không (end ≤ start = qua đêm, start = end = cả ngày). */
export function ruleCovers(
  rule: Pick<PriceRule, 'startHour' | 'endHour'>,
  minute: number,
): boolean {
  const s = minutesOf(rule.startHour)
  const e = minutesOf(rule.endHour)
  return s < e ? minute >= s && minute < e : minute >= s || minute < e
}

/** Đơn giá của loại ngày tại giờ `hhmm` (dùng cho bảng giá hiển thị). */
export function priceAt(rules: PriceRule[], dayType: DayType, hhmm: string): number | undefined {
  return rules.find((r) => r.dayType === dayType && ruleCovers(r, minutesOf(hhmm)))?.pricePerHour
}
