import { Link } from 'react-router-dom'
import { cn } from '@lib/utils'

interface SegmentedOption<T extends string> {
  value: T
  label: string
  /** Có `to` thì là link (vd. chuyển Timeline ↔ Sơ đồ). */
  to?: string
}

/** Nút chuyển chế độ dạng "segmented" trong Figma (nền bg-layout, mục chọn nền card). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: SegmentedOption<T>[]
  value: T
  onChange?: (value: T) => void
  className?: string
}) {
  return (
    <div
      role="tablist"
      className={cn('bg-background inline-flex shrink-0 gap-0.5 rounded-lg p-[3px]', className)}
    >
      {options.map((o) => {
        const active = o.value === value
        const cls = cn(
          'rounded-md px-3.5 py-[5px] text-sm transition-colors',
          active
            ? 'bg-card text-foreground font-semibold'
            : 'text-muted-foreground hover:text-foreground',
        )
        return o.to ? (
          <Link key={o.value} to={o.to} role="tab" aria-selected={active} className={cls}>
            {o.label}
          </Link>
        ) : (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={cls}
            onClick={() => onChange?.(o.value)}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
