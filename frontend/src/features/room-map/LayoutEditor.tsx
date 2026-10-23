import {
  DndContext,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useRef, useState } from 'react'
import type { Room } from '@/types/domain'
import { cn } from '@lib/utils'

export type LayoutRoom = Pick<
  Room,
  'id' | 'code' | 'type' | 'status' | 'posX' | 'posY' | 'width' | 'height'
>

const GRID = 10
const snap = (v: number) => Math.round(v / GRID) * GRID

function DraggableRoom({
  room,
  scale,
  selected,
  onSelect,
}: {
  room: LayoutRoom
  scale: number
  selected: boolean
  onSelect: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: room.id })
  // transform tính theo pixel màn hình → chia scale để khớp tọa độ sơ đồ
  const t = transform ? { ...transform, x: transform.x / scale, y: transform.y / scale } : null
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={onSelect}
      className={cn(
        'bg-card absolute flex touch-none flex-col items-start gap-0.5 rounded-lg border p-2.5 text-left select-none',
        room.status === 'MAINTENANCE' && 'border-dashed opacity-70',
        isDragging ? 'z-10 cursor-grabbing shadow-lg' : 'cursor-grab',
        selected && 'border-primary z-10 border-2 shadow-[0_0_24px_rgb(212_175_55/0.25)]',
      )}
      style={{
        left: room.posX,
        top: room.posY,
        width: room.width,
        height: room.height,
        transform: CSS.Translate.toString(t),
      }}
    >
      <span className={cn('text-base font-semibold', selected && 'text-link')}>{room.code}</span>
      <span className="text-muted-foreground text-xs">{room.type}</span>
      {selected && (
        <span className="bg-grad-primary text-primary-foreground absolute top-full left-0 mt-1.5 rounded px-1.5 py-0.5 text-xs whitespace-nowrap">
          x {room.posX} · y {room.posY}
        </span>
      )}
    </button>
  )
}

interface LayoutEditorProps {
  rooms: LayoutRoom[]
  mapWidth: number
  mapHeight: number
  selectedId: number | null
  onSelect: (id: number) => void
  onChange: (rooms: LayoutRoom[]) => void
}

/** Kéo thả vị trí phòng (FD-BRN-03), bám lưới 10px, không cho ra ngoài khung. */
export function LayoutEditor({
  rooms,
  mapWidth,
  mapHeight,
  selectedId,
  onSelect,
  onChange,
}: LayoutEditorProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) =>
      setScale(Math.min(1, entry.contentRect.width / mapWidth)),
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [mapWidth])

  const onDragEnd = ({ active, delta }: DragEndEvent) => {
    onChange(
      rooms.map((r) =>
        r.id === active.id
          ? {
              ...r,
              posX: Math.min(Math.max(0, snap(r.posX + delta.x / scale)), mapWidth - r.width),
              posY: Math.min(Math.max(0, snap(r.posY + delta.y / scale)), mapHeight - r.height),
            }
          : r,
      ),
    )
  }

  return (
    <div ref={ref} className="w-full">
      <div className="relative overflow-hidden rounded-lg" style={{ height: mapHeight * scale }}>
        <div
          className="bg-background absolute top-0 left-0 origin-top-left bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] [background-size:20px_20px]"
          style={{ width: mapWidth, height: mapHeight, transform: `scale(${scale})` }}
        >
          <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            {rooms.map((room) => (
              <DraggableRoom
                key={room.id}
                room={room}
                scale={scale}
                selected={room.id === selectedId}
                onSelect={() => onSelect(room.id)}
              />
            ))}
          </DndContext>
        </div>
      </div>
    </div>
  )
}
