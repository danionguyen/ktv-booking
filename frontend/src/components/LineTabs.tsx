import { cn } from '@lib/utils'

/** Tab gạch chân vàng (Figma SCR-C09 menu, SCR-C11 nhóm đơn). */
export function LineTabs<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div role="tablist" className={cn('flex gap-2 border-b', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            '-mb-px border-b-2 px-1 pt-1 pb-3 text-sm transition-colors not-first:ml-6',
            value === o.value
              ? 'border-primary text-link font-semibold'
              : 'text-muted-foreground hover:text-foreground border-transparent',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
