import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { authApi } from '@api/auth'
import { AuthLayout } from '@components/AuthLayout'
import { FormField } from '@components/FormField'
import { Notice } from '@components/Notice'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { zPassword } from '@lib/validation'

const schema = z
  .object({ newPassword: zPassword, confirm: z.string() })
  .refine((v) => v.newPassword === v.confirm, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirm'],
  })
type Values = z.infer<typeof schema>

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const reset = useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: () => {
      toast.success('Đã đặt lại mật khẩu, vui lòng đăng nhập')
      navigate('/login', { replace: true })
    },
  })
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '', confirm: '' },
  })
  const { errors } = form.formState

  return (
    <AuthLayout title="Đặt lại mật khẩu" description="Tạo mật khẩu mới cho tài khoản của bạn.">
      {!token ? (
        <Notice tone="error">
          Liên kết không hợp lệ. Hãy yêu cầu gửi lại từ trang{' '}
          <Link to="/forgot-password" className="text-link font-semibold hover:underline">
            Quên mật khẩu
          </Link>
          .
        </Notice>
      ) : (
        <form
          onSubmit={form.handleSubmit((v) => reset.mutate({ token, newPassword: v.newPassword }))}
          className="flex flex-col gap-5"
          noValidate
        >
          <FormField
            label="Mật khẩu mới"
            htmlFor="newPassword"
            error={errors.newPassword}
            description="8–64 ký tự, gồm cả chữ và số"
          >
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              {...form.register('newPassword')}
            />
          </FormField>
          <FormField label="Nhập lại mật khẩu mới" htmlFor="confirm" error={errors.confirm}>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              {...form.register('confirm')}
            />
          </FormField>
          <Button type="submit" className="w-full" disabled={reset.isPending}>
            {reset.isPending ? 'Đang lưu…' : 'Cập nhật mật khẩu'}
          </Button>
          <Notice tone="info">
            Liên kết đã hết hạn? Hãy yêu cầu gửi lại từ trang{' '}
            <Link to="/forgot-password" className="text-link font-semibold hover:underline">
              Quên mật khẩu
            </Link>
            .
          </Notice>
        </form>
      )}
    </AuthLayout>
  )
}
