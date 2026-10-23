import { zodResolver } from '@hookform/resolvers/zod'
import { SearchIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { adminApi, type MenuItemInput } from '@api/admin'
import { qk } from '@api/keys'
import { FormDialog } from '@components/admin/FormDialog'
import { RowActions } from '@components/admin/RowActions'
import { ConfirmDialog } from '@components/ConfirmDialog'
import { FormField } from '@components/FormField'
import { MenuItemIcon } from '@components/MenuItemIcon'
import { TableCard } from '@components/admin/TableCard'
import { PageHeader } from '@components/PageHeader'
import { Pagination } from '@components/Pagination'
import { Segmented } from '@components/Segmented'
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
import { Switch } from '@components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@components/ui/table'
import { useAdminMenu, useAdminMutation } from '@hooks/queries/useAdmin'
import { useClientPage } from '@hooks/useClientPage'
import { useCrudState } from '@hooks/useCrudState'
import type { MenuCategory, MenuItem } from '@/types/domain'
import { MENU_CATEGORY_COLOR, MENU_CATEGORY_LABEL } from '@utils/booking'
import { formatVND } from '@utils/format'

const schema = z.object({
  name: z.string().trim().min(2, 'Nhập tên món'),
  category: z.enum(['FOOD', 'DRINK', 'COMBO']),
  price: z.coerce.number().int().min(1000, 'Giá tối thiểu 1.000đ'),
  image: z
    .string()
    .trim()
    .url('URL không hợp lệ')
    .nullable()
    .or(z.literal('').transform(() => null)),
  available: z.boolean(),
})

const INVALIDATE = [qk.admin.menu, ['menu']]

/** SCR-A07 */
export function MenuPage() {
  const [query, setQuery] = useState('')
  const menu = useAdminMenu()
  const [category, setCategory] = useState<MenuCategory | 'ALL'>('ALL')
  const crud = useCrudState<MenuItem>()
  const save = useAdminMutation(
    (v: MenuItemInput) =>
      crud.current ? adminApi.menu.update(crud.current.id, v) : adminApi.menu.create(v),
    INVALIDATE,
  )
  const setAvailability = useAdminMutation(
    ({ id, available }: { id: number; available: boolean }) =>
      adminApi.menu.setAvailability(id, available),
    INVALIDATE,
  )
  const remove = useAdminMutation(adminApi.menu.remove, INVALIDATE)
  const form = useForm<MenuItemInput>({ resolver: zodResolver(schema) })
  const { errors } = form.formState

  const { editing, current } = crud
  useEffect(() => {
    if (editing)
      form.reset(
        current ?? { name: '', category: 'FOOD', price: 50000, image: null, available: true },
      )
  }, [editing, current, form])

  const q = query.trim().toLowerCase()
  const list = useClientPage(
    menu.data?.filter(
      (m) =>
        (category === 'ALL' || m.category === category) && (!q || m.name.toLowerCase().includes(q)),
    ),
  )
  const countOf = (c: MenuCategory | 'ALL') =>
    menu.data?.filter((m) => c === 'ALL' || m.category === c).length ?? 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Menu đồ ăn uống"
        actions={<Button onClick={crud.openNew}>+ Thêm món</Button>}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          value={category}
          onChange={setCategory}
          options={(['ALL', ...Object.keys(MENU_CATEGORY_LABEL)] as (MenuCategory | 'ALL')[]).map(
            (c) => ({
              value: c,
              label: `${c === 'ALL' ? 'Tất cả' : MENU_CATEGORY_LABEL[c]} (${countOf(c)})`,
            }),
          )}
        />
        <div className="relative w-full max-w-[300px]">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm món"
            className="pl-9"
            aria-label="Tìm món"
          />
        </div>
      </div>
      {menu.isPending ? (
        <LoadingState />
      ) : menu.isError ? (
        <ErrorState error={menu.error} onRetry={() => void menu.refetch()} />
      ) : (
        <div className="flex flex-col gap-3">
          <TableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Ảnh</TableHead>
                  <TableHead>Tên món</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead className="text-right">Giá</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.rows.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <MenuItemIcon category={m.category} image={m.image} className="size-10" />
                    </TableCell>
                    <TableCell className="font-semibold">{m.name}</TableCell>
                    <TableCell>
                      <Tag color={MENU_CATEGORY_COLOR[m.category]}>
                        {MENU_CATEGORY_LABEL[m.category]}
                      </Tag>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatVND(m.price)}</TableCell>
                    <TableCell>
                      {m.available ? (
                        <Tag color="green">Đang bán</Tag>
                      ) : (
                        <Tag color="gray">Ngừng bán</Tag>
                      )}
                    </TableCell>
                    <TableCell>
                      <RowActions
                        onEdit={() => crud.openEdit(m)}
                        onDelete={() => crud.askDelete(m)}
                      >
                        <Switch
                          className="mx-2"
                          checked={m.available}
                          aria-label={`${m.name} đang bán`}
                          onCheckedChange={(available) =>
                            setAvailability.mutate({ id: m.id, available })
                          }
                        />
                      </RowActions>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableCard>
          <p className="text-muted-foreground text-xs">
            Món đã có trong đơn không xóa được — tắt công tắc để ngừng bán.
          </p>
          <Pagination
            page={list.page}
            size={list.size}
            total={list.total}
            onPageChange={list.setPage}
            summary={`${list.total} món`}
          />
        </div>
      )}

      <FormDialog
        open={!!crud.editing}
        onOpenChange={(o) => !o && crud.close()}
        title={crud.isNew ? 'Thêm món' : 'Sửa món'}
        description={crud.isNew ? undefined : 'Đổi giá không ảnh hưởng các đơn đã đặt (BR-24).'}
        formId="menu-form"
        submitting={save.isPending}
      >
        <form
          id="menu-form"
          className="grid gap-4 sm:grid-cols-2"
          noValidate
          onSubmit={form.handleSubmit((v) =>
            save.mutate(v, { onSuccess: () => (toast.success('Đã lưu món'), crud.close()) }),
          )}
        >
          <FormField label="Tên món" htmlFor="m-name" error={errors.name} className="sm:col-span-2">
            <Input id="m-name" {...form.register('name')} />
          </FormField>
          <FormField label="Nhóm" htmlFor="m-cat" error={errors.category}>
            <Controller
              control={form.control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="m-cat" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(MENU_CATEGORY_LABEL) as MenuCategory[]).map((c) => (
                      <SelectItem key={c} value={c}>
                        {MENU_CATEGORY_LABEL[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label="Giá (đ)" htmlFor="m-price" error={errors.price}>
            <Input id="m-price" type="number" step={1000} {...form.register('price')} />
          </FormField>
          <FormField
            label="Ảnh (URL, tùy chọn)"
            htmlFor="m-image"
            error={errors.image}
            className="sm:col-span-2"
          >
            <Input id="m-image" placeholder="https://…" {...form.register('image')} />
          </FormField>
          <Controller
            control={form.control}
            name="available"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <Switch checked={field.value} onCheckedChange={field.onChange} /> Đang bán
              </label>
            )}
          />
        </form>
      </FormDialog>

      <ConfirmDialog
        open={!!crud.deleting}
        onOpenChange={(o) => !o && crud.cancelDelete()}
        title={`Xóa món ${crud.deleting?.name}?`}
        destructive
        confirmLabel="Xóa"
        loading={remove.isPending}
        onConfirm={() =>
          crud.deleting &&
          remove.mutate(crud.deleting.id, {
            onSuccess: () => (toast.success('Đã xóa món'), crud.cancelDelete()),
          })
        }
      />
    </div>
  )
}
