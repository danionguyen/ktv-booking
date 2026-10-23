import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { cn } from '@lib/utils'

interface PaginationProps {
  page: number
  size: number
  total: number
  onPageChange: (page: number) => void
  /** Chữ bên trái, vd. "4 chi nhánh" (bảng admin). */
  summary?: string
}

/** Trang hiện tại / lân cận (tối đa 5 số), như Figma SCR-C11 và bảng admin. */
function pageWindow(page: number, pages: number) {
  const start = Math.max(0, Math.min(page - 2, pages - 5))
  return Array.from({ length: Math.min(5, pages) }, (_, i) => start + i)
}

export function Pagination({ page, size, total, onPageChange, summary }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / size))
  if (total === 0) return null
  const btn =
    'text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-lg text-sm disabled:opacity-40'
  return (
    <div className="flex items-center justify-between gap-3 pt-4">
      <span className="text-muted-foreground text-xs">{summary}</span>
      {pages > 1 && (
        <nav className="flex items-center gap-2" aria-label="Phân trang">
          <button
            type="button"
            className={btn}
            aria-label="Trang trước"
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeftIcon className="size-4" />
          </button>
          {pageWindow(page, pages).map((p) => (
            <button
              key={p}
              type="button"
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onPageChange(p)}
              className={cn(
                btn,
                p === page && 'border-primary text-foreground border font-semibold',
              )}
            >
              {p + 1}
            </button>
          ))}
          <button
            type="button"
            className={btn}
            aria-label="Trang sau"
            disabled={page + 1 >= pages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </nav>
      )}
    </div>
  )
}
