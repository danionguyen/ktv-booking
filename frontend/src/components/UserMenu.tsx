import { LogOutIcon, UserIcon } from 'lucide-react'
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

function initials(fullName: string) {
  const parts = fullName.trim().split(/\s+/)
  return (parts.at(-1)?.[0] ?? '?').toUpperCase()
}

export function UserMenu() {
  const { user } = useAuth()
  const logout = useLogout()

  if (!user) {
    return (
      <Button asChild size="sm">
        <Link to="/login">Đăng nhập</Link>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Avatar className="size-7">
            <AvatarFallback>{initials(user.fullName)}</AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline">{user.fullName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile">
            <UserIcon /> Hồ sơ
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => logout.mutate()} disabled={logout.isPending}>
          <LogOutIcon /> Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
