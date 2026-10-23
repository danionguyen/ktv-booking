import { SearchIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { DatePicker } from '@components/DatePicker'
import { PageHeader } from '@components/PageHeader'
import { Segmented } from '@components/Segmented'
import { StatCard } from '@components/StatCard'
import { BranchSwitcher } from '@components/staff/BranchSwitcher'
import { WalkInDialog } from '@components/staff/WalkInDialog'
import { BookingStatusBadge } from '@components/StatusBadge'
import { ErrorState, LoadingState } from '@components/states'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@components/ui/tooltip'
import { useRoomStatus } from '@features/room-map/useRoomStatus'
import { useTimeline } from '@hooks/queries/useStaff'
import { useStaffBranch } from '@hooks/useStaffBranch'
import { cn } from '@lib/utils'
import { BOOKING_BLOCK_CLASS, PAYMENT_METHOD_LABEL } from '@utils/booking'
import { formatDateLong, formatTime } from '@utils/format'
import { businessWindow, vn } from '@utils/time'
import type { TimelineBooking } from '@/types/domain'

/** 1 cột = 30 phút như Figma (60px / giờ). */
const PX_PER_HOUR = 60
const ROW_HEIGHT = 44
const NAME_COL = 104
const LEGEND = [
  { label: 'Đang hát', className: 'bg-primary' },
  { label: 'Đã xác nhận', className: 'bg-info' },
  { label: 'Đang giữ / chờ TT', className: 'bg-room-held' },
  { label: 'Hoàn thành / bảo trì', className: 'bg-room-maintenance' },
]

/** Ngày kinh doanh hiện tại (trước giờ mở cửa vẫn tính là hôm trước). */
function currentBusinessDate(openTime = '09:00') {
  const now = vn()
  return (now.format('HH:mm') < openTime && now.hour() < 6 ? now.subtract(1, 'day') : now).format(
    'YYYY-MM-DD',
  )
}

/** "KTV-20261022-0052" → "KTV-...0052" */
const shortCode = (code: string) => `${code.slice(0, 4)}...${code.slice(-4)}`

function blockLabel(b: TimelineBooking) {
  switch (b.status) {
    case 'CHECKED_IN':
      return `${b.customerName} · ${b.people} người`
    case 'CONFIRMED':
      return `${shortCode(b.code)} · ${b.customerName}`
    case 'HOLD':
      return `Đang giữ · ${b.customerName}`
    case 'PENDING_PAYMENT':
      return `Chờ thanh toán · ${b.customerName}`
    case 'COMPLETED':
      return 'Hoàn thành'
    default:
      return b.customerName
  }
}

const matches = (b: TimelineBooking, q: string) =>
  [b.code, b.phone, b.customerName].some((v) => v.toLowerCase().includes(q))

/** SCR-S01 */
export function TimelinePage() {
  const [params, setParams] = useSearchParams()
  const date = params.get('date') ?? currentBusinessDate()
  const { branchId } = useStaffBranch()
  const timeline = useTimeline(date, branchId)
  useRoomStatus(timeline.data?.branch.id)
  const [walkIn, setWalkIn] = useState<{ roomId?: number } | null>(null)
  const [query, setQuery] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [, tick] = useState(0)

  // Vạch "bây giờ" chạy theo phút
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 60_000)
    return () => clearInterval(t)
  }, [])

  const setDate = (d: string) => {
    const next = new URLSearchParams(params)
    next.set('date', d)
    setParams(next, { replace: true })
  }

  const data = timeline.data
  const span = data ? businessWindow(data.date, data.branch.openTime, data.branch.closeTime) : null
  const hours = span ? span.close.diff(span.open, 'hour') : 0
  const now = vn()
  const nowX =
    span && now.isAfter(span.open) && now.isBefore(span.close)
      ? (now.diff(span.open, 'minute') / 60) * PX_PER_HOUR
      : null

  // Cuộn tới giờ hiện tại khi mở trang
  useEffect(() => {
    if (nowX !== null && scrollRef.current) scrollRef.current.scrollLeft = Math.max(0, nowX - 400)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.date, data?.branch.id])

  const isToday = date === currentBusinessDate(data?.branch.openTime)
  const q = query.trim().toLowerCase()
  const rooms = data
    ? q
      ? data.rooms.filter((r) => r.bookings.some((b) => matches(b, q)))
      : data.rooms
    : []

  const stats = useMemo(() => {
    if (!data) return null
    const t = vn()
    const soon = t.add(2, 'hour')
    const all = data.rooms.flatMap((r) => r.bookings.map((b) => ({ room: r, b })))
    const singing = all.filter(({ b }) => b.status === 'CHECKED_IN')
    const upcoming = all.filter(
      ({ b }) =>
        ['HOLD', 'PENDING_PAYMENT', 'CONFIRMED'].includes(b.status) &&
        vn(b.start).isAfter(t) &&
        vn(b.start).isBefore(soon),
    )
    const busy = new Set(
      all
        .filter(
          ({ b }) =>
            b.status === 'CHECKED_IN' ||
            (vn(b.start).isBefore(t) &&
              vn(b.end).isAfter(t) &&
              b.status !== 'COMPLETED' &&
              b.status !== 'CANCELLED' &&
              b.status !== 'EXPIRED'),
        )
        .map(({ room }) => room.id),
    )
    const maintenance = data.rooms.filter((r) => r.status === 'MAINTENANCE')
    const free = data.rooms.filter((r) => r.status === 'ACTIVE' && !busy.has(r.id))
    return { singing, upcoming, maintenance, free, from: t, to: soon }
  }, [data])

  const codes = (list: { code: string }[]) => list.map((r) => r.code).join(', ') || '—'

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={
          data ? `${data.branch.name} · ${formatDateLong(vn(date).toISOString())}` : undefined
        }
        title={isToday ? 'Lịch phòng hôm nay' : `Lịch phòng ${vn(date).format('DD/MM/YYYY')}`}
      />
      <div className="flex flex-wrap items-center gap-3">
        <BranchSwitcher />
        <DatePicker value={date} onChange={setDate} className="w-[180px]" />
        <div className="relative min-w-60 flex-1">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm mã đơn / SĐT / tên khách"
            className="pl-9"
            aria-label="Tìm đơn"
          />
        </div>
        <Segmented
          value="timeline"
          options={[
            { value: 'timeline', label: 'Timeline' },
            { value: 'map', label: 'Sơ đồ', to: `/staff/room-map?${params.toString()}` },
          ]}
        />
        <Button onClick={() => setWalkIn({})} disabled={!isToday}>
          + Khách vãng lai
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Đang hát"
            value={stats.singing.length}
            note={codes(stats.singing.map((x) => x.room))}
          />
          <StatCard
            label="Sắp tới (2 giờ)"
            value={stats.upcoming.length}
            note={`Từ ${stats.from.format('HH:mm')} đến ${stats.to.format('HH:mm')}`}
          />
          <StatCard label="Trống" value={stats.free.length} note="Có thể nhận khách ngay" />
          <StatCard
            label="Bảo trì"
            value={stats.maintenance.length}
            note={codes(stats.maintenance)}
          />
        </div>
      )}

      {timeline.isPending ? (
        <LoadingState rows={6} />
      ) : timeline.isError ? (
        <ErrorState error={timeline.error} onRetry={() => void timeline.refetch()} />
      ) : (
        span &&
        data && (
          <div className="bg-card flex flex-col gap-4 rounded-xl border p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Timeline · 1 cột = 30 phút</h2>
              <ul className="text-muted-foreground flex flex-wrap gap-4 text-xs">
                {LEGEND.map((l) => (
                  <li key={l.label} className="inline-flex items-center gap-1.5">
                    <span className={cn('size-2.5 rounded-xs', l.className)} />
                    {l.label}
                  </li>
                ))}
              </ul>
            </div>
            <div ref={scrollRef} className="overflow-x-auto">
              <div className="relative" style={{ width: NAME_COL + hours * PX_PER_HOUR + 24 }}>
                {/* Nhãn giờ */}
                <div className="relative h-8" style={{ marginLeft: NAME_COL }}>
                  {Array.from({ length: hours + 1 }, (_, i) => (
                    <span
                      key={i}
                      className="text-muted-foreground absolute top-1 -translate-x-1/2 text-xs"
                      style={{ left: i * PX_PER_HOUR }}
                    >
                      {span.open.add(i, 'hour').format('HH:mm')}
                    </span>
                  ))}
                </div>
                {rooms.length === 0 && (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    Không có đơn nào khớp “{query}”.
                  </p>
                )}
                {rooms.map((r) => (
                  <div key={r.id} className="flex border-b" style={{ height: ROW_HEIGHT }}>
                    <div
                      className="flex shrink-0 items-center gap-3 px-2"
                      style={{ width: NAME_COL }}
                    >
                      <span className="text-sm font-semibold">{r.code}</span>
                      <span className="text-muted-foreground truncate text-xs">{r.type}</span>
                    </div>
                    <div
                      className="relative flex-1 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px)]"
                      style={{
                        backgroundSize: `${PX_PER_HOUR / 2}px 100%`,
                        width: hours * PX_PER_HOUR,
                      }}
                    >
                      {isToday && r.status === 'ACTIVE' && (
                        <button
                          type="button"
                          aria-label={`Khách vãng lai phòng ${r.code}`}
                          className="hover:bg-primary/5 absolute inset-0"
                          onClick={() => setWalkIn({ roomId: r.id })}
                        />
                      )}
                      {r.status === 'MAINTENANCE' && (
                        <div className="bg-room-maintenance-bg border-room-maintenance text-muted-foreground absolute inset-y-1.5 right-0 left-0 flex items-center rounded-sm border-l-[3px] px-2.5 text-xs">
                          Bảo trì
                        </div>
                      )}
                      {r.bookings.map((b) => {
                        const left = (vn(b.start).diff(span.open, 'minute') / 60) * PX_PER_HOUR
                        const width = (vn(b.end).diff(vn(b.start), 'minute') / 60) * PX_PER_HOUR
                        const dim = q && !matches(b, q)
                        return (
                          <Tooltip key={b.id}>
                            <TooltipTrigger asChild>
                              <Link
                                to={`/staff/bookings/${b.id}`}
                                className={cn(
                                  'absolute inset-y-1.5 flex items-center overflow-hidden rounded-sm border-l-[3px] px-2.5 text-xs hover:z-10 hover:brightness-125',
                                  BOOKING_BLOCK_CLASS[b.status],
                                  dim && 'opacity-30',
                                )}
                                style={{ left: Math.max(0, left), width: Math.max(24, width - 2) }}
                              >
                                <span className="truncate">{blockLabel(b)}</span>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent className="flex flex-col gap-1">
                              <p className="font-semibold">
                                {b.code} · {b.customerName}
                              </p>
                              <p>
                                {formatTime(b.start)}–{formatTime(b.end)} · {b.people} người ·{' '}
                                {b.phone}
                                {b.paymentMethod && ` · ${PAYMENT_METHOD_LABEL[b.paymentMethod]}`}
                              </p>
                              <BookingStatusBadge status={b.status} />
                            </TooltipContent>
                          </Tooltip>
                        )
                      })}
                    </div>
                  </div>
                ))}
                {nowX !== null && (
                  <div
                    className="bg-room-booked pointer-events-none absolute top-1 bottom-0 z-20 w-0.5"
                    style={{ left: NAME_COL + nowX }}
                  >
                    <span className="bg-room-booked absolute top-0 -translate-x-1/2 rounded px-1 text-xs text-white">
                      {now.format('HH:mm')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      )}

      {branchId && (
        <WalkInDialog
          open={!!walkIn}
          onOpenChange={(o) => !o && setWalkIn(null)}
          branchId={branchId}
          roomId={walkIn?.roomId}
        />
      )}
    </div>
  )
}
