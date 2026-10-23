import { createContext, useContext } from 'react'

interface DashboardContextValue {
  /** Ô trên topbar mà PageHeader portal vào (null khi chưa mount). */
  topbarSlot: HTMLElement | null
  /** Breadcrumb mặc định, vd. "Quản trị / Chi nhánh". */
  breadcrumb: string
}

export const DashboardContext = createContext<DashboardContextValue | null>(null)

/** null khi không nằm trong DashboardLayout (trang khách hàng). */
export const useDashboard = () => useContext(DashboardContext)
