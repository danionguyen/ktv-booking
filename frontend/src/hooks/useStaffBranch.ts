import { useSearchParams } from 'react-router-dom'
import { useAuth } from './useAuth'

/** Nhân viên: chi nhánh được gán. Admin: chọn qua `?branchId=` (mặc định 1). */
export function useStaffBranch() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const isAdmin = user?.role === 'ADMIN'
  const branchId = isAdmin ? Number(params.get('branchId') ?? 1) : (user?.branchId ?? undefined)
  const setBranchId = (id: number) => {
    const next = new URLSearchParams(params)
    next.set('branchId', String(id))
    setParams(next, { replace: true })
  }
  return { branchId, isAdmin, setBranchId }
}
