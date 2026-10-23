import { useEffect, useRef, useState } from 'react'
import type { MapRoom, RoomMapSnapshot } from '@/types/domain'
import { RoomCell } from './RoomCell'

interface RoomMapProps {
  snapshot: RoomMapSnapshot
  flashing?: Set<number>
  selectedRoomId?: number
  /** Chỉ phòng trống mới bấm được nếu không truyền `isSelectable`. */
  isSelectable?: (room: MapRoom) => boolean
  onSelect?: (room: MapRoom) => void
}

/** Sơ đồ mặt bằng: vị trí tuyệt đối theo `posX/posY`, co giãn theo bề rộng khung. */
export function RoomMap({
  snapshot,
  flashing,
  selectedRoomId,
  isSelectable,
  onSelect,
}: RoomMapProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const { mapWidth, mapHeight } = snapshot.branch

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) =>
      setScale(Math.min(1, entry.contentRect.width / mapWidth)),
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [mapWidth])

  const selectable = isSelectable ?? ((r: MapRoom) => r.status === 'AVAILABLE')

  return (
    <div ref={ref} className="w-full">
      <div
        className="bg-background relative overflow-hidden rounded-lg bg-[radial-gradient(circle,_var(--color-border)_1px,_transparent_1px)] [background-size:20px_20px]"
        style={{ height: mapHeight * scale }}
      >
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{ width: mapWidth, height: mapHeight, transform: `scale(${scale})` }}
        >
          {snapshot.rooms.map((room) => (
            <RoomCell
              key={room.id}
              room={room}
              selected={room.id === selectedRoomId}
              flashing={flashing?.has(room.id)}
              disabled={!selectable(room)}
              onClick={onSelect ? () => onSelect(room) : undefined}
              className="absolute"
              style={{ left: room.posX, top: room.posY, width: room.width, height: room.height }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
