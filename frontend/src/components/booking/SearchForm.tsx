import { useEffect, useState, type FormEvent } from 'react'
import type { Branch } from '@/types/domain'
import { DatePicker } from '@components/DatePicker'
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
import { cn } from '@lib/utils'
import { formatHours } from '@utils/format'
import { availableStartTimes, type SearchValues } from '@utils/search'
import {
  combineDateTime,
  HOUR_OPTIONS,
  MAX_ADVANCE_DAYS,
  validateBookingWindow,
  vn,
} from '@utils/time'

interface SearchFormProps {
  branches: Branch[]
  initial: SearchValues
  onSubmit: (values: SearchValues) => void
  submitLabel?: string
  /** `inline`: một hàng trên desktop; `card`: lưới 2 cột; `stack`: một cột (sidebar). */
  layout?: 'inline' | 'card' | 'stack'
  /** Ẩn ô chi nhánh khi trang đã gắn với một chi nhánh. */
  hideBranch?: boolean
  /** Gọi mỗi khi người dùng đổi giá trị hợp lệ (trang tìm phòng cập nhật ngay). */
  autoSubmit?: boolean
}

export function SearchForm({
  branches,
  initial,
  onSubmit,
  submitLabel = 'Tìm phòng',
  layout = 'card',
  autoSubmit,
  hideBranch,
}: SearchFormProps) {
  const [values, setValues] = useState(initial)
  const branch = branches.find((b) => b.id === values.branchId) ?? branches[0]
  const times = availableStartTimes(branch, values.date)
  const today = vn().format('YYYY-MM-DD')
  const error = times.includes(values.time)
    ? validateBookingWindow(
        combineDateTime(values.date, values.time, branch.openTime),
        values.hours,
        branch,
      )
    : 'Chọn giờ bắt đầu'

  useEffect(() => setValues(initial), [initial])

  const update = (patch: Partial<SearchValues>) => {
    const next = { ...values, ...patch }
    // Đổi ngày / chi nhánh làm giờ cũ không hợp lệ → chọn giờ hợp lệ đầu tiên
    const b = branches.find((x) => x.id === next.branchId) ?? branch
    const nextTimes = availableStartTimes(b, next.date)
    if (!nextTimes.includes(next.time) && nextTimes.length) next.time = nextTimes[0]
    setValues(next)
    if (autoSubmit && nextTimes.includes(next.time)) {
      const err = validateBookingWindow(
        combineDateTime(next.date, next.time, b.openTime),
        next.hours,
        b,
      )
      if (!err) onSubmit(next)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!error) onSubmit(values)
  }

  return (
    <form
      onSubmit={submit}
      className={cn(
        'grid gap-4',
        layout === 'inline'
          ? 'sm:grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto] lg:items-end'
          : layout === 'card' && 'sm:grid-cols-2',
      )}
    >
      <Field className={cn(layout === 'card' && 'sm:col-span-2', hideBranch && 'hidden')}>
        <FieldLabel htmlFor="search-branch">Chi nhánh</FieldLabel>
        <Select
          value={String(values.branchId)}
          onValueChange={(v) => update({ branchId: Number(v) })}
        >
          <SelectTrigger id="search-branch" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {branches.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor="search-date">Ngày</FieldLabel>
        <DatePicker
          id="search-date"
          value={values.date}
          min={
            vn().format('HH:mm') < branch.openTime
              ? vn().subtract(1, 'day').format('YYYY-MM-DD')
              : today
          }
          max={vn().add(MAX_ADVANCE_DAYS, 'day').format('YYYY-MM-DD')}
          onChange={(date) => update({ date })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="search-time">Giờ bắt đầu</FieldLabel>
        <Select
          value={times.includes(values.time) ? values.time : undefined}
          onValueChange={(time) => update({ time })}
        >
          <SelectTrigger id="search-time" className="w-full" disabled={!times.length}>
            <SelectValue placeholder={times.length ? 'Chọn giờ' : 'Hết giờ'} />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {times.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor="search-hours">Số giờ</FieldLabel>
        <Select value={String(values.hours)} onValueChange={(v) => update({ hours: Number(v) })}>
          <SelectTrigger id="search-hours" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HOUR_OPTIONS.map((h) => (
              <SelectItem key={h} value={String(h)}>
                {formatHours(h)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor="search-people">Số người</FieldLabel>
        <Input
          id="search-people"
          type="number"
          min={1}
          max={30}
          value={values.people}
          onChange={(e) =>
            update({ people: Math.max(1, Math.min(30, Number(e.target.value) || 1)) })
          }
        />
      </Field>
      <Button
        type="submit"
        disabled={!!error}
        className={
          layout === 'card' ? 'sm:col-span-2' : layout === 'inline' ? 'lg:mb-0.5' : 'w-full'
        }
      >
        {submitLabel}
      </Button>
      {error && times.length > 0 && (
        <p
          className={cn(
            'text-destructive text-sm',
            layout === 'card' ? 'sm:col-span-2' : 'lg:col-span-6',
          )}
        >
          {error}
        </p>
      )}
      {!times.length && (
        <p
          className={cn(
            'text-muted-foreground text-sm',
            layout === 'card' ? 'sm:col-span-2' : 'lg:col-span-6',
          )}
        >
          Hôm nay đã hết khung giờ đặt được, hãy chọn ngày khác.
        </p>
      )}
    </form>
  )
}
