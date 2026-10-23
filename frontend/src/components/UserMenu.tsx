import {
  CalendarCheckIcon,
  ChevronDownIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MonitorIcon,
  UserIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@components/ui/avatar'
import { Button } from '@components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu'
import { useAuth, useLogout } from '@hooks/useAuth'
import { ROLE_LABEL } from '@utils/booking'
import { initials } from '@utils/format'

/** `compact`: bỏ mũi tên (topbar quầy / admin). */
export function UserMenu({ compact = false }: { compact?: boolean }) {
  const { user, status } = useAuth()
  const logout = useLogout()

  if (status === 'loading') return <div className="bg-muted size-8 animate-pulse rounded-full" />
  if (!user) {
    return (
      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link to="/login">Đăng nhập</Link>
        </Button>
        <Button asChild className="hidden sm:inline-flex">
          <Link to="/register">Đăng ký</Link>
        </Button>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="hover:bg-muted flex items-center gap-2.5 rounded-lg py-1 pr-1 pl-1 text-sm font-semibold transition-colors outline-none">
          <Avatar className="size-8">
            <AvatarFallback className="bg-secondary text-link text-xs font-normal">
              {initials(user.fullName)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-36 truncate sm:inline">{user.fullName}</span>
          {!compact && <ChevronDownIcon className="text-muted-foreground size-4" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="truncate">{user.email}</div>
          <div className="text-muted-foreground text-xs font-normal">{ROLE_LABEL[user.role]}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user.role === 'CUSTOMER' && (
          <DropdownMenuItem asChild>
            <Link to="/my-bookings">
              <CalendarCheckIcon /> Đặt phòng của tôi
            </Link>
          </DropdownMenuItem>
        )}
        {(user.role === 'STAFF' || user.role === 'ADMIN') && (
          <DropdownMenuItem asChild>
            <Link to="/staff">
              <MonitorIcon /> Quầy lễ tân
            </Link>
          </DropdownMenuItem>
        )}
        {user.role === 'ADMIN' && (
          <DropdownMenuItem asChild>
            <Link to="/admin">
              <LayoutDashboardIcon /> Quản trị
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link to="/profile">
            <UserIcon /> Hồ sơ
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => logout.mutate()} disabled={logout.isPending}>
          <LogOutIcon /> Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
