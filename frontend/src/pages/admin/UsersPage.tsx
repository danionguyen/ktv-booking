import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRoundIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { adminApi, type UserInput } from '@api/admin'
import { FormDialog } from '@components/admin/FormDialog'
import { FilterField } from '@components/admin/FilterField'
import { ROW_ICON, RowActions } from '@components/admin/RowActions'
import { FormField } from '@components/FormField'
import { TableCard } from '@components/admin/TableCard'
import { PageHeader } from '@components/PageHeader'
import { Pagination } from '@components/Pagination'
import { Tag } from '@components/Tag'
import { ErrorState, LoadingState } from '@components/states'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@components/ui/table'
import { useAdminBranches, useAdminMutation, useAdminUsers } from '@hooks/queries/useAdmin'
import { useAuth } from '@hooks/useAuth'
import { useCrudState } from '@hooks/useCrudState'
import { zEmail, zName, zPassword, zPhone } from '@lib/validation'
import type { Role } from '@/types/auth'
import type { User } from '@/types/domain'
import { ROLE_COLOR, ROLE_LABEL } from '@utils/booking'
import { initials } from '@utils/format'

const ROLES = Object.keys(ROLE_LABEL) as Role[]

const schema = z
  .object({
    fullName: zName,
    email: zEmail,
    phone: zPhone,
    role: z.enum(['CUSTOMER', 'STAFF', 'ADMIN']),
    branchId: z.number().nullable(),
    password: zPassword.optional().or(z.literal('')),
    isNew: z.boolean(),
  })
  .refine((v) => v.role !== 'STAFF' || !!v.branchId, {
    message: 'Nhân viên phải được gán chi nhánh',
    path: ['branchId'],
  })
  .refine((v) => !v.isNew || !!v.password, { message: 'Nhập mật khẩu ban đầu', path: ['password'] })
type Values = z.infer<typeof schema>

/** SCR-A09 */
export function UsersPage() {
  const { user: me } = useAuth()
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<Role | undefined>()
  const [page, setPage] = useState(0)
  const params = { q: search || undefined, role, page, size: 20 }
  const users = useAdminUsers(params)
  const branches = useAdminBranches()
  const crud = useCrudState<User>()
  const [resetting, setResetting] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')

  const save = useAdminMutation(
    ({ isNew: _isNew, password, ...v }: Values) =>
      crud.current
        ? adminApi.users.update(crud.current.id, v)
        : adminApi.users.create({ ...v, password: password || undefined } as UserInput),
    [['admin', 'users']],
  )
  const setStatus = useAdminMutation(
    ({ id, enabled }: { id: number; enabled: boolean }) => adminApi.users.setStatus(id, enabled),
    [['admin', 'users']],
  )
  const resetPassword = useAdminMutation(
    ({ id, password }: { id: number; password: string }) =>
      adminApi.users.resetPassword(id, password),
    [],
  )
  const form = useForm<Values>({ resolver: zodResolver(schema) })
  const { errors } = form.formState
  const formRole = form.watch('role')

  const { editing, current } = crud
  useEffect(() => {
    if (!editing) return
    const u = current
    form.reset(
      u
        ? {
            fullName: u.fullName,
            email: u.email,
            phone: u.phone,
            role: u.role,
            branchId: u.branchId,
            password: '',
            isNew: false,
          }
        : {
            fullName: '',
            email: '',
            phone: '',
            role: 'STAFF',
            branchId: branches.data?.[0]?.id ?? null,
            password: '',
            isNew: true,
          },
    )
  }, [editing, current, form, branches.data])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Người dùng"
        actions={<Button onClick={crud.openNew}>+ Tạo tài khoản nhân viên</Button>}
      />
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          setSearch(q.trim())
          setPage(0)
        }}
      >
        <FilterField label="Vai trò" htmlFor="f-role">
          <Select
            value={role ?? 'all'}
            onValueChange={(v) => (setRole(v === 'all' ? undefined : (v as Role)), setPage(0))}
          >
            <SelectTrigger id="f-role" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABEL[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Tìm kiếm" htmlFor="f-q" className="w-72">
          <Input
            id="f-q"
            placeholder="Tên, email, SĐT"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onBlur={() => (setSearch(q.trim()), setPage(0))}
          />
        </FilterField>
        <Button type="submit" variant="outline" className="mb-0.5">
          Tìm
        </Button>
      </form>
      {users.isPending ? (
        <LoadingState />
      ) : users.isError ? (
        <ErrorState error={users.error} onRetry={() => void users.refetch()} />
      ) : (
        <div className="flex flex-col gap-3">
          <TableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Số điện thoại</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead className="hidden md:table-cell">Chi nhánh</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.data.items.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="bg-secondary text-link flex size-8 shrink-0 items-center justify-center rounded-full text-xs">
                          {initials(u.fullName)}
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold">{u.fullName}</div>
                          <div className="text-muted-foreground text-xs">{u.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{u.phone}</TableCell>
                    <TableCell>
                      <Tag color={ROLE_COLOR[u.role]}>{ROLE_LABEL[u.role]}</Tag>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{u.branchName ?? '—'}</TableCell>
                    <TableCell>
                      {u.enabled ? (
                        <Tag color="green">Hoạt động</Tag>
                      ) : (
                        <Tag color="red">Đã khóa</Tag>
                      )}
                    </TableCell>
                    <TableCell>
                      <RowActions onEdit={() => crud.openEdit(u)}>
                        <button
                          type="button"
                          className={ROW_ICON}
                          aria-label="Đặt lại mật khẩu"
                          onClick={() => (setResetting(u), setNewPassword(''))}
                        >
                          <KeyRoundIcon />
                        </button>
                        <Button
                          size="sm"
                          variant={u.enabled ? 'destructive' : 'outline'}
                          className="ml-1"
                          disabled={u.id === me?.id || setStatus.isPending}
                          onClick={() =>
                            setStatus.mutate(
                              { id: u.id, enabled: !u.enabled },
                              {
                                onSuccess: () =>
                                  toast.success(
                                    u.enabled ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản',
                                  ),
                              },
                            )
                          }
                        >
                          {u.enabled ? 'Khóa' : 'Mở khóa'}
                        </Button>
                      </RowActions>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableCard>
          <p className="text-muted-foreground text-xs">
            Nhân viên chỉ thao tác được trên chi nhánh được gán. Tài khoản bị khóa không đăng nhập
            được.
          </p>
          <Pagination
            page={page}
            size={users.data.size}
            total={users.data.total}
            onPageChange={setPage}
            summary={`${users.data.total.toLocaleString('vi-VN')} người dùng · ${users.data.size} / trang`}
          />
        </div>
      )}

      <FormDialog
        open={!!crud.editing}
        onOpenChange={(o) => !o && crud.close()}
        title={crud.isNew ? 'Thêm tài khoản' : `Sửa ${crud.current?.fullName}`}
        formId="user-form"
        submitting={save.isPending}
      >
        <form
          id="user-form"
          className="grid gap-4 sm:grid-cols-2"
          noValidate
          onSubmit={form.handleSubmit((v) =>
            save.mutate(v, { onSuccess: () => (toast.success('Đã lưu tài khoản'), crud.close()) }),
          )}
        >
          <FormField
            label="Họ tên"
            htmlFor="u-name"
            error={errors.fullName}
            className="sm:col-span-2"
          >
            <Input id="u-name" {...form.register('fullName')} />
          </FormField>
          <FormField label="Email" htmlFor="u-email" error={errors.email}>
            <Input id="u-email" type="email" disabled={!crud.isNew} {...form.register('email')} />
          </FormField>
          <FormField label="Số điện thoại" htmlFor="u-phone" error={errors.phone}>
            <Input id="u-phone" {...form.register('phone')} />
          </FormField>
          <FormField label="Vai trò" htmlFor="u-role">
            <Controller
              control={form.control}
              name="role"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={crud.current?.id === me?.id}
                >
                  <SelectTrigger id="u-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          {formRole === 'STAFF' ? (
            <FormField label="Chi nhánh" htmlFor="u-branch" error={errors.branchId}>
              <Controller
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : undefined}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger id="u-branch" className="w-full">
                      <SelectValue placeholder="Chọn" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.data?.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          ) : (
            <div />
          )}
          {crud.isNew && (
            <FormField
              label="Mật khẩu ban đầu"
              htmlFor="u-pass"
              error={errors.password}
              className="sm:col-span-2"
            >
              <Input
                id="u-pass"
                type="password"
                autoComplete="new-password"
                {...form.register('password')}
              />
            </FormField>
          )}
        </form>
      </FormDialog>

      <FormDialog
        open={!!resetting}
        onOpenChange={(o) => !o && setResetting(null)}
        title={`Đặt lại mật khẩu · ${resetting?.email}`}
        formId="reset-form"
        submitting={resetPassword.isPending}
        submitLabel="Đặt lại"
      >
        <form
          id="reset-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!resetting || newPassword.length < 6) return
            resetPassword.mutate(
              { id: resetting.id, password: newPassword },
              { onSuccess: () => (toast.success('Đã đặt lại mật khẩu'), setResetting(null)) },
            )
          }}
        >
          <FormField label="Mật khẩu mới" htmlFor="new-pass" description="Tối thiểu 6 ký tự">
            <Input
              id="new-pass"
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </FormField>
        </form>
      </FormDialog>
    </div>
  )
}
