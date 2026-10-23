import { PencilIcon, Trash2Icon } from 'lucide-react'
import type { ReactNode } from 'react'

/** Class dùng chung cho nút icon trong cột "Thao tác" (icon vàng, xóa màu đỏ). */
export const ROW_ICON =
  'text-link hover:bg-secondary flex size-8 items-center justify-center rounded-lg [&_svg]:size-4'

/** Cột "Thao tác" như Figma A02: sửa · (tùy chọn) · xóa. */
export function RowActions({
  onEdit,
  onDelete,
  children,
}: {
  onEdit?: () => void
  onDelete?: () => void
  children?: ReactNode
}) {
  return (
    <div className="flex items-center gap-1">
      {onEdit && (
        <button type="button" className={ROW_ICON} aria-label="Sửa" onClick={onEdit}>
          <PencilIcon />
        </button>
      )}
      {children}
      {onDelete && (
        <button
          type="button"
          aria-label="Xóa"
          onClick={onDelete}
          className={`${ROW_ICON} text-destructive hover:bg-room-booked-bg`}
        >
          <Trash2Icon />
        </button>
      )}
    </div>
  )
}
