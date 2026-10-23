import { useQuery } from '@tanstack/react-query'
import { CircleCheckIcon, CircleXIcon, ClockIcon } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { bookingsApi } from '@api/bookings'
import { InfoRow } from '@components/InfoRow'
import { ErrorState, LoadingState } from '@components/states'
import { Button } from '@components/ui/button'
import { HoldCountdown } from '@features/room-map/HoldCountdown'
import { useBooking, useRepay } from '@hooks/queries/useBookings'
import { useAuth } from '@hooks/useAuth'
import { formatDateTime, formatVND } from '@utils/format'
import { goToPayment } from '@utils/payment'

/** Trang return VNPay (SCR-C10). Kết quả thật do IPN quyết định — trang chỉ hiển thị trạng thái đơn. */
export function PaymentResultPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const query = params.toString()
  const result = useQuery({
    queryKey: ['vnpay-return', query],
    queryFn: () => bookingsApi.vnpayReturn(query),
    retry: false,
    staleTime: Infinity,
  })
  const booking = useBooking(result.data?.bookingId ?? 0)
  const repay = useRepay()

  if (result.isPending) return <LoadingState rows={1} />
  if (result.isError) return <ErrorState error={result.error} />
  const r = result.data
  const success = r.bookingStatus === 'CONFIRMED'
  const b = booking.data
  const canPay = !success && b?.actions.canPay && b.holdExpiresAt
  const txn = params.get('vnp_TransactionNo')

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] leading-9 font-bold">Kết quả thanh toán</h1>
      <section className="bg-card mx-auto flex w-full max-w-[560px] flex-col items-center gap-5 rounded-2xl border px-10 py-12 text-center">
        <p className="text-muted-foreground text-xs">
          Trạng thái: {success ? 'thành công' : canPay ? 'thất bại, còn hạn' : 'thất bại'}
        </p>
        {success ? (
          <CircleCheckIcon className="text-room-available size-16" strokeWidth={1.75} />
        ) : (
          <CircleXIcon className="text-room-booked size-16" strokeWidth={1.75} />
        )}
        <h2 className="text-[28px] leading-9 font-bold">
          {success ? 'Thanh toán thành công' : 'Thanh toán chưa thành công'}
        </h2>
        <p className="text-muted-foreground text-sm">
          {success
            ? `Đơn của bạn đã được xác nhận. Email xác nhận đã gửi tới ${user?.email ?? 'bạn'}.`
            : canPay
              ? 'Giao dịch bị hủy hoặc thất bại. Bạn có thể thanh toán lại trước khi đơn hết hạn.'
              : `Giao dịch bị hủy hoặc lỗi (mã ${r.responseCode}). Phòng đã được mở lại.`}
        </p>
        {canPay && (
          <div className="bg-room-held-bg border-room-held flex w-full items-center gap-2.5 rounded-lg border px-4 py-2.5 text-left text-sm">
            <ClockIcon className="text-room-held size-4" />
            Còn{' '}
            <HoldCountdown
              deadline={b.holdExpiresAt!}
              serverTime={b.serverTime}
              compact
              className="font-sans font-normal"
            />{' '}
            để thanh toán lại
          </div>
        )}
        <dl className="bg-background flex w-full flex-col gap-3 rounded-xl p-4 text-left">
          <InfoRow label="Mã đơn">{r.bookingCode}</InfoRow>
          <InfoRow label="Số tiền">{formatVND(r.amount)}</InfoRow>
          <InfoRow label="Mã giao dịch VNPay">{success && txn ? txn : '—'}</InfoRow>
          <InfoRow label="Thời gian">{formatDateTime(new Date().toISOString())}</InfoRow>
        </dl>
        <div className="flex gap-3">
          {canPay ? (
            <Button
              disabled={repay.isPending}
              onClick={() =>
                repay.mutate(r.bookingId, { onSuccess: (x) => goToPayment(x.paymentUrl, navigate) })
              }
            >
              Thanh toán lại
            </Button>
          ) : (
            success && (
              <Button asChild>
                <Link to={`/my-bookings/${r.bookingId}`}>Xem đơn</Link>
              </Button>
            )
          )}
          {success ? (
            <Button asChild variant="outline">
              <Link to="/">Về trang chủ</Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link to={`/my-bookings/${r.bookingId}`}>Xem đơn</Link>
            </Button>
          )}
        </div>
      </section>
    </div>
  )
}
