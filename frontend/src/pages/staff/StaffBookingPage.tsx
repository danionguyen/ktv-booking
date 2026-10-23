import { Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmDialog } from '@components/ConfirmDialog'
import { PageHeader } from '@components/PageHeader'
import { InfoRow } from '@components/InfoRow'
import { Notice } from '@components/Notice'
import { AddItemsSheet } from '@components/staff/AddItemsSheet'
import { CheckoutDialog } from '@components/staff/CheckoutDialog'
import { ExtendDialog } from '@components/staff/ExtendDialog'
import { BookingStatusBadge } from '@components/StatusBadge'
import { ErrorState, LoadingState } from '@components/states'
import { Button } from '@components/ui/button'
import { Tag } from '@components/Tag'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@components/ui/table'
import { useCheckIn, useRemoveItem, useStaffBooking } from '@hooks/queries/useStaff'
import { PAYMENT_METHOD_LABEL } from '@utils/booking'
import { formatHours, formatTime, formatVND } from '@utils/format'
import { vn } from '@utils/time'

/** SCR-S03 */
export function StaffBookingPage() {
  const id = Number(useParams().id)
  const booking = useStaffBooking(id)
  const checkIn = useCheckIn(id)
  const removeItem = useRemoveItem(id)
  const [dialog, setDialog] = useState<'items' | 'extend' | 'checkout' | null>(null)
  const [removing, setRemoving] = useState<number | null>(null)

  if (booking.isPending) return <LoadingState />
  if (booking.isError)
    return <ErrorState error={booking.error} onRetry={() => void booking.refetch()} />
  const b = booking.data
  const inUse = b.status === 'CHECKED_IN'
  const minutesToStart = vn(b.startTime).diff(vn(), 'minute')
  const due = Math.max(0, b.total - b.paidAmount)
  const hours = vn(b.endTime).diff(vn(b.startTime), 'minute') / 60
  const left = vn(b.endTime).diff(vn(), 'minute')
  const line = b.priceBreakdown.length === 1 ? b.priceBreakdown[0] : null
  const payTag =
    b.paidAmount >= b.total && b.total > 0 ? (
      <Tag color="green">
        Đã thanh toán{b.paymentMethod ? ` · ${PAYMENT_METHOD_LABEL[b.paymentMethod]}` : ''}
      </Tag>
    ) : b.paymentMethod === 'VNPAY' ? (
      <Tag color="blue">VNPay · {b.paidAmount > 0 ? 'đã trả một phần' : 'chưa thanh toán'}</Tag>
    ) : (
      <Tag color="orange">Trả tại quầy · chưa thanh toán</Tag>
    )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={
          <>
            <Link
              to={`/staff?date=${vn(b.startTime).format('YYYY-MM-DD')}`}
              className="hover:text-foreground"
            >
              Timeline
            </Link>
            {'  /  '}
            {b.room.code}
          </>
        }
        title={`Đơn ${b.code}`}
      />

      <div className="bg-card flex flex-wrap items-center gap-4 rounded-xl border px-5 py-5">
        <BookingStatusBadge status={b.status} />
        <p className="text-base font-semibold">
          {b.room.code} – {b.room.type} · {formatTime(b.startTime)} – {formatTime(b.endTime)}
        </p>
        {inUse && left > 0 && (
          <span className="text-muted-foreground text-sm">
            còn {Math.floor(left / 60) > 0 && `${Math.floor(left / 60)} giờ `}
            {left % 60} phút
          </span>
        )}
        <div className="ml-auto flex flex-wrap gap-3">
          {b.status === 'CONFIRMED' && (
            <Button
              disabled={checkIn.isPending}
              onClick={() =>
                checkIn.mutate(undefined, {
                  onSuccess: () => toast.success(`Đã check-in phòng ${b.room.code}`),
                })
              }
            >
              Check-in
            </Button>
          )}
          {inUse && (
            <Button variant="outline" onClick={() => setDialog('extend')}>
              Gia hạn
            </Button>
          )}
          {(b.status === 'COMPLETED' || inUse) && (
            <Button asChild variant={inUse ? 'outline' : 'default'}>
              <Link to={`/staff/bookings/${b.id}/invoice`}>
                {inUse ? 'In phiếu tạm tính' : 'In hóa đơn'}
              </Link>
            </Button>
          )}
          {inUse && <Button onClick={() => setDialog('checkout')}>Check-out</Button>}
        </div>
      </div>

      {b.status === 'CONFIRMED' && minutesToStart > 15 && (
        <Notice tone="info">
          Check-in được từ 15 phút trước giờ bắt đầu (
          {formatTime(vn(b.startTime).subtract(15, 'minute').format())}).
          {b.paymentMethod === 'CASH' &&
            ' Đơn trả tại quầy sẽ tự hủy nếu khách không đến sau 15 phút.'}
        </Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="bg-card flex flex-col gap-4 rounded-xl border p-6">
            <h2 className="text-base font-semibold">Thông tin đơn</h2>
            <dl className="flex flex-col gap-4">
              <InfoRow label="Khách">{b.customer.name}</InfoRow>
              <InfoRow label="Số điện thoại">{b.customer.phone || '—'}</InfoRow>
              {b.customer.email && <InfoRow label="Email">{b.customer.email}</InfoRow>}
              <InfoRow label="Phòng">
                {b.room.code} – {b.room.type} · tối đa {b.room.capacity} người
              </InfoRow>
              <InfoRow label="Giờ đặt">
                {formatTime(b.startTime)} – {formatTime(b.endTime)} ({formatHours(hours)})
              </InfoRow>
              {b.checkedInAt && (
                <InfoRow label="Giờ vào thực tế">{formatTime(b.checkedInAt)}</InfoRow>
              )}
              {b.checkedOutAt && <InfoRow label="Giờ ra">{formatTime(b.checkedOutAt)}</InfoRow>}
              <InfoRow label="Số người">{b.people}</InfoRow>
              <InfoRow label="Thanh toán">{payTag}</InfoRow>
              {b.cancelReason && <InfoRow label="Lý do hủy">{b.cancelReason}</InfoRow>}
            </dl>
          </section>

          <section className="bg-card flex flex-col gap-4 rounded-xl border p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Đồ ăn uống</h2>
              {inUse && (
                <Button variant="outline" onClick={() => setDialog('items')}>
                  + Gọi thêm món
                </Button>
              )}
            </div>
            {b.items.length === 0 ? (
              <p className="text-muted-foreground text-sm">Chưa gọi món nào.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Món</TableHead>
                      <TableHead className="text-right">SL</TableHead>
                      <TableHead className="text-right">Đơn giá</TableHead>
                      <TableHead className="text-right">Thành tiền</TableHead>
                      <TableHead className="text-right">Giờ gọi</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {b.items.map((i) => {
                      const removable =
                        inUse && !i.preordered && vn().diff(vn(i.createdAt), 'minute') < 10
                      return (
                        <TableRow key={i.id}>
                          <TableCell>{i.name}</TableCell>
                          <TableCell className="text-right">{i.quantity}</TableCell>
                          <TableCell className="text-right">{formatVND(i.unitPrice)}</TableCell>
                          <TableCell className="text-right">{formatVND(i.amount)}</TableCell>
                          <TableCell className="text-right">
                            {i.preordered ? 'Đặt trước' : formatTime(i.createdAt)}
                          </TableCell>
                          <TableCell className="px-2">
                            {removable && (
                              <button
                                type="button"
                                aria-label={`Xóa ${i.name}`}
                                className="text-room-booked hover:bg-room-booked-bg flex size-8 items-center justify-center rounded-lg"
                                onClick={() => setRemoving(i.id)}
                              >
                                <Trash2Icon className="size-4" />
                              </button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            {inUse && (
              <p className="text-muted-foreground text-xs">
                Có thể xóa món trong 10 phút sau khi gọi.
              </p>
            )}
          </section>
        </div>

        <section className="bg-card flex flex-col gap-4 rounded-xl border p-6 lg:self-start">
          <h2 className="text-base font-semibold">
            {b.status === 'COMPLETED' ? 'Chi phí' : 'Chi phí tạm tính'}
          </h2>
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
            <InfoRow label={b.voucherCode ? `Giảm giá (${b.voucherCode})` : 'Giảm giá'}>
              {b.discount > 0 ? `−${formatVND(b.discount)}` : formatVND(0)}
            </InfoRow>
          </dl>
          <dl className="flex flex-col gap-4 border-t pt-4">
            <InfoRow label="Tổng">{formatVND(b.total)}</InfoRow>
            <InfoRow label="Đã thanh toán">{formatVND(b.paidAmount)}</InfoRow>
            {b.status !== 'COMPLETED' && (
              <div className="flex items-baseline justify-between">
                <span className="text-muted-foreground text-sm">Còn phải thu</span>
                <span className="text-link text-[28px] leading-9 font-bold">{formatVND(due)}</span>
              </div>
            )}
          </dl>
        </section>
      </div>

      <AddItemsSheet
        bookingId={b.id}
        roomCode={b.room.code}
        open={dialog === 'items'}
        onOpenChange={(o) => setDialog(o ? 'items' : null)}
      />
      <ExtendDialog
        bookingId={b.id}
        roomCode={b.room.code}
        endTime={b.endTime}
        open={dialog === 'extend'}
        onOpenChange={(o) => setDialog(o ? 'extend' : null)}
      />
      <CheckoutDialog
        bookingId={b.id}
        open={dialog === 'checkout'}
        onOpenChange={(o) => setDialog(o ? 'checkout' : null)}
      />
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Xóa món khỏi đơn?"
        destructive
        confirmLabel="Xóa"
        loading={removeItem.isPending}
        onConfirm={() =>
          removing && removeItem.mutate(removing, { onSuccess: () => setRemoving(null) })
        }
      />
    </div>
  )
}
