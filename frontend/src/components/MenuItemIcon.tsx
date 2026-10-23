import { BeerIcon, GiftIcon, UtensilsIcon } from 'lucide-react'
import type { MenuCategory } from '@/types/domain'
import { cn } from '@lib/utils'

const ICON = { FOOD: UtensilsIcon, DRINK: BeerIcon, COMBO: GiftIcon }
const TONE: Record<MenuCategory, string> = {
  FOOD: 'bg-room-held-bg text-room-held',
  DRINK: 'bg-info-bg text-info',
  COMBO: 'bg-secondary text-link',
}

/** Thay ảnh món khi chưa có ảnh thật. */
export function MenuItemIcon({
  category,
  image,
  className,
}: {
  category: MenuCategory
  image?: string | null
  className?: string
}) {
  if (image)
    return <img src={image} alt="" className={cn('size-10 rounded-lg object-cover', className)} />
  const Icon = ICON[category]
  return (
    <span
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-lg',
        TONE[category],
        className,
      )}
    >
      <Icon className="size-5" />
    </span>
  )
}
