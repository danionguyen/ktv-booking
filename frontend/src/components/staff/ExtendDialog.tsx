import { useEffect, useState } from 'react'
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
import { RadioGroup, RadioGroupItem } from '@components/ui/radio-group'
import { Skeleton } from '@components/ui/skeleton'
import { useExtend, useExtendOptions } from '@hooks/queries/useStaff'
import { cn } from '@lib/utils'
import { formatTime, formatVND } from '@utils/format'

/** Các mốc gia hạn hiển thị; mốc không có trong API = vướng đơn kế tiếp / giờ đóng cửa. */
const STEPS = [30, 60, 90, 120]

function minutesLabel(m: number) {
  const h = Math.floor(m / 60)
  return [h && `${h} giờ`, m % 60 && `${m % 60} phút`].filter(Boolean).join(' ')
}

interface ExtendDialogProps {
  bookingId: number
  roomCode: string
  endTime: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** SCR-S03c — gia hạn nếu khoảng tiếp theo còn trống (BR-62). */
export function ExtendDialog({
  bookingId,
  roomCode,
  endTime,
  open,
  onOpenChange,
}: ExtendDialogProps) {
  const options = useExtendOptions(bookingId, open)
  const extend = useExtend(bookingId)
  const [minutes, setMinutes] = useState<number | null>(null)
  const available = options.data?.options ?? []
  const steps = [...new Set([...STEPS, ...available.map((o) => o.minutes)])].sort((a, b) => a - b)
  const picked = available.find((o) => o.minutes === minutes)

  useEffect(() => {
    if (open) setMinutes(options.data?.options[0]?.minutes ?? null)
  }, [open, options.data])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Gia hạn giờ hát · {roomCode}</DialogTitle>
          <DialogDescription>Giờ kết thúc hiện tại: {formatTime(endTime)}</DialogDescription>
        </DialogHeader>
        {options.isPending ? (
          <Skeleton className="h-48" />
        ) : (
          <RadioGroup
            value={minutes ? String(minutes) : ''}
            onValueChange={(v) => setMinutes(Number(v))}
            className="flex flex-col gap-2.5"
          >
            {steps.map((m) => {
              const o = available.find((x) => x.minutes === m)
              return (
                <label
                  key={m}
                  htmlFor={`ext-${m}`}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-[10px] border px-3.5 py-3 text-sm',
                    !o
                      ? 'cursor-not-allowed'
                      : minutes === m
                        ? 'border-primary bg-secondary cursor-pointer'
                        : 'cursor-pointer',
                  )}
                >
                  <span className={cn('flex items-center gap-2', !o && 'opacity-45')}>
                    <RadioGroupItem id={`ext-${m}`} value={String(m)} disabled={!o} />
                    {minutesLabel(m)}
                  </span>
                  {o ? (
                    <span className="font-semibold">+{formatVND(o.amount)}</span>
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      Không khả dụng – vướng đơn kế tiếp
                    </span>
                  )}
                </label>
              )
            })}
          </RadioGroup>
        )}
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground text-sm">Giờ kết thúc mới</span>
          <span className="text-link text-xl font-semibold">
            {picked ? formatTime(picked.newEnd) : '—'}
          </span>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            disabled={!picked || extend.isPending}
            onClick={() =>
              picked &&
              extend.mutate(picked.minutes, {
                onSuccess: (b) => {
                  toast.success(`Đã gia hạn tới ${formatTime(b.endTime)}`)
                  onOpenChange(false)
                },
              })
            }
          >
            {extend.isPending ? 'Đang gia hạn…' : 'Xác nhận gia hạn'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
