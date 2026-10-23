import { TimerIcon } from 'lucide-react'
import { useCountdown } from '@hooks/useCountdown'
import { cn } from '@lib/utils'

interface HoldCountdownProps {
  deadline: string
  serverTime?: string
  compact?: boolean
  className?: string
}

/** Đồng hồ đếm ngược giữ chỗ 10 phút (BR-10) / thanh toán 15 phút (BR-44). */
export function HoldCountdown({ deadline, serverTime, compact, className }: HoldCountdownProps) {
  const { label, msLeft } = useCountdown(deadline, serverTime)
  const urgent = msLeft < 60_000
  if (compact)
    return <span className={cn('font-mono font-semibold tabular-nums', className)}>{label}</span>
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-sm font-semibold tabular-nums',
        urgent ? 'bg-room-booked-bg text-room-booked' : 'bg-room-held-bg text-room-held',
        className,
      )}
    >
      <TimerIcon className="size-4" />
      {label}
    </span>
  )
}
