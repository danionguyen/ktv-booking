import { Trash2Icon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { adminApi } from '@api/admin'
import { qk } from '@api/keys'
import { TableCard } from '@components/admin/TableCard'
import { DatePicker } from '@components/DatePicker'
import { LineTabs } from '@components/LineTabs'
import { PageHeader } from '@components/PageHeader'
import { LoadingState } from '@components/states'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@components/ui/table'
import {
  useAdminMutation,
  useAdminRoomTypes,
  useHolidays,
  usePriceRules,
} from '@hooks/queries/useAdmin'
import { cn } from '@lib/utils'
import type { DayType, Holiday, PriceRule } from '@/types/domain'
import { dayjs, formatNumber } from '@utils/format'
import { priceAt, ruleCovers } from '@utils/price'

const DAY_TYPES: DayType[] = ['WEEKDAY', 'WEEKEND', 'HOLIDAY']
const DAY_HEAD: Record<DayType, string> = {
  WEEKDAY: 'T2 – T6 (đ/giờ)',
  WEEKEND: 'T7, CN (đ/giờ)',
  HOLIDAY: 'Ngày lễ (đ/giờ)',
}
/** Màu từng khung trên thanh 24 giờ (xoay vòng theo thứ tự hàng). */
const ROW_TONES = ['bg-secondary border-primary/40', 'bg-grad-primary border-transparent']

/** Một hàng ma trận: khung giờ + đơn giá theo 3 loại ngày. */
interface Row {
  startHour: string
  endHour: string
  prices: Record<DayType, number>
}

/** Rules (loại ngày × khung) → hàng theo khung giờ của ngày thường. */
function toRows(rules: PriceRule[]): Row[] {
  const windows = rules.filter((r) => r.dayType === 'WEEKDAY')
  const base = windows.length ? windows : rules.slice(0, 1)
  return base
    .map((w) => ({
      startHour: w.startHour,
      endHour: w.endHour,
      prices: Object.fromEntries(
        DAY_TYPES.map((d) => [d, priceAt(rules, d, w.startHour) ?? 0]),
      ) as Record<DayType, number>,
    }))
    .sort((a, b) => a.startHour.localeCompare(b.startHour))
}

/** Hàng → rules: mỗi hàng sinh 3 rule (một cho mỗi loại ngày). */
function toRules(rows: Row[], roomTypeId: number): PriceRule[] {
  return rows.flatMap((r) =>
    DAY_TYPES.map((dayType) => ({
      roomTypeId,
      dayType,
      startHour: r.startHour,
      endHour: r.endHour,
      pricePerHour: r.prices[dayType],
    })),
  )
}

const HALF_HOURS = Array.from(
  { length: 48 },
  (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`,
)

/** "Chưa có giá: 02:00–09:00" — các giờ không thuộc khung nào. */
function gaps(rows: Row[]) {
  const covered = (h: number) => rows.some((r) => ruleCovers(r, h * 60))
  const out: string[] = []
  let start: number | null = null
  for (let h = 0; h <= 24; h++) {
    const free = h < 24 && !covered(h)
    if (free && start === null) start = h
    if (!free && start !== null) {
      out.push(`${String(start).padStart(2, '0')}:00–${String(h % 24).padStart(2, '0')}:00`)
      start = null
    }
  }
  return out
}

function TimeSelect({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (v: string) => void
  label: string
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-[92px]" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-64">
        {HALF_HOURS.map((t) => (
          <SelectItem key={t} value={t}>
            {t}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** "16/02 – 20/02" cho các ngày lễ liên tiếp cùng tên. */
function groupHolidays(list: Holiday[]) {
  const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date))
  const groups: { name: string; dates: string[] }[] = []
  for (const h of sorted) {
    const last = groups.at(-1)
    if (last && last.name === h.name && dayjs(h.date).diff(dayjs(last.dates.at(-1)), 'day') === 1)
      last.dates.push(h.date)
    else groups.push({ name: h.name, dates: [h.date] })
  }
  return groups
}

/** SCR-A06 */
export function PriceRulesPage() {
  const [params, setParams] = useSearchParams()
  const types = useAdminRoomTypes()
  const roomTypeId = Number(params.get('roomTypeId')) || types.data?.[0]?.id
  const rules = usePriceRules(roomTypeId)
  const holidays = useHolidays()
  const [rows, setRows] = useState<Row[]>([])
  const [dirty, setDirty] = useState(false)
  const [tab, setTab] = useState<'prices' | 'holidays'>('prices')
  const [adding, setAdding] = useState(false)
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '' })
  const year = dayjs().year()
  /** Ngày lễ năm khác thì ghi kèm năm. */
  const fmtDay = (d: string) => dayjs(d).format(dayjs(d).year() === year ? 'DD/MM' : 'DD/MM/YYYY')

  const saveRules = useAdminMutation(
    (r: PriceRule[]) => adminApi.roomTypes.savePriceRules(roomTypeId!, r),
    [qk.admin.priceRules(roomTypeId ?? 0), ['branches'], ['availability'], ['price-quote']],
  )
  const holidayKeys = [qk.admin.holidays, ['price-quote'], ['availability']]
  const addHoliday = useAdminMutation(adminApi.holidays.create, holidayKeys)
  const removeHoliday = useAdminMutation(adminApi.holidays.remove, holidayKeys)

  useEffect(() => {
    if (rules.data) {
      setRows(toRows(rules.data))
      setDirty(false)
    }
  }, [rules.data])

  const edit = (i: number, patch: Partial<Row>) => {
    setRows((d) => d.map((r, j) => (j === i ? { ...r, ...patch } : r)))
    setDirty(true)
  }
  const free = gaps(rows)
  const save = () =>
    roomTypeId &&
    saveRules.mutate(toRules(rows, roomTypeId), {
      onSuccess: () => toast.success('Đã lưu bảng giá'),
    })

  const holidayCard = (
    <section className="bg-card flex flex-col gap-4 rounded-xl border p-6">
      <h2 className="text-base font-semibold">Ngày lễ</h2>
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ngày</TableHead>
              <TableHead>Tên</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupHolidays(holidays.data ?? []).map((g) => (
              <TableRow key={g.dates[0]}>
                <TableCell>
                  {fmtDay(g.dates[0])}
                  {g.dates.length > 1 && ` – ${fmtDay(g.dates.at(-1)!)}`}
                </TableCell>
                <TableCell className="whitespace-normal">{g.name}</TableCell>
                <TableCell className="px-2">
                  <button
                    type="button"
                    aria-label={`Xóa ${g.name}`}
                    className="text-destructive hover:bg-room-booked-bg flex size-8 items-center justify-center rounded-lg"
                    onClick={() => g.dates.forEach((d) => removeHoliday.mutate(d))}
                  >
                    <Trash2Icon className="size-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>
      {adding ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!newHoliday.date || !newHoliday.name.trim()) return
            addHoliday.mutate(
              { date: newHoliday.date, name: newHoliday.name.trim() },
              {
                onSuccess: () => {
                  setNewHoliday({ date: '', name: '' })
                  setAdding(false)
                  toast.success('Đã thêm ngày lễ')
                },
              },
            )
          }}
        >
          <DatePicker
            value={newHoliday.date || undefined}
            onChange={(date) => setNewHoliday((h) => ({ ...h, date }))}
          />
          <Input
            placeholder="Tên ngày lễ"
            value={newHoliday.name}
            onChange={(e) => setNewHoliday((h) => ({ ...h, name: e.target.value }))}
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setAdding(false)}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={addHoliday.isPending || !newHoliday.date || !newHoliday.name.trim()}
            >
              Thêm
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" className="w-fit" onClick={() => setAdding(true)}>
          + Thêm ngày lễ
        </Button>
      )}
    </section>
  )

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      <PageHeader
        title="Bảng giá & ngày lễ"
        actions={
          <Button disabled={!dirty || saveRules.isPending} onClick={save}>
            {saveRules.isPending ? 'Đang lưu…' : 'Lưu bảng giá'}
          </Button>
        }
      />
      <section className="bg-card flex flex-col gap-5 rounded-xl border p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Ma trận giá</h2>
          <LineTabs
            className="xl:hidden"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'prices', label: 'Bảng giá' },
              { value: 'holidays', label: 'Ngày lễ' },
            ]}
          />
        </div>
        {tab === 'holidays' ? <div className="xl:hidden">{holidayCard}</div> : null}
        <div className={cn('flex flex-col gap-5', tab === 'holidays' && 'max-xl:hidden')}>
          <div className="flex flex-wrap items-end gap-3">
            <Field className="w-56">
              <FieldLabel htmlFor="pr-type">Loại phòng</FieldLabel>
              <Select
                value={roomTypeId ? String(roomTypeId) : undefined}
                onValueChange={(v) => setParams({ roomTypeId: v })}
              >
                <SelectTrigger id="pr-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {types.data?.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <p className="text-muted-foreground pb-2.5 text-xs">
              Mỗi loại phòng có bảng giá riêng (BR-22).
            </p>
          </div>

          {/* Thanh 24 giờ: mỗi ô = 1 giờ, tô theo khung; viền đỏ = chưa có giá */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-px">
              {Array.from({ length: 24 }, (_, h) => {
                const i = rows.findIndex((r) => ruleCovers(r, h * 60))
                return (
                  <span
                    key={h}
                    className={cn(
                      'h-5 flex-1 rounded-[3px] border',
                      i < 0 ? 'border-room-booked' : ROW_TONES[i % ROW_TONES.length],
                    )}
                  />
                )
              })}
            </div>
            <div className="text-muted-foreground grid grid-cols-8 text-xs">
              {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
                <span key={h}>{String(h).padStart(2, '0')}:00</span>
              ))}
            </div>
            <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {rows.map((r, i) => (
                <li key={i} className="inline-flex items-center gap-1.5">
                  <span
                    className={cn('size-2.5 rounded-[2px] border', ROW_TONES[i % ROW_TONES.length])}
                  />
                  {r.startHour}–{r.endHour}
                </li>
              ))}
              {free.length > 0 && (
                <li className="inline-flex items-center gap-1.5">
                  <span className="border-room-booked size-2.5 rounded-[2px] border" />
                  Chưa có giá: {free.join(', ')} (ngoài giờ mở cửa)
                </li>
              )}
            </ul>
          </div>

          {rules.isPending ? (
            <LoadingState rows={2} />
          ) : (
            <TableCard>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Khung giờ</TableHead>
                    {DAY_TYPES.map((d) => (
                      <TableHead key={d}>{DAY_HEAD[d]}</TableHead>
                    ))}
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <span className="flex items-center gap-1.5">
                          <TimeSelect
                            label="Từ giờ"
                            value={r.startHour}
                            onChange={(v) => edit(i, { startHour: v })}
                          />
                          →
                          <TimeSelect
                            label="Đến giờ"
                            value={r.endHour}
                            onChange={(v) => edit(i, { endHour: v })}
                          />
                        </span>
                      </TableCell>
                      {DAY_TYPES.map((d) => (
                        <TableCell key={d}>
                          <Input
                            inputMode="numeric"
                            value={formatNumber(r.prices[d])}
                            onChange={(e) =>
                              edit(i, {
                                prices: {
                                  ...r.prices,
                                  [d]: Number(e.target.value.replace(/\D/g, '')) || 0,
                                },
                              })
                            }
                            className="h-8 w-28"
                            aria-label={`${DAY_HEAD[d]} ${r.startHour}`}
                          />
                        </TableCell>
                      ))}
                      <TableCell className="px-2">
                        <button
                          type="button"
                          aria-label="Xóa khung"
                          className="text-destructive hover:bg-room-booked-bg flex size-8 items-center justify-center rounded-lg"
                          onClick={() => {
                            setRows((d) => d.filter((_, j) => j !== i))
                            setDirty(true)
                          }}
                        >
                          <Trash2Icon className="size-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableCard>
          )}
          <button
            type="button"
            className="text-link w-fit text-sm font-semibold hover:underline"
            onClick={() => {
              const last = rows.at(-1)
              const start = last?.endHour ?? '09:00'
              setRows((d) => [
                ...d,
                {
                  startHour: start,
                  endHour: HALF_HOURS[(HALF_HOURS.indexOf(start) + 8) % 48],
                  prices: { WEEKDAY: 100000, WEEKEND: 150000, HOLIDAY: 200000 },
                },
              ])
              setDirty(true)
            }}
          >
            + Thêm khung giờ
          </button>
          <p className="text-muted-foreground text-xs">
            Đơn giá được chốt tại thời điểm đặt; thay đổi không ảnh hưởng đơn đã đặt (BR-24). Khung
            có giờ kết thúc nhỏ hơn giờ bắt đầu là khung qua đêm.
          </p>
        </div>
      </section>
      <div className="max-xl:hidden">{holidayCard}</div>
    </div>
  )
}
