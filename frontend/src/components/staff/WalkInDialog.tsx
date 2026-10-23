import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDownIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { FormField } from '@components/FormField'
import { MenuPicker } from '@components/MenuPicker'
import { Button } from '@components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog'
import { Input } from '@components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select'
import { useMenu, usePriceQuote, useRoomMap } from '@hooks/queries/useCatalog'
import { useWalkIn } from '@hooks/queries/useStaff'
import { zName, zPhone } from '@lib/validation'
import { formatHours, formatTime, formatVND } from '@utils/format'
import { HOUR_OPTIONS, toApiTime, vn } from '@utils/time'

const schema = z.object({
  roomId: z.number({ required_error: 'Chọn phòng' }),
  hours: z.number(),
  people: z.coerce.number().int().min(1, 'Tối thiểu 1 người'),
  guestName: zName,
  guestPhone: zPhone,
})
type Values = z.infer<typeof schema>

interface WalkInDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  branchId: number
  roomId?: number
}

/** SCR-S02 — khách vãng lai: bắt đầu ngay, check-in luôn (FD-OPS-02). */
export function WalkInDialog({ open, onOpenChange, branchId, roomId }: WalkInDialogProps) {
  const navigate = useNavigate()
  const walkIn = useWalkIn()
  const menu = useMenu({ available: true })
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { hours: 2, people: 4, guestName: '', guestPhone: '' },
  })
  const hours = form.watch('hours')
  const selectedRoom = form.watch('roomId')
  // Mốc thời gian cố định khi mở hộp thoại để query key ổn định
  const [now, setNow] = useState(() => vn())
  useEffect(() => {
    if (!open) return
    setNow(vn())
    setQuantities({})
    form.reset({ hours: 2, people: 4, guestName: '', guestPhone: '', roomId: roomId as number })
  }, [open, roomId, form])

  const range = { start: toApiTime(now), end: toApiTime(now.add(hours * 60, 'minute')) }
  const map = useRoomMap(open ? branchId : undefined, range)
  const freeRooms = map.data?.rooms.filter((r) => r.status === 'AVAILABLE') ?? []
  const room = map.data?.rooms.find((r) => r.id === selectedRoom)
  const roomUnavailable = !!room && room.status !== 'AVAILABLE'
  const { errors } = form.formState

  const submit = (v: Values) => {
    if (room && v.people > room.capacity) {
      form.setError('people', { message: `Phòng ${room.code} chứa tối đa ${room.capacity} người` })
      return
    }
    walkIn.mutate(
      {
        ...v,
        items: Object.entries(quantities)
          .filter(([, q]) => q > 0)
          .map(([id, quantity]) => ({ menuItemId: Number(id), quantity })),
      },
      {
        onSuccess: (b) => {
          toast.success(`Đã check-in phòng ${b.room.code} cho ${b.customer.name}`)
          onOpenChange(false)
          navigate(`/staff/bookings/${b.id}`)
        },
      },
    )
  }

  const quote = usePriceQuote(
    selectedRoom ?? 0,
    open && selectedRoom ? range.start : undefined,
    hours,
  )
  const chosen = (menu.data ?? []).filter((m) => (quantities[m.id] ?? 0) > 0)
  const fnb = chosen.reduce((sum, m) => sum + m.price * quantities[m.id], 0)
  const line = quote.data?.breakdown.length === 1 ? quote.data.breakdown[0] : null
  const roomAmount = quote.data?.total ?? 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Khách vãng lai</DialogTitle>
          <DialogDescription>
            Tạo đơn và check-in ngay{map.data ? ` · ${map.data.branch.name}` : ''}
          </DialogDescription>
        </DialogHeader>
        <form
          id="walk-in"
          onSubmit={form.handleSubmit(submit)}
          className="grid gap-4 sm:grid-cols-2"
          noValidate
        >
          <FormField label="Phòng *" htmlFor="wi-room" error={errors.roomId}>
            <Controller
              control={form.control}
              name="roomId"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : undefined}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger id="wi-room" className="w-full">
                    <SelectValue
                      placeholder={map.isPending ? 'Đang tải…' : `${freeRooms.length} phòng trống`}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {freeRooms.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.code} – {r.type} · {r.capacity} người
                      </SelectItem>
                    ))}
                    {room && roomUnavailable && (
                      <SelectItem value={String(room.id)} disabled>
                        {room.code} · không trống
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label="Số giờ *" htmlFor="wi-hours">
            <Controller
              control={form.control}
              name="hours"
              render={({ field }) => (
                <Select
                  value={String(field.value)}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger id="wi-hours" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOUR_OPTIONS.map((h) => (
                      <SelectItem key={h} value={String(h)}>
                        {formatHours(h)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          {roomUnavailable && (
            <p className="text-destructive text-sm sm:col-span-2">
              Phòng {room.code} không trống trong {formatHours(hours)} tới — hãy chọn phòng khác
              hoặc giảm số giờ.
            </p>
          )}
          <FormField label="Số người *" htmlFor="wi-people" error={errors.people}>
            <Input id="wi-people" type="number" min={1} {...form.register('people')} />
          </FormField>
          <FormField label="Tên khách *" htmlFor="wi-name" error={errors.guestName}>
            <Input id="wi-name" placeholder="Khách lẻ" {...form.register('guestName')} />
          </FormField>
          <FormField label="Số điện thoại" htmlFor="wi-phone" error={errors.guestPhone}>
            <Input id="wi-phone" type="tel" {...form.register('guestPhone')} />
          </FormField>
          <FormField label="Món" htmlFor="wi-menu">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="wi-menu"
                  type="button"
                  variant="outline"
                  className="h-10 w-full justify-between px-3 font-normal"
                >
                  <span className="truncate">
                    {chosen.length
                      ? chosen.map((m) => `${m.name} × ${quantities[m.id]}`).join(', ')
                      : 'Chưa gọi món'}
                  </span>
                  <ChevronDownIcon className="text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="max-h-96 w-[420px] overflow-y-auto p-3">
                {menu.data && (
                  <MenuPicker
                    items={menu.data}
                    quantities={quantities}
                    onChange={(id, q) => setQuantities((s) => ({ ...s, [id]: q }))}
                  />
                )}
              </PopoverContent>
            </Popover>
          </FormField>
        </form>
        <dl className="bg-background flex flex-col gap-2 rounded-[10px] p-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Giờ kết thúc</dt>
            <dd className="font-semibold">{formatTime(range.end)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              Tiền phòng (
              {line
                ? `${formatHours(line.hours)} × ${formatVND(line.unitPrice)}`
                : formatHours(hours)}
              )
            </dt>
            <dd className="font-semibold">{selectedRoom ? formatVND(roomAmount) : '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Đồ ăn uống</dt>
            <dd className="font-semibold">{formatVND(fnb)}</dd>
          </div>
          <div className="flex items-baseline justify-between border-t pt-2">
            <dt className="text-muted-foreground">Tạm tính</dt>
            <dd className="text-link text-xl font-semibold">{formatVND(roomAmount + fnb)}</dd>
          </div>
        </dl>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="submit" form="walk-in" disabled={walkIn.isPending || roomUnavailable}>
            {walkIn.isPending ? 'Đang tạo…' : 'Tạo & check-in'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
