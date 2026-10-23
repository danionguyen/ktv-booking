import { Loader2Icon } from 'lucide-react'
import { cn } from '@lib/utils'

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Đang tải"
      className={cn('size-6 animate-spin', className)}
    />
  )
}
