import { CircleAlertIcon, CircleCheckIcon, InfoIcon, TriangleAlertIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@lib/utils'

type Tone = 'success' | 'info' | 'warning' | 'error'

const TONE: Record<Tone, { className: string; icon: typeof InfoIcon }> = {
  success: {
    className: 'bg-room-available-bg border-room-available [&>svg]:text-room-available',
    icon: CircleCheckIcon,
  },
  info: { className: 'bg-info-bg border-info [&>svg]:text-info', icon: InfoIcon },
  warning: {
    className: 'bg-room-held-bg border-room-held [&>svg]:text-room-held',
    icon: TriangleAlertIcon,
  },
  error: {
    className: 'bg-room-booked-bg border-room-booked [&>svg]:text-room-booked',
    icon: CircleAlertIcon,
  },
}

/** Khối thông báo có viền màu trạng thái (Figma "Alert"). */
export function Notice({
  tone = 'info',
  children,
  className,
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  const { className: toneClass, icon: Icon } = TONE[tone]
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm',
        toneClass,
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
