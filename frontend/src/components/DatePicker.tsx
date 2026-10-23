import { ChevronDownIcon } from 'lucide-react'
import { useState } from 'react'
import { vi } from 'react-day-picker/locale'
import { Button } from '@components/ui/button'
import { Calendar } from '@components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover'
import { cn } from '@lib/utils'
import { dayjs } from '@utils/format'

interface DatePickerProps {
  /** `YYYY-MM-DD` */
  value: string | undefined
  onChange: (value: string) => void
  min?: string
  max?: string
  placeholder?: string
  className?: string
  id?: string
}

const toDate = (s: string) => dayjs(s, 'YYYY-MM-DD').toDate()

export function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = 'Chọn ngày',
  className,
  id,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const disabled = [
    ...(min ? [{ before: toDate(min) }] : []),
    ...(max ? [{ after: toDate(max) }] : []),
  ]
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            'h-10 w-full justify-between px-3 font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          {value ? dayjs(value).format('DD/MM/YYYY') : placeholder}
          <ChevronDownIcon className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={vi}
          selected={value ? toDate(value) : undefined}
          defaultMonth={value ? toDate(value) : undefined}
          disabled={disabled}
          onSelect={(d) => {
            if (!d) return
            onChange(dayjs(d).format('YYYY-MM-DD'))
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
