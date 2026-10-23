import type { Dayjs } from 'dayjs'
import type { DayType, Holiday, PriceLine, PriceRule } from '@/types/domain'
import { ruleCovers } from '@utils/price'
import { vn } from '@utils/time'

const STEP = 30 // phút — mọi lượt đặt đều theo bước 30 phút (BR-01)

export class PriceNotConfiguredError extends Error {}

/** Ngày kinh doanh: trước 05:00 sáng vẫn tính là ngày hôm trước (khung qua đêm). */
export function dayTypeOf(t: Dayjs, holidays: Holiday[]): DayType {
  const businessDay = t.hour() < 5 ? t.subtract(1, 'day') : t
  const date = businessDay.format('YYYY-MM-DD')
  if (holidays.some((h) => h.date === date)) return 'HOLIDAY'
  const dow = businessDay.day()
  return dow === 0 || dow === 6 ? 'WEEKEND' : 'WEEKDAY'
}

export function roundTo1000(amount: number): number {
  return Math.round(amount / 1000) * 1000
}

/**
 * BR-20: tiền phòng = Σ (số giờ rơi vào từng khung × đơn giá khung).
 * Duyệt từng bước 30 phút, gộp các bước liên tiếp cùng khung thành một dòng.
 */
export function quote(
  rules: PriceRule[],
  holidays: Holiday[],
  start: Dayjs,
  end: Dayjs,
): { breakdown: PriceLine[]; total: number } {
  const lines: (PriceLine & { rule: PriceRule })[] = []
  for (let t = vn(start); t.isBefore(end); t = t.add(STEP, 'minute')) {
    const dayType = dayTypeOf(t, holidays)
    const minute = t.hour() * 60 + t.minute()
    const rule = rules.find((r) => r.dayType === dayType && ruleCovers(r, minute))
    if (!rule) throw new PriceNotConfiguredError(`Chưa cấu hình giá cho ${t.format('HH:mm DD/MM')}`)
    const last = lines.at(-1)
    const stepEnd = t.add(STEP, 'minute')
    if (last && last.rule === rule && last.to === t.format('HH:mm')) {
      last.to = stepEnd.format('HH:mm')
      last.hours += STEP / 60
      last.amount = last.hours * rule.pricePerHour
    } else {
      lines.push({
        rule,
        from: t.format('HH:mm'),
        to: stepEnd.format('HH:mm'),
        dayType,
        unitPrice: rule.pricePerHour,
        hours: STEP / 60,
        amount: (rule.pricePerHour * STEP) / 60,
      })
    }
  }
  const breakdown: PriceLine[] = lines.map((l) => ({
    from: l.from,
    to: l.to,
    dayType: l.dayType,
    unitPrice: l.unitPrice,
    hours: l.hours,
    amount: l.amount,
  }))
  return { breakdown, total: roundTo1000(breakdown.reduce((s, l) => s + l.amount, 0)) }
}
