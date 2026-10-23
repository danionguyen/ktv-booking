import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { cn } from '@lib/utils'
import { Skeleton } from '@components/ui/skeleton'
import { useCheckOut, useInvoice } from '@hooks/queries/useStaff'
import { formatHours, formatNumber, formatTime, formatVND } from '@utils/format'

interface CheckoutDialogProps {
  bookingId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** SCR-S03b — tổng hợp tiền, nhập tiền khách đưa, tính tiền thừa (FD-OPS-06). */
export function CheckoutDialog({ bookingId, open, onOpenChange }: CheckoutDialogProps) {
  const navigate = useNavigate()
  const invoice = useInvoice(bookingId)
  const checkOut = useCheckOut(bookingId)
  const [received, setReceived] = useState('')
  const due = invoice.data?.due ?? 0
  const receivedAmount = Number(received.replace(/\D/g, '')) || 0

  useEffect(() => {
    if (open && invoice.data) setReceived(String(invoice.data.due))
  }, [open, invoice.data])

  const quick = [
    due,
    Math.ceil(due / 100000) * 100000,
    Math.ceil(due / 500000) * 500000,
    1000000,
    2000000,
  ]
    .filter((v, i, a) => v >= due && a.indexOf(v) === i)
    .slice(0, 4)

  const inv = invoice.data
  const quickAll = [due, ...quick.filter((v) => v !== due)].slice(0, 4)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Check-out{inv ? ` · ${inv.room.split(' ')[0]}` : ''}</DialogTitle>
          <DialogDescription>
            {inv ? `${inv.code} · ${inv.customer}` : 'Đang tải hóa đơn…'}
          </DialogDescription>
        </DialogHeader>
        {invoice.isPending || !inv ? (
          <Skeleton className="h-60" />
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border text-sm">
              <div className="bg-background text-muted-foreground flex justify-between px-4 py-2.5 font-semibold">
                <span>Khoản</span>
                <span>Thành tiền</span>
              </div>
              {inv.roomLines.map((l, i) => (
                <div key={`r${i}`} className="flex justify-between gap-3 border-t px-4 py-3">
                  <span>
                    Tiền phòng {l.from} – {l.to} ({formatHours(l.hours)} × {formatVND(l.unitPrice)})
                  </span>
                  <span className="tabular-nums">{formatVND(l.amount)}</span>
                </div>
              ))}
              {inv.itemLines.map((l, i) => (
                <div key={`i${i}`} className="flex justify-between gap-3 border-t px-4 py-3">
                  <span>
                    {l.name} × {l.quantity}
                  </span>
                  <span className="tabular-nums">{formatVND(l.amount)}</span>
                </div>
              ))}
              {inv.discount > 0 && (
                <div className="flex justify-between gap-3 border-t px-4 py-3">
                  <span>Giảm giá{inv.voucherCode ? ` (${inv.voucherCode})` : ''}</span>
                  <span className="text-room-available tabular-nums">
                    −{formatVND(inv.discount)}
                  </span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Tổng', value: inv.total },
                { label: 'Đã trả', value: inv.paidBefore },
                { label: 'Còn phải thu', value: due, gold: true },
              ].map((x) => (
                <div
                  key={x.label}
                  className="bg-background flex flex-col gap-0.5 rounded-[10px] p-3.5"
                >
                  <span className="text-muted-foreground text-xs">{x.label}</span>
                  <span className={cn('text-xl font-semibold', x.gold && 'text-link')}>
                    {formatVND(x.value)}
                  </span>
                </div>
              ))}
            </div>
            {due > 0 && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="received">Tiền khách đưa</Label>
                  <Input
                    id="received"
                    inputMode="numeric"
                    value={received ? formatNumber(receivedAmount) : ''}
                    onChange={(e) => setReceived(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {quickAll.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setReceived(String(v))}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs',
                        receivedAmount === v ? 'bg-secondary border-primary text-link' : 'bg-card',
                      )}
                    >
                      {v === due ? 'Đúng số' : formatVND(v)}
                    </button>
                  ))}
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-muted-foreground text-sm">
                    {receivedAmount >= due ? 'Tiền thối' : 'Còn thiếu'}
                  </span>
                  <span
                    className={cn(
                      'text-xl font-semibold',
                      receivedAmount >= due ? 'text-room-available' : 'text-destructive',
                    )}
                  >
                    {formatVND(Math.abs(receivedAmount - due))}
                  </span>
                </div>
              </>
            )}
            {inv.checkedInAt && (
              <p className="text-muted-foreground text-xs">
                Vào lúc {formatTime(inv.checkedInAt)} · ra sớm không hoàn tiền giờ chưa dùng, phòng
                chuyển sang dọn dẹp 15 phút.
              </p>
            )}
          </>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            disabled={!inv || checkOut.isPending || receivedAmount < due}
            onClick={() =>
              checkOut.mutate(due > 0 ? receivedAmount : 0, {
                onSuccess: (r) => {
                  toast.success(
                    r.change > 0
                      ? `Check-out xong · trả lại ${formatVND(r.change)}`
                      : 'Check-out xong',
                  )
                  onOpenChange(false)
                  navigate(`/staff/bookings/${bookingId}/invoice`)
                },
              })
            }
          >
            {checkOut.isPending ? 'Đang xử lý…' : 'Xác nhận thu tiền & in hóa đơn'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
