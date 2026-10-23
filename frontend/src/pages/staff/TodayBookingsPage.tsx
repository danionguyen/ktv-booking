import { SearchIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '@components/states'
import { PageHeader } from '@components/PageHeader'
import { BranchSwitcher } from '@components/staff/BranchSwitcher'
import { BookingStatusBadge } from '@components/StatusBadge'
import { Input } from '@components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@components/ui/table'
import { useTimeline } from '@hooks/queries/useStaff'
import { useStaffBranch } from '@hooks/useStaffBranch'
import { PAYMENT_METHOD_LABEL } from '@utils/booking'
import { formatDateLong, formatTime } from '@utils/format'
import { vn } from '@utils/time'

/** Danh sách đơn trong ngày của chi nhánh (mục "Đơn hôm nay" trên Sidebar/Staff). */
export function TodayBookingsPage() {
  const date = vn().format('YYYY-MM-DD')
  const { branchId } = useStaffBranch()
  const timeline = useTimeline(date, branchId)
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const rows = (timeline.data?.rooms ?? [])
    .flatMap((r) => r.bookings.map((b) => ({ ...b, room: r.code })))
    .filter((b) => !q || [b.code, b.phone, b.customerName].some((v) => v.toLowerCase().includes(q)))
    .sort((a, b) => a.start.localeCompare(b.start))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Đơn hôm nay"
        breadcrumb={
          timeline.data
            ? `${timeline.data.branch.name} · ${formatDateLong(vn(date).toISOString())}`
            : undefined
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <BranchSwitcher />
        <div className="relative w-full max-w-sm">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm mã đơn / SĐT / tên khách"
            className="pl-9"
            aria-label="Tìm đơn"
          />
        </div>
      </div>
      {timeline.isPending ? (
        <LoadingState rows={6} />
      ) : timeline.isError ? (
        <ErrorState error={timeline.error} onRetry={() => void timeline.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Chưa có đơn nào"
          description="Không có đơn nào trong ngày khớp tìm kiếm."
        />
      ) : (
        <div className="bg-card overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã đơn</TableHead>
                <TableHead>Phòng</TableHead>
                <TableHead>Khách</TableHead>
                <TableHead>SĐT</TableHead>
                <TableHead>Giờ</TableHead>
                <TableHead className="text-right">Số người</TableHead>
                <TableHead>Thanh toán</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <Link
                      to={`/staff/bookings/${b.id}`}
                      className="text-link font-semibold hover:underline"
                    >
                      {b.code}
                    </Link>
                  </TableCell>
                  <TableCell className="font-semibold">{b.room}</TableCell>
                  <TableCell>{b.customerName}</TableCell>
                  <TableCell>{b.phone}</TableCell>
                  <TableCell>
                    {formatTime(b.start)} – {formatTime(b.end)}
                  </TableCell>
                  <TableCell className="text-right">{b.people}</TableCell>
                  <TableCell>
                    {b.paymentMethod ? PAYMENT_METHOD_LABEL[b.paymentMethod] : '—'}
                  </TableCell>
                  <TableCell>
                    <BookingStatusBadge status={b.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
