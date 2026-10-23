import { cn } from '@lib/utils'

/** Chú thích 4 màu như Figma SCR-C07a. */
const ITEMS = [
  { label: 'Trống', className: 'bg-room-available' },
  { label: 'Đang giữ', className: 'bg-room-held' },
  { label: 'Đã đặt / đang hát', className: 'bg-room-booked' },
  { label: 'Bảo trì', className: 'bg-room-maintenance' },
]

export function StatusLegend({ className }: { className?: string }) {
  return (
    <ul className={cn('text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs', className)}>
      {ITEMS.map((i) => (
        <li key={i.label} className="inline-flex items-center gap-1.5">
          <span className={cn('size-2.5 rounded-full', i.className)} />
          {i.label}
        </li>
      ))}
    </ul>
  )
}
