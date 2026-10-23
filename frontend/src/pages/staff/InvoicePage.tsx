import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '@components/states'
import { Button } from '@components/ui/button'
import { useInvoice } from '@hooks/queries/useStaff'
import { cn } from '@lib/utils'
import { PAYMENT_METHOD_LABEL } from '@utils/booking'
import { formatNumber, formatTime, formatVND } from '@utils/format'
import { vn } from '@utils/time'

function Line({
  label,
  value,
  strong,
  className,
}: {
  label: ReactNode
  value: ReactNode
  strong?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex justify-between gap-3', className)}>
      <span className={strong ? 'text-black' : 'text-neutral-600'}>{label}</span>
      <span className={strong ? 'font-semibold' : undefined}>{value}</span>
    </div>
  )
}

const timeDate = (iso: string) => `${formatTime(iso)}  ${vn(iso).format('DD/MM/YYYY')}`

/** SCR-S04 — hóa đơn khổ 80mm (nền trắng), in bằng `window.print()` (FD-OPS-07). */
export function InvoicePage() {
  const id = Number(useParams().id)
  const invoice = useInvoice(id)
  const inv = invoice.data
  const hours = inv ? vn(inv.endTime).diff(vn(inv.startTime), 'minute') / 60 : 0
  const cash = inv?.payments.filter((p) => p.method === 'CASH') ?? []
  const prepaid = inv?.payments.filter((p) => p.method !== 'CASH') ?? []

  return (
    <div className="flex min-h-screen flex-col items-center gap-5 px-4 py-10 print:bg-white print:p-0">
      <div className="flex gap-3 print:hidden">
        <Button onClick={() => window.print()} disabled={!inv}>
          {inv?.type === 'DRAFT' ? 'In phiếu tạm tính' : 'In hóa đơn'}
        </Button>
        <Button asChild variant="outline">
          <Link to={`/staff/bookings/${id}`}>Đóng</Link>
        </Button>
      </div>
      {invoice.isPending ? (
        <LoadingState rows={1} className="w-[380px]" />
      ) : invoice.isError ? (
        <div className="w-[380px]">
          <ErrorState error={invoice.error} />
        </div>
      ) : (
        inv && (
          <article className="flex w-full max-w-[380px] flex-col gap-4 bg-white px-6 py-7 text-[13px] text-black shadow-xl print:max-w-none print:p-0 print:shadow-none">
            <header className="flex flex-col items-center gap-1 text-center">
              <h1 className="text-lg font-bold uppercase">{inv.branch.name}</h1>
              <p className="text-neutral-600">{inv.branch.address}</p>
              <p className="text-neutral-600">ĐT: {inv.branch.phone}</p>
            </header>
            <hr className="border-neutral-800" />
            <div className="flex flex-col items-center gap-0.5">
              <p className="text-base font-bold">
                {inv.type === 'FINAL' ? 'HÓA ĐƠN THANH TOÁN' : 'PHIẾU TẠM TÍNH'}
              </p>
              <p className="text-neutral-600">Số: {inv.code}</p>
            </div>
            <div className="flex flex-col gap-2.5">
              <Line label="Phòng" value={inv.room} />
              <Line label="Khách" value={inv.customer} />
              {inv.checkedInAt && <Line label="Giờ vào" value={timeDate(inv.checkedInAt)} />}
              {inv.checkedOutAt && <Line label="Giờ ra" value={timeDate(inv.checkedOutAt)} />}
              <Line
                label="Thời lượng tính tiền"
                value={`${formatTime(inv.startTime)} – ${formatTime(inv.endTime)} (${hours} giờ)`}
              />
            </div>
            <hr className="border-neutral-200" />
            <div className="flex flex-col gap-2.5">
              <p className="text-sm font-semibold">Tiền phòng</p>
              {inv.roomLines.map((l, i) => (
                <Line
                  key={i}
                  label={`${l.from}–${l.to} · ${l.hours} × ${formatNumber(l.unitPrice)}`}
                  value={formatNumber(l.amount)}
                />
              ))}
              {inv.itemLines.length > 0 && (
                <>
                  <p className="mt-1 text-sm font-semibold">Đồ ăn uống</p>
                  {inv.itemLines.map((l, i) => (
                    <Line
                      key={i}
                      label={`${l.name} · ${l.quantity} × ${formatNumber(l.unitPrice)}${l.preordered ? ' *' : ''}`}
                      value={formatNumber(l.amount)}
                    />
                  ))}
                </>
              )}
            </div>
            <hr className="border-neutral-200" />
            <div className="flex flex-col gap-2.5">
              <Line label="Tạm tính" value={formatNumber(inv.subtotal)} />
              <Line
                label={`Giảm giá${inv.voucherCode ? ` (${inv.voucherCode})` : ''}`}
                value={inv.discount > 0 ? `−${formatNumber(inv.discount)}` : '0'}
              />
              <Line
                label={<span className="text-sm">TỔNG</span>}
                value={<span className="text-lg font-bold">{formatVND(inv.total)}</span>}
                className="items-baseline"
              />
              {prepaid.map((p, i) => (
                <Line
                  key={i}
                  label={`Đã thanh toán (${PAYMENT_METHOD_LABEL[p.method]})`}
                  value={formatNumber(p.amount)}
                />
              ))}
              {cash.map((p, i) => (
                <Line key={i} label="Thu tại quầy" value={formatNumber(p.amount)} strong />
              ))}
              {inv.due > 0 && <Line label="Còn phải thu" value={formatNumber(inv.due)} strong />}
            </div>
            <hr className="border-neutral-800" />
            <footer className="flex flex-col items-center gap-1 text-center">
              <p className="text-neutral-600">
                NV: {inv.staffName} · In lúc {timeDate(inv.printedAt)}
              </p>
              {inv.itemLines.some((l) => l.preordered) && (
                <p className="text-[11px] text-neutral-500">(*) món đặt trước online</p>
              )}
              <p className="text-sm font-semibold">Cảm ơn quý khách!</p>
            </footer>
          </article>
        )
      )}
    </div>
  )
}
