import { StatusPage } from './StatusPage'

export function ForbiddenPage() {
  return <StatusPage code="403" message="Bạn không có quyền truy cập trang này." />
}
