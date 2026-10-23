import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { authApi } from '@api/auth'
import { AuthLayout } from '@components/AuthLayout'
import { FormField } from '@components/FormField'
import { Notice } from '@components/Notice'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { zEmail } from '@lib/validation'

const schema = z.object({ email: zEmail })

export function ForgotPasswordPage() {
  const forgot = useMutation({ mutationFn: authApi.forgotPassword })
  const form = useForm<{ email: string }>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  return (
    <AuthLayout
      title="Quên mật khẩu"
      description="Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu."
      footer={
        <>
          Nhớ ra rồi?{' '}
          <Link to="/login" className="text-link font-semibold hover:underline">
            Quay lại đăng nhập
          </Link>
        </>
      }
    >
      <form
        onSubmit={form.handleSubmit((v) => forgot.mutate(v.email))}
        className="flex flex-col gap-5"
        noValidate
      >
        <FormField label="Email" htmlFor="email" error={form.formState.errors.email}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="an.nguyen@gmail.com"
            {...form.register('email')}
          />
        </FormField>
        <Button type="submit" className="w-full" disabled={forgot.isPending}>
          {forgot.isPending ? 'Đang gửi…' : 'Gửi liên kết đặt lại'}
        </Button>
        {forgot.isSuccess && (
          <Notice tone="success">
            Nếu email tồn tại trong hệ thống, bạn sẽ nhận được liên kết trong vài phút.
            {forgot.data.devResetUrl && (
              <Link
                to={forgot.data.devResetUrl}
                className="text-link mt-1 block font-semibold hover:underline"
              >
                Mở link đặt lại (demo)
              </Link>
            )}
          </Notice>
        )}
      </form>
    </AuthLayout>
  )
}
