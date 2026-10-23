import type { ReactNode } from 'react'
import { cn } from '@lib/utils'

/** Figma Library › Stat Card: nhãn 14 · số 28/700 · ghi chú 12. */
export function StatCard({
  label,
  value,
  note,
  noteClassName,
  className,
}: {
  label: ReactNode
  value: ReactNode
  note?: ReactNode
  /** vd. `text-room-available` cho "+12%". */
  noteClassName?: string
  className?: string
}) {
  return (
    <div className={cn('bg-card flex min-w-0 flex-col gap-1 rounded-xl border p-5', className)}>
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="text-[28px] leading-9 font-bold">{value}</p>
      {note && (
        <p className={cn('text-muted-foreground truncate text-xs', noteClassName)}>{note}</p>
      )}
    </div>
  )
}
