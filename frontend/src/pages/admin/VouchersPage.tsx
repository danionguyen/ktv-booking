import { zodResolver } from '@hookform/resolvers/zod'
import { SearchIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { adminApi, type VoucherInput } from '@api/admin'
import { qk } from '@api/keys'
import { FormDialog } from '@components/admin/FormDialog'
import { RowActions } from '@components/admin/RowActions'
import { ConfirmDialog } from '@components/ConfirmDialog'
import { DatePicker } from '@components/DatePicker'
import { FormField } from '@components/FormField'
import { FilterField } from '@components/admin/FilterField'
import { TableCard } from '@components/admin/TableCard'
import { PageHeader } from '@components/PageHeader'
import { Pagination } from '@components/Pagination'
import { Tag, type TagColor } from '@components/Tag'
import { ErrorState, LoadingState } from '@components/states'
import { Label } from '@components/ui/label'
import { RadioGroup, RadioGroupItem } from '@components/ui/radio-group'
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
import { useAdminMutation, useAdminVouchers } from '@hooks/queries/useAdmin'
import { useClientPage } from '@hooks/useClientPage'
import { useCrudState } from '@hooks/useCrudState'
import { cn } from '@lib/utils'
import type { Voucher } from '@/types/domain'
import { VOUCHER_TYPE_LABEL } from '@utils/booking'
import { dayjs, formatDate, formatVND, TZ } from '@utils/format'
import { toApiTime, vn } from '@utils/time'

const schema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, 'Tối thiểu 3 ký tự')
      .max(20, 'Tối đa 20 ký tự')
      .regex(/^[A-Za-z0-9]+$/, 'Chỉ chữ và số'),
    type: z.enum(['PERCENT', 'FIXED']),
    value: z.coerce.number().positive('Giá trị phải > 0'),
    maxDiscount: z.coerce.number().nonnegative().nullable(),
    minOrder: z.coerce.number().nonnegative(),
    startDate: z.string().min(1, 'Chọn ngày bắt đầu'),
    endDate: z.string().min(1, 'Chọn ngày kết thúc'),
    usageLimit: z.coerce.number().int().min(1, 'Tối thiểu 1 lượt'),
  })
  .refine((v) => v.type !== 'PERCENT' || v.value <= 100, {
    message: 'Phần trăm tối đa 100',
    path: ['value'],
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: 'Ngày kết thúc phải sau ngày bắt đầu',
    path: ['endDate'],
  })
type Values = z.infer<typeof schema>

const toForm = (v: Voucher | null): Values =>
  v
    ? {
        ...v,
        startDate: vn(v.startAt).format('YYYY-MM-DD'),
        endDate: vn(v.endAt).format('YYYY-MM-DD'),
      }
    : {
        code: '',
        type: 'PERCENT',
        value: 10,
        maxDiscount: 100000,
        minOrder: 300000,
        startDate: vn().format('YYYY-MM-DD'),
        endDate: vn().add(30, 'day').format('YYYY-MM-DD'),
        usageLimit: 100,
      }

const toInput = ({ startDate, endDate, ...v }: Values): VoucherInput => ({
  ...v,
  code: v.code.toUpperCase(),
  maxDiscount: v.type === 'PERCENT' ? v.maxDiscount || null : null,
  startAt: toApiTime(dayjs.tz(startDate, TZ).startOf('day')),
  endAt: toApiTime(dayjs.tz(endDate, TZ).endOf('day')),
})

type VoucherState = 'RUNNING' | 'UPCOMING' | 'EXPIRED' | 'USED_UP'

const STATE: Record<VoucherState, { label: string; color: TagColor }> = {
  RUNNING: { label: 'Đang chạy', color: 'green' },
  UPCOMING: { label: 'Sắp diễn ra', color: 'blue' },
  USED_UP: { label: 'Hết lượt', color: 'orange' },
  EXPIRED: { label: 'Hết hạn', color: 'gray' },
}

function voucherState(v: Voucher): VoucherState {
  const now = vn()
  if (vn(v.endAt).isBefore(now)) return 'EXPIRED'
  if (vn(v.startAt).isAfter(now)) return 'UPCOMING'
  if (v.usedCount >= v.usageLimit) return 'USED_UP'
  return 'RUNNING'
}

/** Ô nhập số có đơn vị ở cuối ("%", "đ") như modal A08b. */
function SuffixInput({
  suffix,
  ...props
}: React.ComponentProps<typeof Input> & { suffix: string }) {
  return (
    <div className="relative">
      <Input type="number" className="pr-9" {...props} />
      <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
        {suffix}
      </span>
    </div>
  )
}

const INVALIDATE = [qk.admin.vouchers]

/** SCR-A08 + A08b */
export function VouchersPage() {
  const vouchers = useAdminVouchers()
  const [stateFilter, setStateFilter] = useState<VoucherState | 'ALL'>('ALL')
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const list = useClientPage(
    vouchers.data?.filter(
      (v) =>
        (stateFilter === 'ALL' || voucherState(v) === stateFilter) &&
        (!q || v.code.toLowerCase().includes(q)),
    ),
  )
  const crud = useCrudState<Voucher>()
  const save = useAdminMutation(
    (v: VoucherInput) =>
      crud.current ? adminApi.vouchers.update(crud.current.id, v) : adminApi.vouchers.create(v),
    INVALIDATE,
  )
  const remove = useAdminMutation(adminApi.vouchers.remove, INVALIDATE)
  const form = useForm<Values>({ resolver: zodResolver(schema) })
  const { errors } = form.formState
  const type = form.watch('type')

  const { editing, current } = crud
  useEffect(() => {
    if (editing) form.reset(toForm(current))
  }, [editing, current, form])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Voucher" actions={<Button onClick={crud.openNew}>+ Tạo voucher</Button>} />
      <div className="flex flex-wrap items-end gap-3">
        <FilterField label="Trạng thái" htmlFor="f-state">
          <Select
            value={stateFilter}
            onValueChange={(v) => setStateFilter(v as VoucherState | 'ALL')}
          >
            <SelectTrigger id="f-state" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả</SelectItem>
              {(Object.keys(STATE) as VoucherState[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {STATE[k].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <div className="relative w-full max-w-[300px]">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm mã voucher"
            className="pl-9"
            aria-label="Tìm mã voucher"
          />
        </div>
      </div>
      {vouchers.isPending ? (
        <LoadingState />
      ) : vouchers.isError ? (
        <ErrorState error={vouchers.error} onRetry={() => void vouchers.refetch()} />
      ) : (
        <div className="flex flex-col gap-3">
          <TableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead className="text-right">Giá trị</TableHead>
                  <TableHead className="text-right">Giảm tối đa</TableHead>
                  <TableHead className="text-right">Đơn tối thiểu</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead className="text-right">Đã dùng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.rows.map((v) => {
                  const state = STATE[voucherState(v)]
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="font-semibold">{v.code}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{v.type}</TableCell>
                      <TableCell className="text-right">
                        {v.type === 'PERCENT' ? `${v.value}%` : formatVND(v.value)}
                      </TableCell>
                      <TableCell className="text-right">
                        {v.maxDiscount ? formatVND(v.maxDiscount) : '—'}
                      </TableCell>
                      <TableCell className="text-right">{formatVND(v.minOrder)}</TableCell>
                      <TableCell className="text-xs leading-5">
                        {formatDate(v.startAt)}
                        <br />
                        {formatDate(v.endAt)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {v.usedCount} / {v.usageLimit}
                      </TableCell>
                      <TableCell>
                        <Tag color={state.color}>{state.label}</Tag>
                      </TableCell>
                      <TableCell>
                        <RowActions
                          onEdit={() => crud.openEdit(v)}
                          onDelete={() => crud.askDelete(v)}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableCard>
          <p className="text-muted-foreground text-xs">
            Mỗi đơn áp 1 voucher. Lượt dùng tăng khi đơn được xác nhận và hoàn lại khi đơn bị hủy
            (BR-32).
          </p>
          <Pagination
            page={list.page}
            size={list.size}
            total={list.total}
            onPageChange={list.setPage}
            summary={`${list.total} voucher`}
          />
        </div>
      )}

      <FormDialog
        open={!!crud.editing}
        onOpenChange={(o) => !o && crud.close()}
        title={crud.isNew ? 'Tạo voucher' : `Sửa voucher ${crud.current?.code}`}
        formId="voucher-form"
        submitting={save.isPending}
        submitLabel="Lưu voucher"
      >
        <form
          id="voucher-form"
          className="grid gap-4 sm:grid-cols-2"
          noValidate
          onSubmit={form.handleSubmit((v) =>
            save.mutate(toInput(v), {
              onSuccess: () => (toast.success('Đã lưu voucher'), crud.close()),
            }),
          )}
        >
          <FormField label="Mã *" htmlFor="v-code" error={errors.code} className="sm:col-span-2">
            <Input id="v-code" className="uppercase" {...form.register('code')} />
          </FormField>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Loại *</Label>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="grid grid-cols-2 gap-3"
                >
                  {(['PERCENT', 'FIXED'] as const).map((t) => (
                    <Label
                      key={t}
                      htmlFor={`v-type-${t}`}
                      className={cn(
                        'cursor-pointer rounded-lg border px-3 py-2.5',
                        field.value === t && 'border-primary bg-secondary',
                      )}
                    >
                      <RadioGroupItem id={`v-type-${t}`} value={t} />
                      {VOUCHER_TYPE_LABEL[t]} ({t})
                    </Label>
                  ))}
                </RadioGroup>
              )}
            />
          </div>
          <FormField label="Giá trị *" htmlFor="v-value" error={errors.value}>
            <SuffixInput
              id="v-value"
              suffix={type === 'PERCENT' ? '%' : 'đ'}
              {...form.register('value')}
            />
          </FormField>
          <FormField label="Giảm tối đa" htmlFor="v-max" error={errors.maxDiscount}>
            <SuffixInput
              id="v-max"
              suffix="đ"
              step={1000}
              disabled={type !== 'PERCENT'}
              {...form.register('maxDiscount')}
            />
          </FormField>
          <FormField label="Đơn tối thiểu *" htmlFor="v-min" error={errors.minOrder}>
            <SuffixInput id="v-min" suffix="đ" step={1000} {...form.register('minOrder')} />
          </FormField>
          <FormField label="Số lượt *" htmlFor="v-limit" error={errors.usageLimit}>
            <Input id="v-limit" type="number" {...form.register('usageLimit')} />
          </FormField>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="v-start">Thời gian áp dụng *</Label>
            <div className="flex items-center gap-2">
              <Controller
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <DatePicker id="v-start" value={field.value} onChange={field.onChange} />
                )}
              />
              <span className="text-muted-foreground">→</span>
              <Controller
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <DatePicker id="v-end" value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
            {(errors.startDate || errors.endDate) && (
              <p className="text-destructive text-xs">
                {errors.startDate?.message ?? errors.endDate?.message}
              </p>
            )}
            <p className="text-muted-foreground text-xs">
              Áp dụng từ 00:00 ngày đầu đến 23:59 ngày cuối.
            </p>
          </div>
        </form>
      </FormDialog>

      <ConfirmDialog
        open={!!crud.deleting}
        onOpenChange={(o) => !o && crud.cancelDelete()}
        title={`Xóa voucher ${crud.deleting?.code}?`}
        description="Voucher đã được dùng không xóa được — hãy sửa ngày kết thúc để ngừng áp dụng."
        destructive
        confirmLabel="Xóa"
        loading={remove.isPending}
        onConfirm={() =>
          crud.deleting &&
          remove.mutate(crud.deleting.id, {
            onSuccess: () => (toast.success('Đã xóa voucher'), crud.cancelDelete()),
          })
        }
      />
    </div>
  )
}
