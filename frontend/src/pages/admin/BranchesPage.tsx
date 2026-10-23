import { zodResolver } from '@hookform/resolvers/zod'
import { LayoutTemplateIcon, SearchIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { adminApi, type BranchInput } from '@api/admin'
import { qk } from '@api/keys'
import { FormDialog } from '@components/admin/FormDialog'
import { ROW_ICON, RowActions } from '@components/admin/RowActions'
import { ConfirmDialog } from '@components/ConfirmDialog'
import { FormField } from '@components/FormField'
import { TableCard } from '@components/admin/TableCard'
import { PageHeader } from '@components/PageHeader'
import { Pagination } from '@components/Pagination'
import { Tag } from '@components/Tag'
import { ErrorState, LoadingState } from '@components/states'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@components/ui/table'
import { useAdminBranches, useAdminMutation } from '@hooks/queries/useAdmin'
import { useClientPage } from '@hooks/useClientPage'
import { useCrudState } from '@hooks/useCrudState'
import { zTime } from '@lib/validation'
import type { Branch } from '@/types/domain'

const schema = z.object({
  name: z.string().trim().min(2, 'Nhập tên chi nhánh'),
  address: z.string().trim().min(5, 'Nhập địa chỉ'),
  phone: z.string().trim().min(8, 'Nhập số điện thoại'),
  openTime: zTime,
  closeTime: zTime,
})

const INVALIDATE = [qk.admin.branches, qk.branches]

/** SCR-A02 */
export function BranchesPage() {
  const branches = useAdminBranches()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const list = useClientPage(
    branches.data?.filter((b) => !q || `${b.name} ${b.address}`.toLowerCase().includes(q)),
  )
  const crud = useCrudState<Branch>()
  const save = useAdminMutation(
    (v: BranchInput) =>
      crud.current ? adminApi.branches.update(crud.current.id, v) : adminApi.branches.create(v),
    INVALIDATE,
  )
  const remove = useAdminMutation(adminApi.branches.remove, INVALIDATE)
  const form = useForm<BranchInput>({ resolver: zodResolver(schema) })
  const { errors } = form.formState

  const { editing, current } = crud
  useEffect(() => {
    if (editing)
      form.reset(
        current ?? { name: '', address: '', phone: '', openTime: '09:00', closeTime: '02:00' },
      )
  }, [editing, current, form])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Chi nhánh"
        actions={<Button onClick={crud.openNew}>+ Thêm chi nhánh</Button>}
      />
      <div className="relative w-full max-w-[360px]">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên, địa chỉ"
          className="pl-9"
          aria-label="Tìm chi nhánh"
        />
      </div>
      {branches.isPending ? (
        <LoadingState />
      ) : branches.isError ? (
        <ErrorState error={branches.error} onRetry={() => void branches.refetch()} />
      ) : (
        <div>
          <TableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên chi nhánh</TableHead>
                  <TableHead className="hidden md:table-cell">Địa chỉ</TableHead>
                  <TableHead>Điện thoại</TableHead>
                  <TableHead>Giờ mở cửa</TableHead>
                  <TableHead className="text-right">Số phòng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.rows.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-semibold">{b.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{b.address}</TableCell>
                    <TableCell>{b.phone}</TableCell>
                    <TableCell>
                      {b.openTime} – {b.closeTime}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{b.roomCount}</TableCell>
                    <TableCell>
                      {b.roomCount > 0 ? (
                        <Tag color="green">Hoạt động</Tag>
                      ) : (
                        <Tag color="gray">Tạm ngưng</Tag>
                      )}
                    </TableCell>
                    <TableCell>
                      <RowActions
                        onEdit={() => crud.openEdit(b)}
                        onDelete={() => crud.askDelete(b)}
                      >
                        <Link
                          to={`/admin/branches/${b.id}/layout`}
                          className={ROW_ICON}
                          aria-label="Sơ đồ mặt bằng"
                        >
                          <LayoutTemplateIcon />
                        </Link>
                      </RowActions>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableCard>
          <Pagination
            page={list.page}
            size={list.size}
            total={list.total}
            onPageChange={list.setPage}
            summary={`${list.total} chi nhánh`}
          />
        </div>
      )}

      <FormDialog
        open={!!crud.editing}
        onOpenChange={(o) => !o && crud.close()}
        title={crud.isNew ? 'Thêm chi nhánh' : 'Sửa chi nhánh'}
        formId="branch-form"
        submitting={save.isPending}
      >
        <form
          id="branch-form"
          className="grid gap-4 sm:grid-cols-2"
          noValidate
          onSubmit={form.handleSubmit((v) =>
            save.mutate(v, {
              onSuccess: () => {
                toast.success('Đã lưu chi nhánh')
                crud.close()
              },
            }),
          )}
        >
          <FormField label="Tên" htmlFor="b-name" error={errors.name} className="sm:col-span-2">
            <Input id="b-name" {...form.register('name')} />
          </FormField>
          <FormField
            label="Địa chỉ"
            htmlFor="b-address"
            error={errors.address}
            className="sm:col-span-2"
          >
            <Input id="b-address" {...form.register('address')} />
          </FormField>
          <FormField
            label="Điện thoại"
            htmlFor="b-phone"
            error={errors.phone}
            className="sm:col-span-2"
          >
            <Input id="b-phone" {...form.register('phone')} />
          </FormField>
          <FormField label="Mở cửa" htmlFor="b-open" error={errors.openTime}>
            <Input id="b-open" type="time" step={1800} {...form.register('openTime')} />
          </FormField>
          <FormField label="Đóng cửa" htmlFor="b-close" error={errors.closeTime}>
            <Input id="b-close" type="time" step={1800} {...form.register('closeTime')} />
          </FormField>
        </form>
      </FormDialog>

      <ConfirmDialog
        open={!!crud.deleting}
        onOpenChange={(o) => !o && crud.cancelDelete()}
        title={`Xóa ${crud.deleting?.name}?`}
        description="Chỉ xóa được chi nhánh chưa có phòng và nhân viên."
        destructive
        confirmLabel="Xóa"
        loading={remove.isPending}
        onConfirm={() =>
          crud.deleting &&
          remove.mutate(crud.deleting.id, {
            onSuccess: () => {
              toast.success('Đã xóa chi nhánh')
              crud.cancelDelete()
            },
          })
        }
      />
    </div>
  )
}
