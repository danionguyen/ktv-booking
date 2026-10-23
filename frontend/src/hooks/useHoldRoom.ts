import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useHold } from '@hooks/queries/useBookings'
import { useAuthStore } from '@stores/authStore'
import type { HoldRequest } from '@/types/domain'

const PENDING_KEY = 'ktv-pending-hold'

/**
 * Giữ chỗ (FD-BKG-01). Chưa đăng nhập → lưu yêu cầu, chuyển tới trang đăng nhập,
 * đăng nhập xong tự giữ chỗ (screen flow C08 → C02 → C09).
 */
export function useHoldRoom() {
  const navigate = useNavigate()
  const location = useLocation()
  const hold = useHold()

  const holdRoom = (req: HoldRequest) => {
    const user = useAuthStore.getState().user
    if (!user) {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify(req))
      toast.info('Đăng nhập để giữ phòng — phòng sẽ được giữ ngay sau khi đăng nhập')
      navigate('/login', { state: { from: location } })
      return
    }
    if (user.role !== 'CUSTOMER') {
      toast.error('Chỉ tài khoản khách hàng mới đặt phòng online được')
      return
    }
    hold.mutate(req, { onSuccess: (b) => navigate(`/checkout/${b.id}`) })
  }

  return { holdRoom, isPending: hold.isPending, variables: hold.variables }
}

/** Lấy (và xóa) yêu cầu giữ chỗ đang chờ đăng nhập. */
export function takePendingHold(): HoldRequest | null {
  const raw = sessionStorage.getItem(PENDING_KEY)
  sessionStorage.removeItem(PENDING_KEY)
  try {
    return raw ? (JSON.parse(raw) as HoldRequest) : null
  } catch {
    return null
  }
}
