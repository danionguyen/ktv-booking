import type { LucideIcon } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { UserMenu } from '@components/UserMenu'
import { cn } from '@lib/utils'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

interface DashboardLayoutProps {
  title: string
  navItems: NavItem[]
}

/** Khung chung cho StaffLayout và AdminLayout: sidebar trái + header. */
export function DashboardLayout({ title, navItems }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <aside className="bg-sidebar text-sidebar-foreground hidden w-60 shrink-0 border-r md:block">
        <Link to="/" className="text-primary flex h-16 items-center px-6 text-lg font-bold">
          KTV Booking
        </Link>
        <nav className="flex flex-col gap-1 px-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background flex h-16 items-center border-b px-6">
          <h1 className="font-semibold">{title}</h1>
          <div className="ml-auto">
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
