import { useEffect, useState } from 'react'

/** Phân trang phía client cho danh sách admin nhỏ (chi nhánh, menu, voucher…). */
export function useClientPage<T>(items: T[] | undefined, size = 20) {
  const [page, setPage] = useState(0)
  const total = items?.length ?? 0
  useEffect(() => {
    if (page * size >= total && page > 0) setPage(0)
  }, [total, page, size])
  return {
    page,
    size,
    total,
    setPage,
    rows: items?.slice(page * size, (page + 1) * size) ?? [],
  }
}
