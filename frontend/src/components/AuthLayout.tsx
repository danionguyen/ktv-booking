import type { ReactNode } from 'react'
import { Logo } from '@components/Logo'
import { ThemeToggle } from '@components/ThemeToggle'

interface AuthLayoutProps {
  title: string
  description?: string
  children: ReactNode
  /** Dòng dưới nút submit, vd. "Chưa có tài khoản? Đăng ký". */
  footer?: ReactNode
}

/** SCR-C01..C04: panel thương hiệu 600px bên trái, form 400px giữa vùng còn lại. */
export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <div className="bg-card grid min-h-screen lg:grid-cols-[minmax(0,600px)_1fr]">
      <aside className="bg-hero hidden flex-col justify-between p-16 lg:flex">
        <Logo variant="brand" />
        <div className="flex max-w-[470px] flex-col gap-4">
          <p className="text-on-hero text-[40px] leading-[1.2] font-bold">
            Hát hết mình,
            <br />
            đặt phòng trong 1 phút.
          </p>
          <p className="text-on-hero-muted max-w-[440px] text-sm leading-relaxed">
            Xem sơ đồ phòng trống theo thời gian thực, giữ chỗ 10 phút và thanh toán VNPay hoặc tại
            quầy.
          </p>
        </div>
        <p className="text-on-hero-muted text-xs">© {new Date().getFullYear()} KTV Booking</p>
      </aside>
      <main className="relative flex items-center justify-center px-4 py-12">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="flex w-full max-w-[400px] flex-col gap-5">
          <Logo className="mb-4 justify-center lg:hidden" />
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[28px] leading-9 font-bold">{title}</h1>
            {description && <p className="text-muted-foreground text-sm">{description}</p>}
          </div>
          {children}
          {footer && <div className="text-muted-foreground text-center text-sm">{footer}</div>}
        </div>
      </main>
    </div>
  )
}
