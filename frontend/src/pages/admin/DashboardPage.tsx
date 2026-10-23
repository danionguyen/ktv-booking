import { ChevronDownIcon } from 'lucide-react'
import { useState } from 'react'
import { vi } from 'react-day-picker/locale'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartTooltip } from '@components/admin/ChartTooltip'
import { PageHeader } from '@components/PageHeader'
import { Segmented } from '@components/Segmented'
import { StatCard } from '@components/StatCard'
import { ErrorState } from '@components/states'
import { Button } from '@components/ui/button'
import { Calendar } from '@components/ui/calendar'
import { Field, FieldLabel } from '@components/ui/field'
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select'
import { Skeleton } from '@components/ui/skeleton'
import { useStats, useStatsSummary } from '@hooks/queries/useAdmin'
import { useBranches } from '@hooks/queries/useCatalog'
import type { StatsFilter } from '@/types/domain'
import { dayjs, formatNumber, formatPercent, formatVND } from '@utils/format'
import { vn } from '@utils/time'

const PRESETS = [
  { label: '7 ngày qua', from: () => vn().subtract(6, 'day') },
  { label: '30 ngày qua', from: () => vn().subtract(29, 'day') },
  { label: 'Tháng này', from: () => vn().startOf('month') },
  { label: '12 tháng qua', from: () => vn().subtract(11, 'month').startOf('month') },
]

/** Rút gọn tiền cho trục: 35.000.000 → 35tr */
const compactVND = (v: number) =>
  v >= 1_000_000
    ? `${(v / 1_000_000).toFixed(1).replace('.0', '').replace('.', ',')}tr`
    : `${Math.round(v / 1000)}k`

const AXIS = {
  stroke: 'var(--color-muted-foreground)',
  fontSize: 12,
  tickLine: false,
  axisLine: false,
}

/** "▲ 12,4% so với kỳ trước" — tăng xanh, giảm đỏ (đảo màu khi `lowerIsBetter`). */
function delta(
  curr: number,
  prev: number | undefined,
  opts?: { points?: boolean; lowerIsBetter?: boolean; suffix?: string },
) {
  if (prev === undefined) return { note: undefined, className: undefined }
  const diff = opts?.points ? (curr - prev) * 100 : prev ? ((curr - prev) / prev) * 100 : 0
  const up = diff >= 0
  const good = opts?.lowerIsBetter ? !up : up
  const value = `${Math.abs(diff).toFixed(1).replace('.', ',')}${opts?.points ? ' điểm %' : '%'}`
  return {
    note: `${up ? '▲' : '▼'} ${value}${opts?.suffix ?? ''}`,
    className: good ? 'text-room-available' : 'text-room-booked',
  }
}

/** Danh sách top dạng thanh ngang (Figma "Top phòng theo lượt đặt"). */
function TopList({
  title,
  rows,
}: {
  title: string
  rows: { key: string | number; label: string; value: number; display: string }[] | undefined
}) {
  const max = Math.max(1, ...(rows ?? []).map((r) => r.value))
  return (
    <section className="bg-card flex flex-col gap-4 rounded-xl border p-6">
      <h2 className="text-base font-semibold">{title}</h2>
      {!rows ? (
        <Skeleton className="h-40" />
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">Chưa có dữ liệu trong khoảng này.</p>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {rows.map((r) => (
            <li
              key={r.key}
              className="grid grid-cols-[minmax(0,180px)_1fr_80px] items-center gap-4 text-sm"
            >
              <span className="truncate">{r.label}</span>
              <span className="bg-background h-2 rounded-full">
                <span
                  className="bg-grad-primary block h-full rounded-full"
                  style={{ width: `${(r.value / max) * 100}%` }}
                />
              </span>
              <span className="font-semibold tabular-nums">{r.display}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** SCR-A01 */
export function DashboardPage() {
  const today = vn().format('YYYY-MM-DD')
  const [filter, setFilter] = useState<StatsFilter>({
    from: vn().subtract(29, 'day').format('YYYY-MM-DD'),
    to: today,
  })
  const [groupBy, setGroupBy] = useState<'DAY' | 'MONTH'>('DAY')
  const [rangeOpen, setRangeOpen] = useState(false)
  const branches = useBranches()
  const stats = useStats(filter, groupBy)
  // Kỳ trước cùng độ dài để tính % thay đổi
  const days = vn(filter.to).diff(vn(filter.from), 'day') + 1
  const prev = useStatsSummary({
    ...filter,
    from: vn(filter.from).subtract(days, 'day').format('YYYY-MM-DD'),
    to: vn(filter.from).subtract(1, 'day').format('YYYY-MM-DD'),
  }).data
  const s = stats.summary.data
  const cancelRate = s && s.bookings ? s.cancelledBookings / s.bookings : 0
  const prevCancel = prev && prev.bookings ? prev.cancelledBookings / prev.bookings : undefined
  const peak = stats.occupancy.data?.byHour.reduce((a, b) => (b.rate > a.rate ? b : a), {
    hour: 0,
    rate: 0,
  })
  const maxRevenue = Math.max(0, ...(stats.revenue.data ?? []).map((p) => p.amount))

  if (stats.summary.isError)
    return <ErrorState error={stats.summary.error} onRetry={() => void stats.summary.refetch()} />

  const revenueDelta = s && delta(s.revenue, prev?.revenue, { suffix: ' so với kỳ trước' })
  const bookingsDelta = s && delta(s.bookings, prev?.bookings)
  const ticketDelta = s && delta(s.avgTicket, prev?.avgTicket)
  const occDelta = s && delta(s.occupancyRate, prev?.occupancyRate, { points: true })
  const cancelDelta = s && delta(cancelRate, prevCancel, { points: true, lowerIsBetter: true })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" breadcrumb="Quản trị  /  Tổng quan" />

      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-[280px]">
          <FieldLabel htmlFor="stats-range">Khoảng thời gian</FieldLabel>
          <Popover open={rangeOpen} onOpenChange={setRangeOpen}>
            <PopoverTrigger asChild>
              <Button
                id="stats-range"
                variant="outline"
                className="h-10 w-full justify-between px-3 font-normal"
              >
                {dayjs(filter.from).format('DD/MM/YYYY')} – {dayjs(filter.to).format('DD/MM/YYYY')}
                <ChevronDownIcon className="text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="flex w-auto gap-2 p-2">
              <div className="flex flex-col gap-1 border-r pr-2">
                {PRESETS.map((p) => (
                  <Button
                    key={p.label}
                    variant="ghost"
                    size="sm"
                    className="justify-start font-normal"
                    onClick={() => {
                      setFilter({ ...filter, from: p.from().format('YYYY-MM-DD'), to: today })
                      setRangeOpen(false)
                    }}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
              <Calendar
                mode="range"
                locale={vi}
                numberOfMonths={2}
                defaultMonth={dayjs(filter.from).toDate()}
                selected={{ from: dayjs(filter.from).toDate(), to: dayjs(filter.to).toDate() }}
                disabled={{ after: dayjs(today).toDate() }}
                onSelect={(r) =>
                  r?.from &&
                  setFilter({
                    ...filter,
                    from: dayjs(r.from).format('YYYY-MM-DD'),
                    to: dayjs(r.to ?? r.from).format('YYYY-MM-DD'),
                  })
                }
              />
            </PopoverContent>
          </Popover>
        </Field>
        <Field className="w-[220px]">
          <FieldLabel htmlFor="stats-branch">Chi nhánh</FieldLabel>
          <Select
            value={filter.branchId ? String(filter.branchId) : 'all'}
            onValueChange={(v) =>
              setFilter({ ...filter, branchId: v === 'all' ? undefined : Number(v) })
            }
          >
            <SelectTrigger id="stats-branch" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả chi nhánh</SelectItem>
              {branches.data?.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Segmented
          className="mb-px"
          value={groupBy}
          onChange={setGroupBy}
          options={[
            { value: 'DAY', label: 'Ngày' },
            { value: 'MONTH', label: 'Tháng' },
          ]}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {!s ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
        ) : (
          <>
            <StatCard
              label="Doanh thu"
              value={formatVND(s.revenue)}
              note={revenueDelta?.note}
              noteClassName={revenueDelta?.className}
            />
            <StatCard
              label="Số đơn"
              value={formatNumber(s.bookings)}
              note={bookingsDelta?.note}
              noteClassName={bookingsDelta?.className}
            />
            <StatCard
              label="Giá trị TB / đơn"
              value={formatVND(s.avgTicket)}
              note={ticketDelta?.note}
              noteClassName={ticketDelta?.className}
            />
            <StatCard
              label="Tỷ lệ lấp đầy"
              value={formatPercent(s.occupancyRate)}
              note={occDelta?.note}
              noteClassName={occDelta?.className}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="bg-card flex flex-col gap-4 rounded-xl border p-6">
          <h2 className="text-base font-semibold">
            Doanh thu theo {groupBy === 'DAY' ? 'ngày' : 'tháng'} (triệu đồng)
          </h2>
          {!stats.revenue.data ? (
            <Skeleton className="h-64" />
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <BarChart
                data={stats.revenue.data}
                margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
                barCategoryGap={4}
              >
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis
                  dataKey="period"
                  {...AXIS}
                  tickFormatter={(p: string) =>
                    dayjs(p).format(groupBy === 'DAY' ? 'DD/MM' : 'MM/YY')
                  }
                  minTickGap={24}
                />
                <YAxis {...AXIS} width={40} tickFormatter={compactVND} />
                <Tooltip
                  cursor={{ fill: 'var(--color-muted)', opacity: 0.6 }}
                  content={
                    <ChartTooltip
                      formatLabel={(p) =>
                        dayjs(p).format(groupBy === 'DAY' ? 'dddd, DD/MM/YYYY' : 'MM/YYYY')
                      }
                      formatValue={formatVND}
                    />
                  }
                />
                <Bar
                  isAnimationActive={false}
                  dataKey="amount"
                  fill="var(--color-chart-1)"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={32}
                >
                  <LabelList
                    dataKey="amount"
                    position="top"
                    fontSize={12}
                    fill="var(--color-foreground)"
                    formatter={(v: number) => (v === maxRevenue && v > 0 ? compactVND(v) : '')}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        <div className="flex flex-col gap-4">
          {!s ? (
            <Skeleton className="h-full min-h-60 rounded-xl" />
          ) : (
            <>
              <StatCard
                label="Tỷ lệ hủy"
                value={formatPercent(cancelRate, 1)}
                note={cancelDelta?.note ? `${cancelDelta.note} · gồm no-show` : 'gồm no-show'}
                noteClassName={cancelDelta?.className}
              />
              <StatCard
                label="Đơn hoàn thành"
                value={formatNumber(s.completedBookings)}
                note={`${formatPercent(s.bookings ? s.completedBookings / s.bookings : 0)} tổng số đơn`}
                noteClassName="text-room-available"
              />
              <StatCard
                label="Giờ cao điểm"
                value={peak ? `${String(peak.hour).padStart(2, '0')}h` : '—'}
                note={peak ? `Lấp đầy ${formatPercent(peak.rate)}` : undefined}
                noteClassName="text-room-available"
              />
            </>
          )}
        </div>
      </div>

      <section className="bg-card flex flex-col gap-4 rounded-xl border p-6">
        <h2 className="text-base font-semibold">Tỷ lệ lấp đầy theo giờ trong ngày</h2>
        {!stats.occupancy.data ? (
          <Skeleton className="h-52" />
        ) : (
          <ResponsiveContainer width="100%" height={208}>
            <BarChart
              data={stats.occupancy.data.byHour}
              margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
              barCategoryGap={4}
            >
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="hour"
                {...AXIS}
                tickFormatter={(h: number) => `${String(h).padStart(2, '0')}h`}
              />
              <YAxis
                {...AXIS}
                width={40}
                domain={[0, 1]}
                ticks={[0, 0.25, 0.5, 0.75, 1]}
                tickFormatter={(v: number) => formatPercent(v)}
              />
              <Tooltip
                cursor={{ fill: 'var(--color-muted)', opacity: 0.6 }}
                content={
                  <ChartTooltip
                    formatLabel={(h) =>
                      `${String(h).padStart(2, '0')}:00 – ${String((Number(h) + 1) % 24).padStart(2, '0')}:00`
                    }
                    formatValue={(v) => `${formatPercent(v, 1)} phòng có khách`}
                  />
                }
              />
              <Bar
                isAnimationActive={false}
                dataKey="rate"
                fill="var(--color-chart-1)"
                radius={[2, 2, 0, 0]}
              >
                <LabelList
                  dataKey="rate"
                  position="top"
                  fontSize={12}
                  fill="var(--color-foreground)"
                  formatter={(v: number) =>
                    peak && v === peak.rate && v > 0 ? formatPercent(v) : ''
                  }
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <TopList
          title="Top phòng theo lượt đặt"
          rows={stats.topRooms.data
            ?.slice()
            .sort((a, b) => b.bookings - a.bookings)
            .slice(0, 5)
            .map((r) => ({
              key: r.roomId,
              label: `${r.code} · ${r.type} · ${r.branchName.replace(/^KTV\s+/, '')}`,
              value: r.bookings,
              display: `${r.bookings} lượt`,
            }))}
        />
        <TopList
          title="Top món bán chạy"
          rows={stats.topItems.data?.slice(0, 5).map((i) => ({
            key: i.menuItemId,
            label: i.name,
            value: i.quantity,
            display: formatNumber(i.quantity),
          }))}
        />
      </div>
    </div>
  )
}
