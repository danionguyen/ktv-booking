import type { ReactNode } from 'react'
import { cn } from '@lib/utils'

/** Dòng "nhãn ··· giá trị" trong các thẻ thông tin của Figma (nhãn mờ trái, giá trị đậm phải). */
export function InfoRow({
  label,
  children,
  className,
}: {
  label: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 text-sm', className)}>
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-right font-semibold">{children}</dd>
    </div>
  )
}
