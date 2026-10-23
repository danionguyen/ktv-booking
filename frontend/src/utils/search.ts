import type { Branch } from '@/types/domain'
import { combineDateTime, MIN_LEAD_MINUTES, startTimeOptions, toApiTime, vn } from './time'

export interface SearchValues {
  branchId: number
  date: string // YYYY-MM-DD (ngày kinh doanh)
  time: string // HH:mm
  hours: number
  people: number
}

/** Giờ bắt đầu hợp lệ của ngày `date` (bỏ các giờ đã qua + 30 phút với hôm nay). */
export function availableStartTimes(branch: Pick<Branch, 'openTime' | 'closeTime'>, date: string) {
  const earliest = vn().add(MIN_LEAD_MINUTES, 'minute')
  return startTimeOptions(branch.openTime, branch.closeTime).filter((t) =>
    combineDateTime(date, t, branch.openTime).isAfter(earliest),
  )
}

/** Mặc định: chi nhánh đầu, khung giờ gần nhất còn đặt được, 2 giờ, 4 người. */
export function defaultSearch(branch: Branch): SearchValues {
  let date = vn()
  if (date.format('HH:mm') < branch.openTime) date = date.subtract(1, 'day')
  let times = availableStartTimes(branch, date.format('YYYY-MM-DD'))
  if (times.length === 0) {
    date = date.add(1, 'day')
    times = availableStartTimes(branch, date.format('YYYY-MM-DD'))
  }
  const preferred = times.find((t) => t >= '19:00') ?? times[0] ?? branch.openTime
  return {
    branchId: branch.id,
    date: date.format('YYYY-MM-DD'),
    time: preferred,
    hours: 2,
    people: 4,
  }
}

export function parseSearch(params: URLSearchParams): Partial<SearchValues> {
  const n = (k: string) => (params.get(k) ? Number(params.get(k)) : undefined)
  return {
    branchId: n('branchId'),
    date: params.get('date') ?? undefined,
    time: params.get('time') ?? undefined,
    hours: n('hours'),
    people: n('people'),
  }
}

export function toSearchParams(v: SearchValues, extra?: Record<string, string>) {
  return new URLSearchParams({
    branchId: String(v.branchId),
    date: v.date,
    time: v.time,
    hours: String(v.hours),
    people: String(v.people),
    ...extra,
  })
}

export function startIsoOf(v: SearchValues, branch: Pick<Branch, 'openTime'>) {
  return toApiTime(combineDateTime(v.date, v.time, branch.openTime))
}

export function endIsoOf(v: SearchValues, branch: Pick<Branch, 'openTime'>) {
  return toApiTime(combineDateTime(v.date, v.time, branch.openTime).add(v.hours * 60, 'minute'))
}
