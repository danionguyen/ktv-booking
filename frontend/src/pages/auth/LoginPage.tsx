import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Button } from '@components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { HOME_BY_ROLE, useAuth, useLogin } from '@hooks/useAuth'

// Bản tối thiểu để thử luồng auth — form đầy đủ (validate, đăng ký, quên mật khẩu) thuộc KTV-10
export function LoginPage() {
  const { user } = useAuth()
  const login = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  if (user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    login.mutate({ email, password })
  }

  return (
    <div className="bg-muted flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Đăng nhập</CardTitle>
          <CardDescription>Đặt phòng karaoke chỉ trong vài bước</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {login.error && <p className="text-destructive text-sm">{login.error.message}</p>}
            <Button type="submit" disabled={login.isPending}>
              {login.isPending ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </Button>
            <Link to="/" className="text-muted-foreground text-center text-sm hover:underline">
              Về trang chủ
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
