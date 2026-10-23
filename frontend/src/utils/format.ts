import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import isoWeek from 'dayjs/plugin/isoWeek'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(isoWeek)
dayjs.extend(relativeTime)
dayjs.locale('vi')

export const TZ = 'Asia/Ho_Chi_Minh'
dayjs.tz.setDefault(TZ)

export { dayjs }

const vndFormatter = new Intl.NumberFormat('vi-VN')

/** `formatVND(480000)` → `480.000đ` */
export function formatVND(amount: number): string {
  return `${vndFormatter.format(amount)}đ`
}

export function formatNumber(value: number): string {
  return vndFormatter.format(value)
}

/** `2026-10-21T19:00:00+07:00` → `19:00 21/10/2026` */
export function formatDateTime(iso: string): string {
  return dayjs(iso).tz(TZ).format('HH:mm DD/MM/YYYY')
}

export function formatDate(iso: string): string {
  return dayjs(iso).tz(TZ).format('DD/MM/YYYY')
}

export function formatTime(iso: string): string {
  return dayjs(iso).tz(TZ).format('HH:mm')
}

/** `Thứ Tư, 28/10/2026` */
export function formatDateLong(iso: string): string {
  const s = dayjs(iso).tz(TZ).format('dddd, DD/MM/YYYY')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** `19:00 – 21:30, 28/10/2026` */
export function formatTimeRange(startIso: string, endIso: string): string {
  return `${formatTime(startIso)} – ${formatTime(endIso)}, ${formatDate(startIso)}`
}

/** `2.5` → `2,5 giờ` */
export function formatHours(hours: number): string {
  return `${String(hours).replace('.', ',')} giờ`
}

export function formatPercent(rate: number, digits = 0): string {
  return `${(rate * 100).toFixed(digits).replace('.', ',')}%`
}

/** "Nguyễn An" → "NA" như avatar trong Figma. */
export function initials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0]
  const last = parts.length > 1 ? parts.at(-1)![0] : ''
  return (first + last).toUpperCase()
}
