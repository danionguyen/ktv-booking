import { dayjs, TZ } from './format'
import type { Dayjs } from 'dayjs'

/** Ép về múi giờ Việt Nam. */
export function vn(input?: string | number | Date | Dayjs): Dayjs {
  return input === undefined ? dayjs().tz(TZ) : dayjs(input).tz(TZ)
}

/** ISO-8601 có offset, đúng format trao đổi với API: `2026-10-28T19:00:00+07:00`. */
export function toApiTime(d: Dayjs): string {
  return d.tz(TZ).format('YYYY-MM-DDTHH:mm:ssZ')
}

/** Ghép ngày `2026-10-28` + giờ `19:00` theo giờ Việt Nam (giờ < giờ mở cửa → sang ngày hôm sau). */
export function combineDateTime(date: string, time: string, openTime?: string): Dayjs {
  let d = dayjs.tz(`${date} ${time}`, 'YYYY-MM-DD HH:mm', TZ)
  if (openTime && time < openTime) d = d.add(1, 'day')
  return d
}

export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Khung giờ hoạt động của "ngày kinh doanh" `date` (đóng cửa qua đêm thì sang ngày hôm sau). */
export function businessWindow(date: string, openTime: string, closeTime: string) {
  const open = dayjs.tz(`${date} ${openTime}`, 'YYYY-MM-DD HH:mm', TZ)
  let close = dayjs.tz(`${date} ${closeTime}`, 'YYYY-MM-DD HH:mm', TZ)
  if (!close.isAfter(open)) close = close.add(1, 'day')
  return { open, close }
}

/** Danh sách giờ bắt đầu, bước 30 phút, từ giờ mở cửa tới (đóng cửa − 1 giờ). */
export function startTimeOptions(openTime: string, closeTime: string): string[] {
  const { open, close } = businessWindow('2000-01-01', openTime, closeTime)
  const out: string[] = []
  for (let t = open; !t.add(1, 'hour').isAfter(close); t = t.add(30, 'minute')) {
    out.push(t.format('HH:mm'))
  }
  return out
}

export const HOUR_OPTIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6]
export const MAX_ADVANCE_DAYS = 14
export const MIN_LEAD_MINUTES = 30

/**
 * Kiểm tra BR-01..BR-03 cho một lượt đặt. Trả về thông báo lỗi tiếng Việt hoặc null.
 * Dùng chung cho form tìm phòng và mock API.
 */
export function validateBookingWindow(
  start: Dayjs,
  hours: number,
  branch: { openTime: string; closeTime: string },
  now: Dayjs = vn(),
): string | null {
  if (hours < 1 || hours > 6 || (hours * 2) % 1 !== 0) {
    return 'Thời lượng từ 1 đến 6 giờ, bước 30 phút'
  }
  if (start.isBefore(now.add(MIN_LEAD_MINUTES, 'minute'))) {
    return 'Giờ bắt đầu phải sau thời điểm hiện tại ít nhất 30 phút'
  }
  if (start.isAfter(now.add(MAX_ADVANCE_DAYS, 'day'))) {
    return 'Chỉ được đặt trước tối đa 14 ngày'
  }
  // Ngày kinh doanh: giờ trước giờ mở cửa thuộc về ngày hôm trước (mở qua đêm)
  const local = start.tz(TZ)
  const businessDate = local.format('HH:mm') < branch.openTime ? local.subtract(1, 'day') : local
  const { open, close } = businessWindow(
    businessDate.format('YYYY-MM-DD'),
    branch.openTime,
    branch.closeTime,
  )
  const end = start.add(hours * 60, 'minute')
  if (start.isBefore(open) || end.isAfter(close)) {
    return `Ngoài giờ mở cửa (${branch.openTime} – ${branch.closeTime})`
  }
  return null
}

/** Chi nhánh có đang mở cửa lúc `now` không (tính cả ca qua đêm của hôm trước). */
export function isOpenAt(
  branch: { openTime: string; closeTime: string },
  now: Dayjs = vn(),
): boolean {
  return [now.subtract(1, 'day'), now].some((d) => {
    const { open, close } = businessWindow(
      d.format('YYYY-MM-DD'),
      branch.openTime,
      branch.closeTime,
    )
    return !now.isBefore(open) && now.isBefore(close)
  })
}
