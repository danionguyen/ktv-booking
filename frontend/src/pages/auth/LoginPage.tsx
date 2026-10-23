import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Link, Navigate } from 'react-router-dom'
import { z } from 'zod'
import { errorMessage } from '@api/queryClient'
import { AuthLayout } from '@components/AuthLayout'
import { FormField } from '@components/FormField'
import { Button } from '@components/ui/button'
import { Checkbox } from '@components/ui/checkbox'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { HOME_BY_ROLE, useAuth, useLogin } from '@hooks/useAuth'
import { MOCK_ENABLED } from '@lib/env'
import { zEmail } from '@lib/validation'

const schema = z.object({
  email: zEmail,
  password: z.string().min(1, 'Nhập mật khẩu'),
  rememberMe: z.boolean(),
})
type Values = z.infer<typeof schema>

const DEMO_ACCOUNTS = [
  { label: 'Khách hàng', email: 'customer@ktv.vn', password: '123456' },
  { label: 'Nhân viên', email: 'staff@ktv.vn', password: 'staff123' },
  { label: 'Admin', email: 'admin@ktv.vn', password: 'admin123' },
]

/** SCR-C02 */
export function LoginPage() {
  const { user, status } = useAuth()
  const login = useLogin()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', rememberMe: true },
  })
  const { errors } = form.formState

  if (user && status === 'authenticated' && !login.isPending && !login.isSuccess) {
    return <Navigate to={HOME_BY_ROLE[user.role]} replace />
  }

  return (
    <AuthLayout
      title="Chào mừng trở lại"
      description="Đăng nhập để đặt phòng và quản lý đơn của bạn."
      footer={
        <>
          Chưa có tài khoản?{' '}
          <Link to="/register" className="text-link font-semibold hover:underline">
            Đăng ký
          </Link>
        </>
      }
    >
      <form
        onSubmit={form.handleSubmit((v) => login.mutate(v))}
        className="flex flex-col gap-5"
        noValidate
      >
        <FormField label="Email" htmlFor="email" error={errors.email}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="an.nguyen@gmail.com"
            {...form.register('email')}
          />
        </FormField>
        <FormField label="Mật khẩu" htmlFor="password" error={errors.password}>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...form.register('password')}
          />
        </FormField>
        <div className="flex items-center justify-between gap-2">
          <Controller
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <Label htmlFor="remember">
                <Checkbox
                  id="remember"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
                Ghi nhớ đăng nhập
              </Label>
            )}
          />
          <Link to="/forgot-password" className="text-link text-sm font-semibold hover:underline">
            Quên mật khẩu?
          </Link>
        </div>
        {login.error && <p className="text-destructive text-sm">{errorMessage(login.error)}</p>}
        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </Button>
      </form>

      {MOCK_ENABLED && (
        <div className="rounded-lg border border-dashed p-3">
          <p className="text-muted-foreground mb-2 text-xs">Tài khoản demo (dữ liệu giả lập):</p>
          <div className="grid grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <Button
                key={a.email}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  form.reset({ email: a.email, password: a.password, rememberMe: true })
                  login.mutate({ email: a.email, password: a.password, rememberMe: true })
                }}
              >
                {a.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </AuthLayout>
  )
}
