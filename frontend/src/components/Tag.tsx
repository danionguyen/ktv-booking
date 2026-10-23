import type { ComponentProps } from 'react'
import { cn } from '@lib/utils'

/** 6 màu của component Tag trong Figma (Library › Tag). */
export type TagColor = 'green' | 'orange' | 'red' | 'gray' | 'blue' | 'gold'

const TAG_CLASS: Record<TagColor, string> = {
  green: 'bg-room-available-bg border-room-available text-room-available',
  orange: 'bg-room-held-bg border-room-held text-room-held',
  red: 'bg-room-booked-bg border-room-booked text-room-booked',
  gray: 'bg-room-maintenance-bg border-room-maintenance text-room-maintenance',
  blue: 'bg-info-bg border-info text-info',
  gold: 'bg-secondary border-primary text-link',
}

export function Tag({
  color = 'gray',
  className,
  ...props
}: ComponentProps<'span'> & { color?: TagColor }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 w-fit shrink-0 items-center gap-1 rounded-sm border px-2 text-xs whitespace-nowrap',
        TAG_CLASS[color],
        className,
      )}
      {...props}
    />
  )
}
