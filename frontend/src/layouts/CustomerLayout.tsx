import { MenuIcon } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Logo } from '@components/Logo'
import { ThemeToggle } from '@components/ThemeToggle'
import { UserMenu } from '@components/UserMenu'
import { Button } from '@components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@components/ui/sheet'
import { useAuth } from '@hooks/useAuth'
import { cn } from '@lib/utils'

const NAV_ITEMS = [
  { to: '/#chi-nhanh', label: 'Chi nhánh' },
  { to: '/search', label: 'Tìm phòng' },
  { to: '/my-bookings', label: 'Đặt phòng của tôi' },
]

/** Header như Figma (Library › Header): logo trái · menu giữa · tài khoản phải; nội dung rộng 1200px. */
export function CustomerLayout() {
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  // Nhân viên / admin không có "đơn của tôi" (route chỉ dành cho khách)
  const navItems = NAV_ITEMS.filter(
    (i) => i.to !== '/my-bookings' || !user || user.role === 'CUSTOMER',
  )
  const link = ({ isActive }: { isActive: boolean }) =>
    cn(
      'rounded-md px-3 py-1.5 text-sm transition-colors',
      isActive ? 'text-link font-semibold' : 'text-muted-foreground hover:text-foreground',
    )

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-card sticky top-0 z-40 border-b">
        <div className="mx-auto grid h-16 max-w-[1248px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Mở menu"
              onClick={() => setOpen(true)}
            >
              <MenuIcon />
            </Button>
            <Logo />
          </div>
          <nav className="hidden gap-8 md:flex">
            {navItems.map((item) => (
              // "Chi nhánh" là anchor trên trang chủ — không đánh dấu active
              <NavLink
                key={item.to}
                to={item.to}
                className={item.to.includes('#') ? link({ isActive: false }) : link}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center justify-end gap-3">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64">
          <SheetHeader>
            <SheetTitle>
              <Logo />
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-4 px-4">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={link} onClick={() => setOpen(false)}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
      <main className="mx-auto w-full max-w-[1248px] flex-1 px-6 pt-8 pb-16">
        <Outlet />
      </main>
    </div>
  )
}
