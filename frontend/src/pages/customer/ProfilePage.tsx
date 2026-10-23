import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { ApiRequestError } from '@api/client'
import { qk } from '@api/keys'
import { usersApi } from '@api/users'
import { FormField } from '@components/FormField'
import { InfoRow } from '@components/InfoRow'
import { LineTabs } from '@components/LineTabs'
import { Tag } from '@components/Tag'
import { PageHeader } from '@components/PageHeader'
import { ErrorState, LoadingState } from '@components/states'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { zName, zPassword, zPhone } from '@lib/validation'
import { useAuthStore } from '@stores/authStore'
import { ROLE_COLOR, ROLE_LABEL } from '@utils/booking'
import { dayjs, initials } from '@utils/format'

const profileSchema = z.object({ fullName: zName, phone: zPhone })
const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Nhập mật khẩu hiện tại'),
    newPassword: zPassword,
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirm'],
  })

/** SCR-C13 (cũng dùng cho mục Hồ sơ của quầy). */
export function ProfilePage() {
  const [tab, setTab] = useState<'info' | 'password'>('info')
  const qc = useQueryClient()
  const me = useQuery({ queryKey: qk.me, queryFn: usersApi.me })
  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
  })
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
  })

  useEffect(() => {
    if (me.data) profileForm.reset({ fullName: me.data.fullName, phone: me.data.phone })
  }, [me.data, profileForm])

  const update = useMutation({
    mutationFn: usersApi.updateMe,
    onSuccess: (p) => {
      qc.setQueryData(qk.me, p)
      const { accessToken, user } = useAuthStore.getState()
      if (accessToken && user)
        useAuthStore.getState().setSession(accessToken, { ...user, fullName: p.fullName })
      toast.success('Đã cập nhật hồ sơ')
    },
  })
  const changePassword = useMutation({
    mutationFn: usersApi.changePassword,
    meta: { silent: true },
    onSuccess: () => {
      passwordForm.reset()
      toast.success('Đã đổi mật khẩu')
    },
    onError: (e) => {
      if (e instanceof ApiRequestError && e.details?.field === 'currentPassword') {
        passwordForm.setError('currentPassword', { message: e.message })
      } else toast.error(e.message)
    },
  })

  if (me.isPending) return <LoadingState />
  if (me.isError) return <ErrorState error={me.error} onRetry={() => void me.refetch()} />
  const pe = profileForm.formState.errors
  const pw = passwordForm.formState.errors

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Hồ sơ cá nhân" className="mb-0" />
      <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="bg-card flex flex-col items-center gap-1 rounded-xl border p-6 text-center">
          <span className="bg-secondary text-link mb-3 flex size-[88px] items-center justify-center rounded-full text-[28px] font-bold">
            {initials(me.data.fullName)}
          </span>
          <p className="text-xl font-semibold">{me.data.fullName}</p>
          <p className="text-muted-foreground text-sm">{me.data.email}</p>
          <Tag color={ROLE_COLOR[me.data.role]} className="mt-2">
            {ROLE_LABEL[me.data.role]}
          </Tag>
          <dl className="mt-4 flex w-full flex-col gap-4 border-t pt-4">
            <InfoRow label="Thành viên từ">{dayjs(me.data.createdAt).format('MM/YYYY')}</InfoRow>
            <InfoRow label="Số điện thoại">{me.data.phone}</InfoRow>
          </dl>
        </section>

        <section className="bg-card flex flex-col gap-6 rounded-xl border p-6">
          <LineTabs
            value={tab}
            onChange={setTab}
            options={[
              { value: 'info', label: 'Thông tin' },
              { value: 'password', label: 'Đổi mật khẩu' },
            ]}
          />
          {tab === 'info' ? (
            <form
              onSubmit={profileForm.handleSubmit((v) => update.mutate(v))}
              className="flex flex-col gap-5"
              noValidate
            >
              <FormField label="Họ và tên" htmlFor="fullName" error={pe.fullName}>
                <Input id="fullName" {...profileForm.register('fullName')} />
              </FormField>
              <FormField label="Email (không thể thay đổi)" htmlFor="email">
                <Input id="email" value={me.data.email} disabled readOnly />
              </FormField>
              <FormField label="Số điện thoại" htmlFor="phone" error={pe.phone}>
                <Input id="phone" type="tel" {...profileForm.register('phone')} />
              </FormField>
              <div>
                <Button type="submit" disabled={update.isPending || !profileForm.formState.isDirty}>
                  {update.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
                </Button>
              </div>
            </form>
          ) : (
            <form
              onSubmit={passwordForm.handleSubmit(({ currentPassword, newPassword }) =>
                changePassword.mutate({ currentPassword, newPassword }),
              )}
              className="flex flex-col gap-5"
              noValidate
            >
              <FormField
                label="Mật khẩu hiện tại"
                htmlFor="currentPassword"
                error={pw.currentPassword}
              >
                <Input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  {...passwordForm.register('currentPassword')}
                />
              </FormField>
              <FormField label="Mật khẩu mới" htmlFor="newPassword" error={pw.newPassword}>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  {...passwordForm.register('newPassword')}
                />
              </FormField>
              <FormField label="Nhập lại mật khẩu mới" htmlFor="confirm" error={pw.confirm}>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  {...passwordForm.register('confirm')}
                />
              </FormField>
              <p className="text-muted-foreground text-xs">
                Đổi mật khẩu sẽ đăng xuất các phiên đăng nhập khác.
              </p>
              <div>
                <Button type="submit" disabled={changePassword.isPending}>
                  {changePassword.isPending ? 'Đang lưu…' : 'Đổi mật khẩu'}
                </Button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
