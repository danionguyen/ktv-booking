import { ImageIcon } from 'lucide-react'
import { useState } from 'react'
import type { MenuCategory, MenuItem } from '@/types/domain'
import { LineTabs } from './LineTabs'
import { MENU_CATEGORY_LABEL } from '@utils/booking'
import { formatVND } from '@utils/format'
import { MenuItemIcon } from './MenuItemIcon'
import { QuantityStepper } from './QuantityStepper'

interface MenuPickerProps {
  items: MenuItem[]
  quantities: Record<number, number>
  onChange: (menuItemId: number, quantity: number) => void
  disabled?: boolean
  /** `cards`: lưới Menu Item Card (checkout SCR-C09); `list`: danh sách gọn trong dialog. */
  variant?: 'cards' | 'list'
}

const TABS: (MenuCategory | 'ALL')[] = [
  'ALL',
  ...(Object.keys(MENU_CATEGORY_LABEL) as MenuCategory[]),
]

/** Danh sách món theo nhóm + bộ tăng giảm số lượng — dùng cho đặt trước, khách vãng lai, gọi thêm. */
export function MenuPicker({
  items,
  quantities,
  onChange,
  disabled,
  variant = 'list',
}: MenuPickerProps) {
  const [category, setCategory] = useState<MenuCategory | 'ALL'>('ALL')
  const shown = items.filter((m) => category === 'ALL' || m.category === category)
  return (
    <div className="flex flex-col gap-4">
      <LineTabs
        className="w-fit"
        value={category}
        onChange={setCategory}
        options={TABS.map((c) => ({
          value: c,
          label: c === 'ALL' ? 'Tất cả' : MENU_CATEGORY_LABEL[c],
        }))}
      />
      {variant === 'cards' ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {shown.map((m) => (
            <li key={m.id} className="bg-card flex flex-col overflow-hidden rounded-xl border">
              <div className="bg-secondary text-primary flex h-24 items-center justify-center">
                {m.image ? (
                  <img src={m.image} alt="" className="size-full object-cover" />
                ) : (
                  <ImageIcon className="size-7" aria-hidden />
                )}
              </div>
              <div className="flex flex-col gap-0.5 p-3">
                <p className="truncate text-sm font-semibold">{m.name}</p>
                <p className="text-muted-foreground text-xs">{formatVND(m.price)}</p>
              </div>
              <div className="px-3 pb-3">
                <QuantityStepper
                  label={m.name}
                  value={quantities[m.id] ?? 0}
                  onChange={(q) => onChange(m.id, q)}
                  disabled={disabled}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y rounded-xl border">
          {shown.map((m) => (
            <li key={m.id} className="flex items-center gap-3 p-3">
              <MenuItemIcon category={m.category} image={m.image} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{m.name}</p>
                <p className="text-muted-foreground text-xs">{formatVND(m.price)}</p>
              </div>
              <QuantityStepper
                label={m.name}
                value={quantities[m.id] ?? 0}
                onChange={(q) => onChange(m.id, q)}
                disabled={disabled}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
