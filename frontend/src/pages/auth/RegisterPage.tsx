import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { ApiRequestError } from '@api/client'
import { errorMessage } from '@api/queryClient'
import { AuthLayout } from '@components/AuthLayout'
import { FormField } from '@components/FormField'
import { Button } from '@components/ui/button'
import { Checkbox } from '@components/ui/checkbox'
import { FieldError } from '@components/ui/field'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { useRegister } from '@hooks/useAuth'
import { zEmail, zName, zPassword, zPhone } from '@lib/validation'

const schema = z
  .object({
    fullName: zName,
    email: zEmail,
    phone: zPhone,
    password: zPassword,
    confirm: z.string(),
    agree: z.boolean().refine((v) => v, 'Bạn cần đồng ý với Điều khoản sử dụng'),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirm'],
  })
type Values = z.infer<typeof schema>

/** SCR-C01 */
export function RegisterPage() {
  const register = useRegister()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', phone: '', password: '', confirm: '', agree: false },
  })
  const { errors } = form.formState
  const emailTaken =
    register.error instanceof ApiRequestError && register.error.code === 'EMAIL_ALREADY_EXISTS'

  const onSubmit = ({ confirm: _confirm, agree: _agree, ...body }: Values) =>
    register.mutate(body, {
      onError: (e) => {
        if (e instanceof ApiRequestError && e.code === 'EMAIL_ALREADY_EXISTS') {
          form.setError('email', { message: e.message })
        }
      },
    })

  return (
    <AuthLayout
      title="Tạo tài khoản"
      description="Đặt phòng nhanh hơn và theo dõi lịch sử hát của bạn."
      footer={
        <>
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-link font-semibold hover:underline">
            Đăng nhập
          </Link>
        </>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        <FormField label="Họ và tên" htmlFor="fullName" error={errors.fullName}>
          <Input
            id="fullName"
            autoComplete="name"
            placeholder="Nguyễn Văn An"
            {...form.register('fullName')}
          />
        </FormField>
        <FormField label="Email" htmlFor="email" error={errors.email}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="an.nguyen@gmail.com"
            {...form.register('email')}
          />
        </FormField>
        <FormField label="Số điện thoại" htmlFor="phone" error={errors.phone}>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="0912 345 678"
            {...form.register('phone')}
          />
        </FormField>
        <FormField
          label="Mật khẩu"
          htmlFor="password"
          error={errors.password}
          description="8–64 ký tự, gồm cả chữ và số"
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...form.register('password')}
          />
        </FormField>
        <FormField label="Nhập lại mật khẩu" htmlFor="confirm" error={errors.confirm}>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            {...form.register('confirm')}
          />
        </FormField>
        <Controller
          control={form.control}
          name="agree"
          render={({ field }) => (
            <div className="flex flex-col gap-1">
              <Label htmlFor="agree" className="font-normal">
                <Checkbox
                  id="agree"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
                Tôi đồng ý với Điều khoản sử dụng
              </Label>
              {errors.agree && <FieldError>{errors.agree.message}</FieldError>}
            </div>
          )}
        />
        {register.error && !emailTaken && (
          <p className="text-destructive text-sm">{errorMessage(register.error)}</p>
        )}
        <Button type="submit" className="w-full" disabled={register.isPending}>
          {register.isPending ? 'Đang tạo tài khoản…' : 'Đăng ký'}
        </Button>
      </form>
    </AuthLayout>
  )
}
