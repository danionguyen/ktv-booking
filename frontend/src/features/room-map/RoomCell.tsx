import { forwardRef, type ReactNode } from 'react'
import type { MapRoom } from '@/types/domain'
import { cn } from '@lib/utils'
import { LIVE_STATUS_CLASS, LIVE_STATUS_LABEL, LIVE_STATUS_TEXT } from '@utils/booking'
import { HoldCountdown } from './HoldCountdown'

interface RoomCellProps extends Omit<React.ComponentProps<'button'>, 'children'> {
  room: MapRoom
  selected?: boolean
  flashing?: boolean
  /** Dòng cuối của ô khi phòng trống, vd. giá dự tính. Mặc định: nhãn trạng thái. */
  note?: ReactNode
}

/** Ô phòng (Figma Library › Room Tile): mã phòng màu trạng thái · loại · ghi chú. */
export const RoomCell = forwardRef<HTMLButtonElement, RoomCellProps>(function RoomCell(
  { room, selected, flashing, note, disabled, onClick, className, ...props },
  ref,
) {
  const clickable = !!onClick && !disabled
  return (
    <button
      ref={ref}
      type="button"
      disabled={!clickable}
      onClick={onClick}
      aria-label={`Phòng ${room.code}, ${room.type}, ${LIVE_STATUS_LABEL[room.status]}`}
      className={cn(
        'flex flex-col items-start gap-0.5 overflow-hidden rounded-[10px] border-[1.5px] p-3 text-left text-xs transition-all',
        LIVE_STATUS_CLASS[room.status],
        clickable ? 'cursor-pointer hover:brightness-125' : 'cursor-default',
        disabled && room.status === 'AVAILABLE' && 'opacity-50',
        selected && 'border-primary ring-primary ring-1',
        flashing && 'ring-brand-accent animate-pulse ring-4',
        className,
      )}
      {...props}
    >
      <span className={cn('text-base leading-6 font-semibold', LIVE_STATUS_TEXT[room.status])}>
        {room.code}
      </span>
      <span className="text-muted-foreground truncate leading-5">
        {room.type} · {room.capacity} người
      </span>
      <span className="truncate leading-5">
        {room.status === 'HELD' && room.holdExpiresAt ? (
          <>
            Đang giữ ·{' '}
            <HoldCountdown
              deadline={room.holdExpiresAt}
              compact
              className="font-sans font-normal"
            />
          </>
        ) : room.status === 'AVAILABLE' && note ? (
          note
        ) : (
          LIVE_STATUS_LABEL[room.status]
        )}
      </span>
    </button>
  )
})
