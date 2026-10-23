import { ArrowRightIcon, CalendarXIcon, ClockIcon } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import type { MyBookingGroup } from '@/types/domain'
import { LineTabs } from '@components/LineTabs'
import { PageHeader } from '@components/PageHeader'
import { Pagination } from '@components/Pagination'
import { BookingStatusBadge } from '@components/StatusBadge'
import { EmptyState, ErrorState, LoadingState } from '@components/states'
import { Button } from '@components/ui/button'
import { useMyBookings } from '@hooks/queries/useBookings'
import { PAYMENT_METHOD_LABEL } from '@utils/booking'
import { dayjs, formatDateLong, formatTime, formatVND, TZ } from '@utils/format'
import { vn } from '@utils/time'

const GROUPS: { value: MyBookingGroup; label: string }[] = [
  { value: 'UPCOMING', label: 'Sắp tới' },
  { value: 'DONE', label: 'Đã hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' },
]

/** "Hôm nay, 22/10/2026" hoặc "Thứ Tư, 28/10/2026" */
function dayLabel(iso: string) {
  return vn(iso).isSame(vn(), 'day')
    ? `Hôm nay, ${vn(iso).format('DD/MM/YYYY')}`
    : formatDateLong(iso)
}

/** SCR-C11 */
export function MyBookingsPage() {
  const [params, setParams] = useSearchParams()
  const group = (params.get('group') as MyBookingGroup) || 'UPCOMING'
  const page = Number(params.get('page') ?? 0)
  const bookings = useMyBookings(group, page)

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col">
      <PageHeader
        title="Đặt phòng của tôi"
        description="Theo dõi các lượt đặt, thanh toán và đánh giá sau khi hát xong."
      />
      <LineTabs
        className="mb-5"
        value={group}
        onChange={(g) => setParams({ group: g })}
        options={GROUPS.map((g) => ({
          value: g.value,
          label:
            g.value === group && bookings.data ? `${g.label} (${bookings.data.total})` : g.label,
        }))}
      />

      {bookings.isPending ? (
        <LoadingState />
      ) : bookings.isError ? (
        <ErrorState error={bookings.error} onRetry={() => void bookings.refetch()} />
      ) : bookings.data.items.length === 0 ? (
        <EmptyState
          icon={CalendarXIcon}
          title="Chưa có đơn nào"
          description={group === 'UPCOMING' ? 'Đặt phòng ngay để có lịch hát sắp tới.' : undefined}
          action={
            group === 'UPCOMING' && (
              <Button asChild>
                <Link to="/search">Tìm phòng</Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {bookings.data.items.map((b) => {
              const d = dayjs(b.startTime).tz(TZ)
              return (
                <li
                  key={b.id}
                  className="bg-card flex flex-col gap-4 rounded-xl border p-5 sm:flex-row sm:items-center"
                >
                  <div className="bg-secondary text-link flex w-[72px] shrink-0 flex-col items-center rounded-[10px] py-2.5">
                    <span className="text-[28px] leading-9 font-bold">{d.format('DD')}</span>
                    <span className="text-xs">Th{d.month() + 1}</span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="text-muted-foreground text-xs">{b.code}</p>
                    <p className="text-base font-semibold">
                      {b.branch.name} · {b.room.code} – {b.room.type}
                    </p>
                    <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                      <ClockIcon className="size-3.5 shrink-0" />
                      {dayLabel(b.startTime)} · {formatTime(b.startTime)} – {formatTime(b.endTime)}
                      {b.paymentMethod && ` · ${PAYMENT_METHOD_LABEL[b.paymentMethod]}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-1 sm:items-end">
                    <BookingStatusBadge status={b.status} />
                    <span className="text-base font-semibold tabular-nums">
                      {formatVND(b.total)}
                    </span>
                    <div className="flex items-center gap-3 text-xs font-semibold">
                      {b.actions.canContinue && (
                        <Link to={`/checkout/${b.id}`} className="text-link hover:underline">
                          Tiếp tục đặt
                        </Link>
                      )}
                      {b.actions.canReview && (
                        <Link
                          to={`/my-bookings/${b.id}?review=1`}
                          className="text-link hover:underline"
                        >
                          Đánh giá
                        </Link>
                      )}
                      <Link
                        to={`/my-bookings/${b.id}`}
                        className="text-link inline-flex items-center gap-1 font-normal hover:underline"
                      >
                        Xem chi tiết <ArrowRightIcon className="size-3.5" />
                      </Link>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          <Pagination
            page={page}
            size={bookings.data.size}
            total={bookings.data.total}
            onPageChange={(p) => setParams({ group, page: String(p) })}
          />
        </>
      )}
    </div>
  )
}
