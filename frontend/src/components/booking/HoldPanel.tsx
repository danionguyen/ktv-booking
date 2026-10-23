import { UsersIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { errorMessage } from '@api/queryClient'
import { Tag } from '@components/Tag'
import { Button } from '@components/ui/button'
import { Skeleton } from '@components/ui/skeleton'
import { usePriceQuote } from '@hooks/queries/useCatalog'
import { DAY_TYPE_SHORT } from '@utils/booking'
import { formatHours, formatTime, formatVND } from '@utils/format'

export interface HoldTarget {
  roomId: number
  code: string
  type: string
  capacity: number
  available: boolean
}

interface HoldPanelProps {
  target: HoldTarget
  start: string
  end: string
  hours: number
  people: number
  pending: boolean
  onHold: () => void
}

/** Nội dung popover khi bấm ô phòng trên sơ đồ (SCR-C07a): báo giá + nút giữ chỗ. */
export function HoldPanel({ target, start, end, hours, people, pending, onHold }: HoldPanelProps) {
  const quote = usePriceQuote(target.roomId, start, hours)
  const detailUrl = `/rooms/${target.roomId}?start=${encodeURIComponent(start)}&hours=${hours}&people=${people}`
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Link to={detailUrl} className="text-base font-semibold hover:underline">
          {target.code} · {target.type}
        </Link>
        {target.available ? (
          <Tag color="green">Trống</Tag>
        ) : (
          <Tag color="red">Vừa có người giữ</Tag>
        )}
      </div>
      <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <UsersIcon className="size-3.5" /> Tối đa {target.capacity} người · bạn đi {people} người
      </p>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>
          {formatTime(start)} – {formatTime(end)}
        </span>
        {quote.isPending ? (
          <Skeleton className="h-5 w-20" />
        ) : quote.isError ? null : (
          <span className="text-link font-semibold">{formatVND(quote.data.total)}</span>
        )}
      </div>
      {quote.isError ? (
        <p className="text-destructive text-xs">{errorMessage(quote.error)}</p>
      ) : (
        quote.data && (
          <ul className="text-muted-foreground flex flex-col gap-0.5 text-xs">
            {quote.data.breakdown.map((l, i) => (
              <li key={i}>
                {formatHours(l.hours)} × {formatVND(l.unitPrice)} ({DAY_TYPE_SHORT[l.dayType]},{' '}
                {l.from}–{l.to})
              </li>
            ))}
          </ul>
        )
      )}
      <Button onClick={onHold} disabled={pending || !target.available || quote.isError}>
        {pending ? 'Đang giữ chỗ…' : 'Giữ chỗ phòng này'}
      </Button>
      <p className="text-muted-foreground text-xs">Phòng được giữ cho bạn 10 phút.</p>
    </div>
  )
}
