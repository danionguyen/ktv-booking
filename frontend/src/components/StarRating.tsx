import { StarIcon } from 'lucide-react'
import { cn } from '@lib/utils'

interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  size?: 'sm' | 'md' | 'lg'
}

const SIZE = { sm: 'size-3.5', md: 'size-5', lg: 'size-8' }

export function StarRating({ value, onChange, size = 'md' }: StarRatingProps) {
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${value} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const star = (
          <StarIcon
            className={cn(
              SIZE[size],
              n <= Math.round(value)
                ? 'fill-room-held text-room-held'
                : 'fill-muted text-muted-foreground/40',
            )}
          />
        )
        return onChange ? (
          <button
            key={n}
            type="button"
            aria-label={`${n} sao`}
            onClick={() => onChange(n)}
            className="p-0.5"
          >
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        )
      })}
    </div>
  )
}
