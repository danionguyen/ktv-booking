import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useDashboard } from '@/layouts/dashboardContext'
import { cn } from '@lib/utils'

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  /** Chỉ dùng trên topbar quầy / admin; mặc định "Quản trị / <mục đang chọn>". */
  breadcrumb?: ReactNode
  className?: string
}

/**
 * Trang khách: tiêu đề 28px trong nội dung.
 * Trong DashboardLayout: portal lên topbar (breadcrumb 12px + tiêu đề 20px + nút bên phải).
 */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  className,
}: PageHeaderProps) {
  const dashboard = useDashboard()

  if (dashboard) {
    if (!dashboard.topbarSlot) return null
    return createPortal(
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-muted-foreground truncate text-xs whitespace-pre">
            {breadcrumb ?? dashboard.breadcrumb}
          </p>
          <h1 className="truncate text-xl font-semibold">{title}</h1>
          {description && <p className="text-muted-foreground text-xs">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>,
      dashboard.topbarSlot,
    )
  }

  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-[28px] leading-9 font-bold">{title}</h1>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  )
}
