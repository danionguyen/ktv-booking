import { useState } from 'react'

/** Trạng thái dialog tạo/sửa + xác nhận xóa cho trang CRUD admin. */
export function useCrudState<T>() {
  const [editing, setEditing] = useState<T | 'new' | null>(null)
  const [deleting, setDeleting] = useState<T | null>(null)
  return {
    editing,
    deleting,
    isNew: editing === 'new',
    current: editing === 'new' ? null : editing,
    openNew: () => setEditing('new'),
    openEdit: (row: T) => setEditing(row),
    close: () => setEditing(null),
    askDelete: (row: T) => setDeleting(row),
    cancelDelete: () => setDeleting(null),
  }
}
