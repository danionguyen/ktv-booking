import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { adminApi, type RoomInput } from '@api/admin'
import { qk } from '@api/keys'
import { FormDialog } from '@components/admin/FormDialog'
import { RowActions } from '@components/admin/RowActions'
import { ConfirmDialog } from '@components/ConfirmDialog'
import { FormField } from '@components/FormField'
import { FilterField } from '@components/admin/FilterField'
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
import {
  useAdminBranches,
  useAdminMutation,
  useAdminRooms,
  useAdminRoomTypes,
} from '@hooks/queries/useAdmin'
import { useClientPage } from '@hooks/useClientPage'
import { useCrudState } from '@hooks/useCrudState'
import type { Room } from '@/types/domain'

const schema = z.object({
  branchId: z.number({ required_error: 'Chọn chi nhánh' }),
  roomTypeId: z.number({ required_error: 'Chọn loại phòng' }),
  code: z
    .string()
    .trim()
    .min(2, 'Nhập mã phòng')
    .max(10, 'Tối đa 10 ký tự')
    .regex(/^[A-Za-z0-9-]+$/, 'Chỉ chữ, số và dấu gạch'),
  status: z.enum(['ACTIVE', 'MAINTENANCE']),
  images: z.array(z.string()),
})

const INVALIDATE = [qk.admin.all, ['room-map'], qk.branches]

/** SCR-A05 */
export function RoomsPage() {
  const navigate = useNavigate()
  const [branchFilter, setBranchFilter] = useState<number | undefined>()
  const [typeFilter, setTypeFilter] = useState<number | undefined>()
  const [statusFilter, setStatusFilter] = useState<Room['status'] | undefined>()
  const [query, setQuery] = useState('')
  const branches = useAdminBranches()
  const types = useAdminRoomTypes()
  const rooms = useAdminRooms(branchFilter)
  const crud = useCrudState<Room>()
  const q = query.trim().toLowerCase()
  const list = useClientPage(
    rooms.data?.filter(
      (r) =>
        (!typeFilter || r.roomTypeId === typeFilter) &&
        (!statusFilter || r.status === statusFilter) &&
        (!q || r.code.toLowerCase().includes(q)),
    ),
  )
  const save = useAdminMutation(
    (v: RoomInput) =>
      crud.current ? adminApi.rooms.update(crud.current.id, v) : adminApi.rooms.create(v),
    INVALIDATE,
  )
  const setStatus = useAdminMutation(
    ({ id, status }: { id: number; status: Room['status'] }) =>
      adminApi.rooms.setStatus(id, status),
    INVALIDATE,
  )
  const remove = useAdminMutation(adminApi.rooms.remove, INVALIDATE)
  const form = useForm<RoomInput>({ resolver: zodResolver(schema) })
  const { errors } = form.formState

  const { editing, current } = crud
  useEffect(() => {
    if (editing)
      form.reset(
        current ?? {
          branchId: branchFilter ?? branches.data?.[0]?.id,
          roomTypeId: types.data?.[0]?.id,
          code: '',
          status: 'ACTIVE',
          images: [],
        },
      )
  }, [editing, current, form, branchFilter, branches.data, types.data])

  const idSelect = (
    value: number | undefined,
    set: (v: number | undefined) => void,
    id: string,
    items: { id: number; name: string }[] | undefined,
  ) => (
    <Select
      value={value ? String(value) : 'all'}
      onValueChange={(v) => set(v === 'all' ? undefined : Number(v))}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tất cả</SelectItem>
        {items?.map((x) => (
          <SelectItem key={x.id} value={String(x.id)}>
            {x.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const toggleStatus = (r: Room) =>
    setStatus.mutate(
      { id: r.id, status: r.status === 'ACTIVE' ? 'MAINTENANCE' : 'ACTIVE' },
      {
        onSuccess: (res) => {
          if (res.affectedBookings > 0) {
            toast.warning(
              `Phòng ${r.code} đang có ${res.affectedBookings} đơn sắp tới bị ảnh hưởng`,
              {
                action: {
                  label: 'Xem đơn',
                  onClick: () => navigate(`/admin/bookings?q=&branchId=${r.branchId}`),
                },
              },
            )
          } else
            toast.success(`Phòng ${r.code}: ${res.status === 'ACTIVE' ? 'hoạt động' : 'bảo trì'}`)
        },
      },
    )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Phòng" actions={<Button onClick={crud.openNew}>+ Thêm phòng</Button>} />
      <div className="flex flex-wrap items-end gap-3">
        <FilterField label="Chi nhánh" htmlFor="f-branch">
          {idSelect(branchFilter, setBranchFilter, 'f-branch', branches.data)}
        </FilterField>
        <FilterField label="Loại phòng" htmlFor="f-type">
          {idSelect(typeFilter, setTypeFilter, 'f-type', types.data)}
        </FilterField>
        <FilterField label="Trạng thái" htmlFor="f-status">
          <Select
            value={statusFilter ?? 'all'}
            onValueChange={(v) => setStatusFilter(v === 'all' ? undefined : (v as Room['status']))}
          >
            <SelectTrigger id="f-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="ACTIVE">Hoạt động</SelectItem>
              <SelectItem value="MAINTENANCE">Bảo trì</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Tìm kiếm" htmlFor="f-q" className="w-56">
          <Input
            id="f-q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Mã phòng"
          />
        </FilterField>
      </div>
      {rooms.isPending ? (
        <LoadingState />
      ) : rooms.isError ? (
        <ErrorState error={rooms.error} onRetry={() => void rooms.refetch()} />
      ) : (
        <div className="flex flex-col gap-3">
          <TableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã phòng</TableHead>
                  <TableHead className="hidden sm:table-cell">Chi nhánh</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead className="text-right">Sức chứa</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-semibold">{r.code}</TableCell>
                    <TableCell className="hidden sm:table-cell">{r.branchName}</TableCell>
                    <TableCell>{r.type}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.capacity}</TableCell>
                    <TableCell>
                      {r.status === 'ACTIVE' ? (
                        <Tag color="green">Hoạt động</Tag>
                      ) : (
                        <Tag color="gray">Bảo trì</Tag>
                      )}
                    </TableCell>
                    <TableCell>
                      <RowActions
                        onEdit={() => crud.openEdit(r)}
                        onDelete={() => crud.askDelete(r)}
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          className="mx-1"
                          disabled={setStatus.isPending}
                          onClick={() => toggleStatus(r)}
                        >
                          {r.status === 'ACTIVE' ? 'Bảo trì' : 'Mở lại'}
                        </Button>
                      </RowActions>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableCard>
          <p className="text-muted-foreground text-xs">
            Phòng “Bảo trì” bị ẩn khỏi kết quả tìm kiếm của khách (BR-08).
          </p>
          <Pagination
            page={list.page}
            size={list.size}
            total={list.total}
            onPageChange={list.setPage}
            summary={`${list.total} phòng · ${list.size} / trang`}
          />
        </div>
      )}

      <FormDialog
        open={!!crud.editing}
        onOpenChange={(o) => !o && crud.close()}
        title={crud.isNew ? 'Thêm phòng' : `Sửa phòng ${crud.current?.code}`}
        description={
          crud.isNew
            ? 'Phòng mới được đặt tạm trên sơ đồ — vào Chi nhánh › Sơ đồ để kéo về đúng vị trí.'
            : undefined
        }
        formId="room-form"
        submitting={save.isPending}
      >
        <form
          id="room-form"
          className="grid gap-4 sm:grid-cols-2"
          noValidate
          onSubmit={form.handleSubmit((v) =>
            save.mutate(v, { onSuccess: () => (toast.success('Đã lưu phòng'), crud.close()) }),
          )}
        >
          <FormField label="Chi nhánh" htmlFor="r-branch" error={errors.branchId}>
            <Controller
              control={form.control}
              name="branchId"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : undefined}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger id="r-branch" className="w-full">
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
          <FormField label="Loại phòng" htmlFor="r-type" error={errors.roomTypeId}>
            <Controller
              control={form.control}
              name="roomTypeId"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : undefined}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger id="r-type" className="w-full">
                    <SelectValue placeholder="Chọn" />
                  </SelectTrigger>
                  <SelectContent>
                    {types.data?.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name} ({t.capacity} người)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField
            label="Mã phòng"
            htmlFor="r-code"
            error={errors.code}
            description="VD: S07, V05"
          >
            <Input id="r-code" className="uppercase" {...form.register('code')} />
          </FormField>
          <FormField label="Ảnh (URL, tùy chọn)" htmlFor="r-image">
            <Controller
              control={form.control}
              name="images"
              render={({ field }) => (
                <Input
                  id="r-image"
                  placeholder="https://…"
                  value={field.value?.[0] ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? [e.target.value] : [])}
                />
              )}
            />
          </FormField>
        </form>
      </FormDialog>

      <ConfirmDialog
        open={!!crud.deleting}
        onOpenChange={(o) => !o && crud.cancelDelete()}
        title={`Xóa phòng ${crud.deleting?.code}?`}
        description="Phòng đã có lịch sử đặt không xóa được — hãy chuyển sang bảo trì."
        destructive
        confirmLabel="Xóa"
        loading={remove.isPending}
        onConfirm={() =>
          crud.deleting &&
          remove.mutate(crud.deleting.id, {
            onSuccess: () => (toast.success('Đã xóa phòng'), crud.cancelDelete()),
          })
        }
      />
    </div>
  )
}
