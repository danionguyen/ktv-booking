import { ImageIcon, UsersIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@components/ui/button'
import { formatHours, formatVND } from '@utils/format'

interface RoomCardProps {
  code: string
  type: string
  capacity: number
  total: number
  hours: number
  to: string
}

/** Thẻ phòng trống ở chế độ Lưới (Figma Library › Room Card, SCR-C07b). */
export function RoomCard({ code, type, capacity, total, hours, to }: RoomCardProps) {
  return (
    <article className="bg-card flex flex-col overflow-hidden rounded-xl border">
      <div className="bg-secondary text-primary flex h-[150px] items-center justify-center">
        <ImageIcon className="size-7" aria-hidden />
      </div>
      <div className="flex flex-col gap-1 p-4">
        <h3 className="text-base font-semibold">
          {code} – {type}
        </h3>
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <UsersIcon className="size-3.5" /> Tối đa {capacity} người
        </p>
        <p className="flex items-baseline gap-1 pt-2 pb-1">
          <span className="text-link text-xl font-bold">{formatVND(total)}</span>
          <span className="text-muted-foreground text-xs">/ {formatHours(hours)}</span>
        </p>
        <Button asChild className="w-full">
          <Link to={to}>Chọn phòng</Link>
        </Button>
      </div>
    </article>
  )
}
