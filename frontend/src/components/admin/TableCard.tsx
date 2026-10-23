import type { ReactNode } from 'react'
import { cn } from '@lib/utils'

/** Khung bảng admin (Figma: nền card, viền, bo 12px). */
export function TableCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('bg-card overflow-hidden rounded-xl border', className)}>{children}</div>
  )
}
