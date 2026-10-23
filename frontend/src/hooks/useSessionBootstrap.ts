import { useEffect } from 'react'
import { refreshSession } from '@api/client'

/** Khôi phục phiên khi tải lại trang: thử refresh bằng cookie, thất bại → khách. */
export function useSessionBootstrap() {
  useEffect(() => {
    refreshSession().catch(() => {})
  }, [])
}
