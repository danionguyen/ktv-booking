import { useEffect, useState } from 'react'

/**
 * Đếm ngược tới `deadline`. Bù lệch đồng hồ bằng `serverTime` (giờ máy chủ lúc trả response)
 * để không phụ thuộc giờ máy khách.
 */
export function useCountdown(deadline: string | null | undefined, serverTime?: string) {
  const [skew] = useState(() => (serverTime ? Date.parse(serverTime) - Date.now() : 0))
  const target = deadline ? Date.parse(deadline) : null
  const [now, setNow] = useState(() => Date.now() + skew)

  useEffect(() => {
    if (!target) return
    const timer = setInterval(() => setNow(Date.now() + skew), 1000)
    return () => clearInterval(timer)
  }, [target, skew])

  const msLeft = target ? Math.max(0, target - now) : 0
  const minutes = Math.floor(msLeft / 60000)
  const seconds = Math.floor((msLeft % 60000) / 1000)
  return {
    msLeft,
    expired: !!target && msLeft === 0,
    label: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
  }
}
