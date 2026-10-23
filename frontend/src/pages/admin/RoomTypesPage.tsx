import { zodResolver } from '@hookform/resolvers/zod'
import { ImageIcon, TagIcon } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { adminApi, type RoomTypeInput } from '@api/admin'
import { qk } from '@api/keys'
import { FormDialog } from '@components/admin/FormDialog'
import { ROW_ICON, RowActions } from '@components/admin/RowActions'
import { ConfirmDialog } from '@components/ConfirmDialog'
import { FormField } from '@components/FormField'
import { TableCard } from '@components/admin/TableCard'
import { PageHeader } from '@components/PageHeader'
import { ErrorState, LoadingState } from '@components/states'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@components/ui/table'
import { Textarea } from '@components/ui/textarea'
import {
  useAdminMutation,
  useAdminRooms,
  useAdminRoomTypes,
  usePriceRules,
} from '@hooks/queries/useAdmin'
import { useCrudState } from '@hooks/useCrudState'
import type { RoomType } from '@/types/domain'
import { formatVND } from '@utils/format'

const schema = z.object({
  name: z.string().trim().min(2, 'Nhập tên loại phòng'),
  capacity: z.coerce.number().int().min(1, 'Sức chứa ≥ 1').max(50, 'Tối đa 50'),
  description: z.string().trim().max(500, 'Tối đa 500 ký tự'),
})

const INVALIDATE = [qk.admin.roomTypes, qk.roomTypes, qk.branches]

/** "Giá từ / giờ" = đơn giá thấp nhất trong bảng giá của loại phòng. */
function MinPrice({ roomTypeId }: { roomTypeId: number }) {
  const rules = usePriceRules(roomTypeId)
  if (!rules.data) return <span className="text-muted-foreground">…</span>
  if (!rules.data.length) return <span className="text-muted-foreground">Chưa có giá</span>
  return <>{formatVND(Math.min(...rules.data.map((r) => r.pricePerHour)))}</>
}

/** SCR-A04 */
export function RoomTypesPage() {
  const types = useAdminRoomTypes()
  const rooms = useAdminRooms()
  const countOf = (id: number) => rooms.data?.filter((r) => r.roomTypeId === id).length
  const crud = useCrudState<RoomType>()
  const save = useAdminMutation(
    (v: RoomTypeInput) =>
      crud.current ? adminApi.roomTypes.update(crud.current.id, v) : adminApi.roomTypes.create(v),
    INVALIDATE,
  )
  const remove = useAdminMutation(adminApi.roomTypes.remove, INVALIDATE)
  const form = useForm<RoomTypeInput>({ resolver: zodResolver(schema) })
  const { errors } = form.formState

  const { editing, current } = crud
  useEffect(() => {
    if (editing) form.reset(current ?? { name: '', capacity: 6, description: '' })
  }, [editing, current, form])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Loại phòng"
        actions={<Button onClick={crud.openNew}>+ Thêm loại phòng</Button>}
      />
      {types.isPending ? (
        <LoadingState />
      ) : types.isError ? (
        <ErrorState error={types.error} onRetry={() => void types.refetch()} />
      ) : (
        <div className="flex flex-col gap-3">
          <TableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Ảnh</TableHead>
                  <TableHead>Tên loại</TableHead>
                  <TableHead className="text-right">Sức chứa</TableHead>
                  <TableHead className="text-right">Số phòng</TableHead>
                  <TableHead className="text-right">Giá từ / giờ</TableHead>
                  <TableHead className="hidden md:table-cell">Mô tả</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.data.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <span className="bg-secondary text-primary flex h-10 w-14 items-center justify-center rounded-md">
                        <ImageIcon className="size-4" />
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold">{t.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{t.capacity}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {countOf(t.id) ?? '…'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <MinPrice roomTypeId={t.id} />
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden max-w-sm truncate md:table-cell">
                      {t.description}
                    </TableCell>
                    <TableCell>
                      <RowActions
                        onEdit={() => crud.openEdit(t)}
                        onDelete={() => crud.askDelete(t)}
                      >
                        <Link
                          to={`/admin/price-rules?roomTypeId=${t.id}`}
                          className={ROW_ICON}
                          aria-label="Bảng giá"
                        >
                          <TagIcon />
                        </Link>
                      </RowActions>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableCard>
          <p className="text-muted-foreground text-xs">
            Không thể xóa loại phòng đang có phòng hoặc có đơn trong tương lai. Mỗi loại phòng có
            bảng giá riêng (BR-22).
          </p>
        </div>
      )}

      <FormDialog
        open={!!crud.editing}
        onOpenChange={(o) => !o && crud.close()}
        title={crud.isNew ? 'Thêm loại phòng' : 'Sửa loại phòng'}
        description={
          crud.isNew ? 'Sau khi tạo, hãy thiết lập bảng giá cho loại phòng này.' : undefined
        }
        formId="type-form"
        submitting={save.isPending}
      >
        <form
          id="type-form"
          className="grid gap-4"
          noValidate
          onSubmit={form.handleSubmit((v) =>
            save.mutate(v, {
              onSuccess: () => {
                toast.success('Đã lưu loại phòng')
                crud.close()
              },
            }),
          )}
        >
          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <FormField label="Tên" htmlFor="t-name" error={errors.name}>
              <Input id="t-name" {...form.register('name')} />
            </FormField>
            <FormField label="Sức chứa" htmlFor="t-cap" error={errors.capacity}>
              <Input id="t-cap" type="number" min={1} {...form.register('capacity')} />
            </FormField>
          </div>
          <FormField label="Mô tả" htmlFor="t-desc" error={errors.description}>
            <Textarea id="t-desc" rows={3} {...form.register('description')} />
          </FormField>
        </form>
      </FormDialog>

      <ConfirmDialog
        open={!!crud.deleting}
        onOpenChange={(o) => !o && crud.cancelDelete()}
        title={`Xóa loại phòng ${crud.deleting?.name}?`}
        description="Bảng giá của loại phòng cũng bị xóa. Không xóa được nếu còn phòng thuộc loại này."
        destructive
        confirmLabel="Xóa"
        loading={remove.isPending}
        onConfirm={() =>
          crud.deleting &&
          remove.mutate(crud.deleting.id, {
            onSuccess: () => (toast.success('Đã xóa'), crud.cancelDelete()),
          })
        }
      />
    </div>
  )
}
