import { ArrowRightIcon, ImageIcon, MapPinIcon, StarIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { errorMessage } from '@api/queryClient'
import { PriceTableView } from '@components/booking/PriceTableView'
import { StarRating } from '@components/StarRating'
import { EmptyState, ErrorState, LoadingState } from '@components/states'
import { Tag } from '@components/Tag'
import { Button } from '@components/ui/button'
import { Skeleton } from '@components/ui/skeleton'
import { useRoomStatus } from '@features/room-map/useRoomStatus'
import {
  useBranches,
  usePriceQuote,
  usePriceTable,
  useRoom,
  useRoomMap,
  useRoomReviews,
} from '@hooks/queries/useCatalog'
import { useHoldRoom } from '@hooks/useHoldRoom'
import { LIVE_STATUS_LABEL } from '@utils/booking'
import { dayjs, formatDateLong, formatHours, formatTime, formatVND } from '@utils/format'
import {
  defaultSearch,
  endIsoOf,
  startIsoOf,
  toSearchParams,
  type SearchValues,
} from '@utils/search'
import { vn } from '@utils/time'

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

/** SCR-C08 */
export function RoomDetailPage() {
  const id = Number(useParams().id)
  const [params] = useSearchParams()
  const room = useRoom(id)
  const reviews = useRoomReviews(id)
  const branches = useBranches()
  const branch = branches.data?.find((b) => b.id === room.data?.branchId)

  const initial = useMemo<SearchValues | null>(() => {
    if (!branch || !room.data) return null
    const fallback = defaultSearch(branch)
    const start = params.get('start')
    const startAt = start ? vn(start) : null
    const businessDate =
      startAt && startAt.format('HH:mm') < branch.openTime ? startAt.subtract(1, 'day') : startAt
    return {
      branchId: branch.id,
      date: businessDate?.format('YYYY-MM-DD') ?? fallback.date,
      time: startAt?.format('HH:mm') ?? fallback.time,
      hours: Number(params.get('hours')) || fallback.hours,
      people: Math.min(Number(params.get('people')) || fallback.people, room.data.capacity),
    }
  }, [branch, room.data, params])
  const current = initial
  const [allReviews, setAllReviews] = useState(false)
  const prices = usePriceTable(room.data?.branchId)
  const start = current && branch ? startIsoOf(current, branch) : undefined
  const end = current && branch ? endIsoOf(current, branch) : undefined

  const quote = usePriceQuote(id, start, current?.hours ?? 1)
  const map = useRoomMap(room.data?.branchId, start && end ? { start, end } : undefined)
  useRoomStatus(room.data?.branchId)
  const live = map.data?.rooms.find((r) => r.id === id)
  const { holdRoom, isPending } = useHoldRoom()

  if (room.isPending) return <LoadingState />
  if (room.isError) return <ErrorState error={room.error} onRetry={() => void room.refetch()} />
  const r = room.data
  const tooMany = (current?.people ?? 0) > r.capacity
  const available = live?.status === 'AVAILABLE' && r.status !== 'MAINTENANCE'
  const shown = allReviews ? reviews.data : reviews.data?.slice(0, 3)
  const images = [r.images[0], r.images[1], r.images[2]]

  return (
    <div className="flex flex-col gap-6">
      <nav className="text-muted-foreground text-xs whitespace-pre" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-foreground">
          Trang chủ
        </Link>
        {'  /  '}
        <Link to={`/branches/${r.branch.id}`} className="hover:text-foreground">
          {r.branch.name}
        </Link>
        {'  /  '}
        <span>{r.code}</span>
      </nav>

      <div className="grid gap-3 sm:h-[400px] sm:grid-cols-[2fr_1fr] sm:grid-rows-2">
        {images.map((src, i) => (
          <div
            key={i}
            className={
              'bg-secondary text-primary flex items-center justify-center overflow-hidden rounded-[20px] ' +
              (i === 0 ? 'h-56 sm:row-span-2 sm:h-auto' : 'hidden sm:flex')
            }
          >
            {src ? (
              <img src={src} alt="" className="size-full object-cover" />
            ) : (
              <ImageIcon className="size-7" aria-hidden />
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[28px] leading-9 font-bold">
            {r.code} – {r.type}
          </h1>
          {r.status === 'MAINTENANCE' ? (
            <Tag color="gray">Bảo trì</Tag>
          ) : live ? (
            <Tag color={available ? 'green' : 'red'}>{LIVE_STATUS_LABEL[live.status]}</Tag>
          ) : null}
        </div>
        <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <MapPinIcon className="size-3.5" /> {r.branch.name}
          </span>
          {r.rating.count > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <StarIcon className="fill-room-held text-room-held size-3.5" />
              {r.rating.average.toFixed(1).replace('.', ',')} ({r.rating.count} đánh giá)
            </span>
          )}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="bg-card flex flex-col gap-4 rounded-xl border p-6">
            <h2 className="text-base font-semibold">Mô tả</h2>
            <p className="text-sm leading-relaxed">{r.roomType.description}</p>
            <ul className="flex flex-wrap gap-2">
              {[`Tối đa ${r.capacity} người`, `Phòng ${r.type}`, r.branch.name].map((c) => (
                <li key={c} className="bg-secondary rounded-full px-3 py-1.5 text-xs">
                  {c}
                </li>
              ))}
            </ul>
          </section>

          {prices.data ? (
            <PriceTableView
              table={prices.data}
              roomTypeId={r.roomType.id}
              title={`Bảng giá ${r.type}`}
            />
          ) : (
            <Skeleton className="h-48 rounded-xl" />
          )}

          <section className="bg-card flex flex-col gap-5 rounded-xl border p-6">
            <h2 className="text-base font-semibold">Đánh giá</h2>
            {reviews.isPending ? (
              <LoadingState rows={2} />
            ) : !reviews.data?.length ? (
              <EmptyState
                title="Chưa có đánh giá"
                description="Hãy là người đầu tiên hát và đánh giá phòng này."
              />
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <span className="text-[40px] leading-none font-bold">
                    {r.rating.average.toFixed(1).replace('.', ',')}
                  </span>
                  <div className="flex flex-col gap-1">
                    <StarRating value={r.rating.average} />
                    <span className="text-muted-foreground text-xs">{r.rating.count} đánh giá</span>
                  </div>
                </div>
                <ul className="flex flex-col gap-5">
                  {shown?.map((rv) => (
                    <li key={rv.id} className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{rv.customerName}</span>
                        <StarRating value={rv.rating} size="sm" />
                        <span className="text-muted-foreground text-xs">
                          {dayjs(rv.createdAt).fromNow()}
                        </span>
                      </div>
                      {rv.comment && <p className="text-sm">{rv.comment}</p>}
                    </li>
                  ))}
                </ul>
                {reviews.data.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setAllReviews((v) => !v)}
                    className="text-link inline-flex w-fit items-center gap-1 text-sm font-semibold hover:underline"
                  >
                    {allReviews ? 'Thu gọn' : 'Xem tất cả đánh giá'}{' '}
                    <ArrowRightIcon className="size-4" />
                  </button>
                )}
              </>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <section className="bg-card flex flex-col gap-4 rounded-xl border p-6">
            <h2 className="text-base font-semibold">Đặt phòng này</h2>
            {start && end && current ? (
              <>
                <Row label="Ngày" value={formatDateLong(start)} />
                <Row label="Giờ" value={`${formatTime(start)} – ${formatTime(end)}`} />
                <Row label="Số người" value={`${current.people} / ${r.capacity}`} />
                <div className="border-t" />
                {quote.isPending ? (
                  <Skeleton className="h-12" />
                ) : quote.isError ? (
                  <p className="text-destructive text-sm">{errorMessage(quote.error)}</p>
                ) : (
                  <>
                    {quote.data.breakdown.map((l, i) => (
                      <div key={i} className="flex justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">
                          {formatHours(l.hours)} × {formatVND(l.unitPrice)}
                        </span>
                        <span className="font-semibold tabular-nums">{formatVND(l.amount)}</span>
                      </div>
                    ))}
                    <div className="flex items-baseline justify-between">
                      <span className="text-muted-foreground text-sm">Tạm tính</span>
                      <span className="text-link text-xl font-bold">
                        {formatVND(quote.data.total)}
                      </span>
                    </div>
                  </>
                )}
                {live && !available && (
                  <p className="text-destructive text-sm">
                    Khung giờ này phòng đang “{LIVE_STATUS_LABEL[live.status]}” — hãy{' '}
                    <Link
                      to={`/search?${toSearchParams(current)}`}
                      className="text-link font-semibold hover:underline"
                    >
                      chọn giờ / phòng khác
                    </Link>
                    .
                  </p>
                )}
                {tooMany && (
                  <p className="text-destructive text-sm">
                    Phòng chỉ chứa tối đa {r.capacity} người.
                  </p>
                )}
                <Button
                  className="w-full"
                  disabled={isPending || !available || tooMany || quote.isError}
                  onClick={() =>
                    holdRoom({
                      roomId: id,
                      startTime: start,
                      hours: current.hours,
                      people: current.people,
                    })
                  }
                >
                  {isPending ? 'Đang giữ chỗ…' : 'Chọn phòng'}
                </Button>
                <p className="text-muted-foreground text-xs">
                  Phòng sẽ được giữ cho bạn trong 10 phút để hoàn tất đặt phòng.{' '}
                  <Link
                    to={`/search?${toSearchParams(current)}`}
                    className="text-link font-semibold hover:underline"
                  >
                    Đổi giờ
                  </Link>
                </p>
              </>
            ) : (
              <Skeleton className="h-64" />
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
