import { ChevronRightIcon } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { adminApi, type AdminBookingQuery } from '@api/admin'
import { FilterField } from '@components/admin/FilterField'
import { TableCard } from '@components/admin/TableCard'
import { DatePicker } from '@components/DatePicker'
import { InfoRow } from '@components/InfoRow'
import { PageHeader } from '@components/PageHeader'
import { Pagination } from '@components/Pagination'
import { BookingStatusBadge } from '@components/StatusBadge'
import { EmptyState, ErrorState, LoadingState } from '@components/states'
import { Button } from '@components/ui/button'
import { Field, FieldLabel } from '@components/ui/field'
import { Input } from '@components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select'
import { Sheet, SheetContent, SheetTitle } from '@components/ui/sheet'
import { Skeleton } from '@components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@components/ui/table'
import { useAdminBooking, useAdminBookings, useAdminMutation } from '@hooks/queries/useAdmin'
import { useBranches } from '@hooks/queries/useCatalog'
import type { Booking, BookingStatus, PaymentMethod } from '@/types/domain'
import { BOOKING_STATUS_LABEL, PAYMENT_METHOD_LABEL } from '@utils/booking'
import { dayjs, formatDate, formatTime, formatVND, TZ } from '@utils/format'

const STATUSES = Object.keys(BOOKING_STATUS_LABEL) as BookingStatus[]

/** "22/10 20:00–23:00" */
const shortTime = (b: Pick<Booking, 'startTime' | 'endTime'>) =>
  `${dayjs(b.startTime).tz(TZ).format('DD/MM')} ${formatTime(b.startTime)}–${formatTime(b.endTime)}`

/** Xuất CSV (UTF-8 BOM để Excel đọc đúng tiếng Việt). */
function downloadCsv(rows: Booking[]) {
  const head = [
    'Mã đơn',
    'Khách',
    'SĐT',
    'Chi nhánh',
    'Phòng',
    'Bắt đầu',
    'Kết thúc',
    'Tổng',
    'PTTT',
    'Trạng thái',
  ]
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const lines = rows.map((b) =>
    [
      b.code,
      b.customer.name,
      b.customer.phone,
      b.branch.name,
      b.room.code,
      dayjs(b.startTime).tz(TZ).format('YYYY-MM-DD HH:mm'),
      dayjs(b.endTime).tz(TZ).format('YYYY-MM-DD HH:mm'),
      b.total,
      b.paymentMethod ? PAYMENT_METHOD_LABEL[b.paymentMethod] : '',
      BOOKING_STATUS_LABEL[b.status],
    ]
      .map(esc)
      .join(','),
  )
  const blob = new Blob(['\ufeff' + [head.map(esc).join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8',
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `dat-phong-${dayjs().format('YYYYMMDD-HHmm')}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

/** SCR-A10 + A10b */
export function BookingsPage() {
  const [params, setParams] = useSearchParams()
  const query: AdminBookingQuery = {
    status: (params.get('status') as BookingStatus) || undefined,
    branchId: params.get('branchId') ? Number(params.get('branchId')) : undefined,
    from: params.get('from') || undefined,
    to: params.get('to') || undefined,
    q: params.get('q') || undefined,
    page: Number(params.get('page') ?? 0),
    size: 20,
  }
  const method = (params.get('method') as PaymentMethod) || undefined
  const [q, setQ] = useState(query.q ?? '')
  const bookings = useAdminBookings(query)
  const branches = useBranches()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [reason, setReason] = useState('')
  const [exporting, setExporting] = useState(false)
  const detail = useAdminBooking(selectedId)
  const cancel = useAdminMutation(
    ({ id, reason }: { id: number; reason: string }) => adminApi.bookings.cancel(id, reason),
    [['admin', 'bookings'], ['room-map'], ['staff', 'timeline']],
  )

  const setFilter = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    if (!('page' in patch)) next.delete('page')
    setParams(next, { replace: true })
  }
  const open = (id: number | null) => {
    setSelectedId(id)
    setReason('')
  }
  const b = detail.data
  const cancellable = b && !['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(b.status)
  // API chưa lọc theo phương thức thanh toán → lọc trên trang hiện tại
  const rows = bookings.data?.items.filter((r) => !method || r.paymentMethod === method) ?? []

  const exportCsv = async () => {
    setExporting(true)
    try {
      const all = await adminApi.bookings.list({
        ...query,
        page: 0,
        size: Math.max(1, bookings.data?.total ?? 1),
      })
      downloadCsv(all.items.filter((r) => !method || r.paymentMethod === method))
    } catch {
      toast.error('Không xuất được CSV')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Đặt phòng"
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={exporting || !bookings.data}>
            {exporting ? 'Đang xuất…' : 'Xuất CSV'}
          </Button>
        }
      />
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          setFilter({ q: q.trim() || undefined })
        }}
      >
        <FilterField label="Chi nhánh" htmlFor="f-branch">
          <Select
            value={query.branchId ? String(query.branchId) : 'all'}
            onValueChange={(v) => setFilter({ branchId: v === 'all' ? undefined : v })}
          >
            <SelectTrigger id="f-branch" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {branches.data?.map((br) => (
                <SelectItem key={br.id} value={String(br.id)}>
                  {br.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <Field className="w-auto">
          <FieldLabel htmlFor="f-from">Khoảng ngày</FieldLabel>
          <div className="flex items-center gap-1.5">
            <DatePicker
              id="f-from"
              value={query.from}
              max={query.to}
              onChange={(from) => setFilter({ from })}
              placeholder="Từ ngày"
              className="w-36"
            />
            <span className="text-muted-foreground">–</span>
            <DatePicker
              value={query.to}
              min={query.from}
              onChange={(to) => setFilter({ to })}
              placeholder="Đến ngày"
              className="w-36"
            />
          </div>
        </Field>
        <FilterField label="Trạng thái" htmlFor="f-status">
          <Select
            value={query.status ?? 'all'}
            onValueChange={(v) => setFilter({ status: v === 'all' ? undefined : v })}
          >
            <SelectTrigger id="f-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {BOOKING_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Phương thức" htmlFor="f-method" className="w-36">
          <Select
            value={method ?? 'all'}
            onValueChange={(v) => setFilter({ method: v === 'all' ? undefined : v })}
          >
            <SelectTrigger id="f-method" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => (
                <SelectItem key={m} value={m}>
                  {PAYMENT_METHOD_LABEL[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Từ khóa" htmlFor="f-q" className="w-56">
          <Input
            id="f-q"
            placeholder="Mã đơn, tên, SĐT"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onBlur={() => setFilter({ q: q.trim() || undefined })}
          />
        </FilterField>
        {(query.status || query.branchId || query.from || query.to || query.q || method) && (
          <Button
            type="button"
            variant="ghost"
            className="mb-0.5"
            onClick={() => (setQ(''), setParams({}, { replace: true }))}
          >
            Xóa lọc
          </Button>
        )}
      </form>

      {bookings.isPending ? (
        <LoadingState />
      ) : bookings.isError ? (
        <ErrorState error={bookings.error} onRetry={() => void bookings.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="Không có đơn phù hợp" />
      ) : (
        <div>
          <TableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã đơn</TableHead>
                  <TableHead>Khách</TableHead>
                  <TableHead className="hidden lg:table-cell">Chi nhánh · Phòng</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead className="text-right">Tổng</TableHead>
                  <TableHead>PTTT</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    data-state={row.id === selectedId ? 'selected' : undefined}
                    onClick={() => open(row.id)}
                  >
                    <TableCell className="font-semibold">{row.code}</TableCell>
                    <TableCell>
                      <div>{row.customer.name}</div>
                      <div className="text-muted-foreground text-xs">{row.customer.phone}</div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {row.branch.name.replace(/^KTV\s+/, '')} · {row.room.code}
                    </TableCell>
                    <TableCell>{shortTime(row)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatVND(row.total)}
                    </TableCell>
                    <TableCell>
                      {row.paymentMethod ? PAYMENT_METHOD_LABEL[row.paymentMethod] : '—'}
                    </TableCell>
                    <TableCell>
                      <BookingStatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground px-2">
                      <ChevronRightIcon className="size-4" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableCard>
          <Pagination
            page={query.page}
            size={bookings.data.size}
            total={bookings.data.total}
            onPageChange={(p) => setFilter({ page: String(p) })}
            summary={`${bookings.data.total.toLocaleString('vi-VN')} đơn · ${bookings.data.size} / trang`}
          />
        </div>
      )}

      {/* A10b — drawer chi tiết & hủy đơn */}
      <Sheet open={selectedId !== null} onOpenChange={(o) => !o && open(null)}>
        <SheetContent className="bg-card flex w-full flex-col gap-0 p-0 sm:max-w-[480px]">
          <div className="flex items-center gap-3 border-b px-7 py-5">
            <SheetTitle className="text-xl font-semibold">{b ? b.code : 'Chi tiết đơn'}</SheetTitle>
            {b && <BookingStatusBadge status={b.status} />}
          </div>
          <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-7 py-6">
            {!b ? (
              <Skeleton className="h-64" />
            ) : (
              <>
                <dl className="flex flex-col gap-4">
                  <InfoRow label="Khách">
                    {b.customer.name} · {b.customer.phone}
                  </InfoRow>
                  <InfoRow label="Chi nhánh · Phòng">
                    {b.branch.name} · {b.room.code} – {b.room.type}
                  </InfoRow>
                  <InfoRow label="Thời gian">
                    {formatDate(b.startTime)} {formatTime(b.startTime)} – {formatTime(b.endTime)}
                  </InfoRow>
                  <InfoRow label="Số người">{b.people}</InfoRow>
                </dl>
                <dl className="flex flex-col gap-4 border-t pt-5">
                  <InfoRow label="Tiền phòng">{formatVND(b.roomAmount)}</InfoRow>
                  <InfoRow label="Đồ ăn uống">{formatVND(b.fnbAmount)}</InfoRow>
                  {b.discount > 0 && (
                    <InfoRow label={`Giảm giá (${b.voucherCode})`}>
                      <span className="text-room-available">−{formatVND(b.discount)}</span>
                    </InfoRow>
                  )}
                  <InfoRow
                    label={`Tổng${b.paidAmount > 0 && b.paymentMethod ? ` · đã thanh toán ${PAYMENT_METHOD_LABEL[b.paymentMethod]}` : ''}`}
                  >
                    <span className="text-link text-base">{formatVND(b.total)}</span>
                  </InfoRow>
                </dl>
                {b.cancelReason && (
                  <dl className="border-t pt-5">
                    <InfoRow label="Lý do hủy">{b.cancelReason}</InfoRow>
                  </dl>
                )}
                {cancellable && (
                  <form
                    id="admin-cancel"
                    className="bg-background flex flex-col gap-3 rounded-xl p-4"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (!reason.trim()) return
                      cancel.mutate(
                        { id: b.id, reason: reason.trim() },
                        {
                          onSuccess: (r) => {
                            toast.success(
                              r.refundAmount > 0
                                ? `Đã hủy · ghi nhận hoàn ${formatVND(r.refundAmount)}`
                                : 'Đã hủy đơn',
                            )
                            setReason('')
                            void detail.refetch()
                          },
                        },
                      )
                    }}
                  >
                    <p className="text-sm font-semibold">Hủy đơn (admin)</p>
                    <Field>
                      <FieldLabel htmlFor="cancel-reason">Lý do hủy *</FieldLabel>
                      <Input
                        id="cancel-reason"
                        value={reason}
                        maxLength={255}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </Field>
                    <p className="text-muted-foreground text-xs">
                      Admin được hủy mọi đơn kèm lý do (BR-51). Hoàn tiền ghi nhận theo chính sách
                      và xử lý thủ công qua VNPay.
                    </p>
                  </form>
                )}
              </>
            )}
          </div>
          <div className="flex justify-end gap-3 border-t px-7 py-4">
            <Button variant="outline" onClick={() => open(null)}>
              Đóng
            </Button>
            {cancellable && (
              <Button
                type="submit"
                form="admin-cancel"
                variant="destructive"
                disabled={!reason.trim() || cancel.isPending}
              >
                {cancel.isPending ? 'Đang hủy…' : 'Hủy đơn'}
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
