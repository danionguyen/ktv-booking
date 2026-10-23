import { ClockIcon, ImageIcon, MapPinIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Branch } from '@/types/domain'
import { Tag } from '@components/Tag'
import { Button } from '@components/ui/button'
import { isOpenAt } from '@utils/time'

/** Thẻ chi nhánh trên trang chủ (Figma Library › Branch Card). */
export function BranchCard({ branch }: { branch: Branch }) {
  const open = isOpenAt(branch)
  return (
    <article className="bg-card flex flex-col overflow-hidden rounded-xl border">
      <div className="bg-secondary text-primary flex h-[180px] items-center justify-center">
        <ImageIcon className="size-7" aria-hidden />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold">{branch.name}</h3>
          {open ? <Tag color="green">Đang mở</Tag> : <Tag color="gray">Đã đóng cửa</Tag>}
        </div>
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <MapPinIcon className="size-3.5 shrink-0" /> {branch.address}
        </p>
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <ClockIcon className="size-3.5 shrink-0" /> {branch.openTime} – {branch.closeTime}
        </p>
        <p className="text-muted-foreground text-xs">
          {branch.roomTypeCount} loại phòng · {branch.roomCount} phòng
        </p>
        <Button asChild variant="outline" className="mt-auto w-full">
          <Link to={`/branches/${branch.id}`}>Xem chi nhánh</Link>
        </Button>
      </div>
    </article>
  )
}
