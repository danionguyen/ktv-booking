import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CancelDialog } from '@components/booking/CancelDialog'
import { ReviewDialog } from '@components/booking/ReviewDialog'
import { InfoRow } from '@components/InfoRow'
import { Notice } from '@components/Notice'
import { StarRating } from '@components/StarRating'
import { BookingStatusBadge } from '@components/StatusBadge'
import { ErrorState, LoadingState } from '@components/states'
import { Button } from '@components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@components/ui/table'
import { HoldCountdown } from '@features/room-map/HoldCountdown'
import { useBooking, useCancelBooking, useRepay, useReview } from '@hooks/queries/useBookings'
import { PAYMENT_METHOD_LABEL } from '@utils/booking'
import { cn } from '@lib/utils'
import {
  formatDate,
  formatDateLong,
  formatDateTime,
  formatHours,
  formatTime,
  formatVND,
} from '@utils/format'
import { goToPayment } from '@utils/payment'
import { vn } from '@utils/time'
import type { Booking } from '@/types/domain'

interface Step {
  title: string
  note: string
  done: boolean
  danger?: boolean
}

/** Các bước của đơn cho khối "Tiến trình". */
function stepsOf(b: Booking): Step[] {
  const cancelled = b.status === 'CANCELLED' || b.status === 'EXPIRED'
  const confirmed = ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'].includes(b.status)
  const steps: Step[] = [{ title: 'Giữ chỗ', note: formatDateTime(b.createdAt), done: true }]
  if (b.paymentMethod === 'VNPAY')
    steps.push({
      title: 'Thanh toán VNPay',
      note: b.paidAmount > 0 ? formatVND(b.paidAmount) : 'Chờ thanh toán',
      done: b.paidAmount > 0,
    })
  else if (b.paymentMethod === 'CASH')
    steps.push({ title: 'Trả tại quầy', note: 'Thanh toán khi check-out', done: confirmed })
  if (cancelled)
    return [
      ...steps,
      {
        title: b.status === 'EXPIRED' ? 'Hết hạn' : 'Đã hủy',
        note: b.cancelReason ?? 'Phòng đã được mở lại',
        done: true,
        danger: true,
      },
    ]
  return [
    ...steps,
    { title: 'Đã xác nhận', note: 'Email xác nhận đã gửi', done: confirmed },
    {
      title: 'Check-in',
      note: b.checkedInAt
        ? formatDateTime(b.checkedInAt)
        : `Dự kiến ${formatDate(b.startTime)} ${formatTime(b.startTime)}`,
      done: !!b.checkedInAt,
    },
    {
      title: 'Hoàn thành & đánh giá',
      note: b.checkedOutAt ? formatDateTime(b.checkedOutAt) : 'Trong 7 ngày sau khi hát',
      done: b.status === 'COMPLETED',
    },
  ]
}

/** SCR-C12 */
export function BookingDetailPage() {
  const id = Number(useParams().id)
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const booking = useBooking(id)
  const cancel = useCancelBooking(id)
  const review = useReview(id)
  const repay = useRepay()
  const [cancelOpen, setCancelOpen] = useState(false)
  const reviewOpen = params.get('review') === '1'
  const setReviewOpen = (open: boolean) => setParams(open ? { review: '1' } : {}, { replace: true })

  if (booking.isPending) return <LoadingState />
  if (booking.isError)
    return <ErrorState error={booking.error} onRetry={() => void booking.refetch()} />
  const b = booking.data
  const hoursLeft = vn(b.startTime).diff(vn(), 'minute') / 60
  const tooLateToCancel =
    (b.status === 'CONFIRMED' || b.status === 'PENDING_PAYMENT') && hoursLeft < 2 && hoursLeft > 0
  const hours = vn(b.endTime).diff(vn(b.startTime), 'minute') / 60
  const line = b.priceBreakdown.length === 1 ? b.priceBreakdown[0] : null

  return (
    <div className="flex flex-col gap-6">
      <nav className="text-muted-foreground text-xs whitespace-pre" aria-label="Breadcrumb">
        <Link to="/my-bookings" className="hover:text-foreground">
          Đặt phòng của tôi
        </Link>
        {'  /  '}
        <span>{b.code}</span>
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="flex flex-wrap items-center gap-3 text-[28px] leading-9 font-bold">
            Đơn {b.code} <BookingStatusBadge status={b.status} />
          </h1>
          <p className="text-muted-foreground text-sm">
            Đặt lúc {formatDateTime(b.createdAt)}
            {b.paymentMethod &&
              ` · ${b.paymentMethod === 'VNPAY' ? 'Thanh toán VNPay' : 'Trả tại quầy'}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {b.actions.canContinue && (
            <Button asChild>
              <Link to={`/checkout/${b.id}`}>Tiếp tục đặt</Link>
            </Button>
          )}
          {b.actions.canPay && (
            <Button
              disabled={repay.isPending}
              onClick={() =>
                repay.mutate(b.id, { onSuccess: (r) => goToPayment(r.paymentUrl, navigate) })
              }
            >
              Thanh toán lại
            </Button>
          )}
          {b.actions.canReview && <Button onClick={() => setReviewOpen(true)}>Đánh giá</Button>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="bg-card flex flex-col gap-4 rounded-xl border p-6">
            <h2 className="text-base font-semibold">Thông tin đặt phòng</h2>
            <dl className="flex flex-col gap-4">
              <InfoRow label="Chi nhánh">{b.branch.name}</InfoRow>
              <InfoRow label="Địa chỉ">{b.branch.address}</InfoRow>
              <InfoRow label="Phòng">
                {b.room.code} – {b.room.type} · tối đa {b.room.capacity} người
              </InfoRow>
              <InfoRow label="Thời gian">
                {formatDateLong(b.startTime)} · {formatTime(b.startTime)} – {formatTime(b.endTime)}
              </InfoRow>
              <InfoRow label="Số người">{b.people}</InfoRow>
              {b.cancelReason && <InfoRow label="Lý do hủy">{b.cancelReason}</InfoRow>}
            </dl>
            {b.status === 'CONFIRMED' && b.paymentMethod === 'VNPAY' && (
              <Notice tone="info">
                Bạn có thể check-in tại quầy từ{' '}
                {formatTime(vn(b.startTime).subtract(15, 'minute').toISOString())} (15 phút trước
                giờ bắt đầu).
              </Notice>
            )}
            {b.status === 'CONFIRMED' && b.paymentMethod === 'CASH' && (
              <Notice tone="warning">
                Vui lòng đến quầy trước giờ hát. Đơn trả tại quầy sẽ tự hủy nếu không check-in sau
                15 phút kể từ giờ bắt đầu.
              </Notice>
            )}
            {b.status === 'PENDING_PAYMENT' && b.holdExpiresAt && (
              <Notice tone="warning">
                Đơn đang chờ thanh toán VNPay. Hết hạn sau{' '}
                <HoldCountdown
                  deadline={b.holdExpiresAt}
                  serverTime={b.serverTime}
                  compact
                  className="font-sans"
                />
              </Notice>
            )}
          </section>

          {b.items.length > 0 && (
            <section className="bg-card flex flex-col gap-4 rounded-xl border p-6">
              <h2 className="text-base font-semibold">Đồ ăn uống đặt trước</h2>
              <div className="overflow-hidden rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Món</TableHead>
                      <TableHead className="text-right">SL</TableHead>
                      <TableHead className="text-right">Đơn giá</TableHead>
                      <TableHead className="text-right">Thành tiền</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {b.items.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell>
                          {i.name}
                          {!i.preordered && (
                            <span className="text-muted-foreground ml-2 text-xs">
                              (gọi tại quầy)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{i.quantity}</TableCell>
                        <TableCell className="text-right">{formatVND(i.unitPrice)}</TableCell>
                        <TableCell className="text-right">{formatVND(i.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          )}

          <section className="bg-card flex flex-col gap-4 rounded-xl border p-6">
            <h2 className="text-base font-semibold">Thanh toán</h2>
            <dl className="flex flex-col gap-4">
              <InfoRow
                label={
                  line
                    ? `Tiền phòng (${formatHours(line.hours)} × ${formatVND(line.unitPrice)})`
                    : `Tiền phòng (${formatHours(hours)})`
                }
              >
                {formatVND(b.roomAmount)}
              </InfoRow>
              <InfoRow label="Đồ ăn uống">{formatVND(b.fnbAmount)}</InfoRow>
              {b.discount > 0 && (
                <InfoRow label={`Giảm giá (${b.voucherCode})`}>
                  <span className="text-room-available">−{formatVND(b.discount)}</span>
                </InfoRow>
              )}
            </dl>
            <div className="flex items-baseline justify-between border-t pt-4">
              <span className="text-muted-foreground text-sm">Tổng cộng</span>
              <span className="text-link text-2xl font-bold">{formatVND(b.total)}</span>
            </div>
            {b.paidAmount > 0 && (
              <InfoRow
                label={`Đã thanh toán${b.paymentMethod ? ` · ${PAYMENT_METHOD_LABEL[b.paymentMethod]}` : ''}`}
              >
                <span className="text-room-available">{formatVND(b.paidAmount)}</span>
              </InfoRow>
            )}
          </section>

          {b.review && (
            <section className="bg-card flex flex-col gap-2 rounded-xl border p-6">
              <h2 className="text-base font-semibold">Đánh giá của bạn</h2>
              <StarRating value={b.review.rating} />
              {b.review.comment && <p className="text-sm">{b.review.comment}</p>}
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-6 lg:self-start">
          <section className="bg-card flex flex-col gap-4 rounded-xl border p-6">
            <h2 className="text-base font-semibold">Tiến trình</h2>
            <ol className="flex flex-col gap-4">
              {stepsOf(b).map((s) => (
                <li key={s.title} className="flex gap-3">
                  <span
                    className={cn(
                      'mt-1 size-3 shrink-0 rounded-full',
                      s.danger
                        ? 'bg-room-booked'
                        : s.done
                          ? 'bg-primary'
                          : 'border-muted-foreground border',
                    )}
                  />
                  <div className="flex flex-col">
                    <span
                      className={cn('text-sm font-semibold', !s.done && 'text-muted-foreground')}
                    >
                      {s.title}
                    </span>
                    <span className="text-muted-foreground text-xs">{s.note}</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {(b.actions.canCancel || tooLateToCancel) && (
            <section className="bg-card flex flex-col gap-4 rounded-xl border p-6">
              <h2 className="text-base font-semibold">Hủy đặt phòng</h2>
              {tooLateToCancel ? (
                <p className="text-muted-foreground text-sm">
                  Còn dưới 2 giờ trước giờ hát — không thể hủy online. Gọi {b.branch.phone} để được
                  hỗ trợ.
                </p>
              ) : (
                <>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Hủy trước {formatDateTime(vn(b.startTime).subtract(24, 'hour').toISOString())}{' '}
                    để được hoàn 100%. Từ 2 – 24 giờ trước giờ hát hoàn 50%.
                  </p>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => setCancelOpen(true)}
                  >
                    Hủy đặt phòng
                  </Button>
                </>
              )}
            </section>
          )}
        </aside>
      </div>

      <CancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        refundPercent={b.actions.refundPercent}
        paidAmount={b.paidAmount}
        subtitle={`${b.code} · ${b.room.code} – ${b.room.type} · ${formatDate(b.startTime)} ${formatTime(b.startTime)}`}
        loading={cancel.isPending}
        onConfirm={(reason) =>
          cancel.mutate(reason, {
            onSuccess: (r) => {
              setCancelOpen(false)
              toast.success(
                r.refundAmount > 0
                  ? `Đã hủy đơn · hoàn ${formatVND(r.refundAmount)} (${r.refundPercent}%)`
                  : 'Đã hủy đơn',
              )
            },
          })
        }
      />
      <ReviewDialog
        open={reviewOpen && b.actions.canReview}
        onOpenChange={setReviewOpen}
        roomLabel={`phòng ${b.room.code} – ${b.room.type}`}
        subtitle={`${b.branch.name} · hát ngày ${formatDate(b.startTime)}`}
        loading={review.isPending}
        onSubmit={(rating, comment) =>
          review.mutate(
            { rating, comment },
            {
              onSuccess: () => {
                setReviewOpen(false)
                toast.success('Cảm ơn bạn đã đánh giá!')
              },
            },
          )
        }
      />
    </div>
  )
}
