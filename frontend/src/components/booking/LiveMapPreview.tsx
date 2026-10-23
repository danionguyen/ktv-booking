import { Link } from 'react-router-dom'
import type { Branch } from '@/types/domain'
import { Tag } from '@components/Tag'
import { Skeleton } from '@components/ui/skeleton'
import { useRoomStatus } from '@features/room-map/useRoomStatus'
import { useRoomMap } from '@hooks/queries/useCatalog'
import { cn } from '@lib/utils'
import { LIVE_STATUS_CLASS, LIVE_STATUS_LABEL, LIVE_STATUS_TEXT } from '@utils/booking'
import { defaultSearch, toSearchParams } from '@utils/search'

/** Khối "Sơ đồ phòng · Trực tiếp" trong hero trang chủ — trạng thái thật của 4 phòng đầu. */
export function LiveMapPreview({ branch }: { branch: Branch }) {
  const map = useRoomMap(branch.id)
  const { flashing } = useRoomStatus(branch.id)
  const rooms = map.data?.rooms.slice(0, 4)
  return (
    <Link
      to={`/search?${toSearchParams(defaultSearch(branch))}`}
      className="bg-card flex flex-col gap-3 rounded-2xl p-5 transition-transform hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between gap-6">
        <span className="text-sm font-semibold">Sơ đồ phòng · {branch.name}</span>
        <Tag color="green">● Trực tiếp</Tag>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {rooms
          ? rooms.map((r) => (
              <div
                key={r.id}
                className={cn(
                  'flex h-[95px] flex-col gap-0.5 rounded-[10px] border-[1.5px] p-3 text-xs transition-all',
                  LIVE_STATUS_CLASS[r.status],
                  flashing.has(r.id) && 'ring-brand-accent ring-2',
                )}
              >
                <span className={cn('text-base font-semibold', LIVE_STATUS_TEXT[r.status])}>
                  {r.code}
                </span>
                <span className="text-muted-foreground">{r.type}</span>
                <span>{LIVE_STATUS_LABEL[r.status]}</span>
              </div>
            ))
          : Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[95px]" />)}
      </div>
    </Link>
  )
}
