import { CheckIcon, ClockIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ApiRequestError } from '@api/client'
import { errorMessage } from '@api/queryClient'
import { BookingInfo } from '@components/booking/BookingInfo'
import { ConfirmDialog } from '@components/ConfirmDialog'
import { MenuPicker } from '@components/MenuPicker'
import { InfoRow } from '@components/InfoRow'
import { ErrorState, LoadingState } from '@components/states'
import { Button } from '@components/ui/button'
import { Checkbox } from '@components/ui/checkbox'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { RadioGroup, RadioGroupItem } from '@components/ui/radio-group'
import { HoldCountdown } from '@features/room-map/HoldCountdown'
import {
  useBooking,
  useConfirmBooking,
  useReleaseHold,
  useSetItems,
  useValidateVoucher,
} from '@hooks/queries/useBookings'
import { useMenu } from '@hooks/queries/useCatalog'
import { useCountdown } from '@hooks/useCountdown'
import { cn } from '@lib/utils'
import type { PaymentMethod, VoucherValidation } from '@/types/domain'
import { DAY_TYPE_SHORT } from '@utils/booking'
import { formatHours, formatVND } from '@utils/format'
import { goToPayment } from '@utils/payment'

const METHODS: { value: PaymentMethod; title: string; text: string }[] = [
  {
    value: 'VNPAY',
    title: 'Thanh toán qua VNPay',
    text: 'ATM nội địa, QR, thẻ quốc tế · hạn thanh toán 15 phút',
  },
  {
    value: 'CASH',
    title: 'Trả tại quầy',
    text: 'Xác nhận ngay · tự hủy nếu không check-in sau 15 phút kể từ giờ bắt đầu',
  },
]

const POLICY = [
  'Hủy trước ≥ 24 giờ: hoàn 100%',
  'Hủy trước 2 – 24 giờ: hoàn 50%',
  'Dưới 2 giờ: không hủy online, vui lòng liên hệ quầy',
  'Trả tại quầy: đơn tự hủy nếu đến muộn quá 15 phút',
]

export function CheckoutPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const booking = useBooking(id)
  const menu = useMenu({ available: true })
  const setItems = useSetItems(id)
  const validateVoucher = useValidateVoucher(id)
  const confirm = useConfirmBooking(id)
  const release = useReleaseHold()

  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const [voucherCode, setVoucherCode] = useState('')
  const [voucher, setVoucher] = useState<VoucherValidation | null>(null)
  const [voucherError, setVoucherError] = useState<string | null>(null)
  const [method, setMethod] = useState<PaymentMethod>('VNPAY')
  const [confirmRelease, setConfirmRelease] = useState(false)
  const [agree, setAgree] = useState(true)
  const initialized = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const b = booking.data
  const { expired } = useCountdown(b?.status === 'HOLD' ? b.holdExpiresAt : null, b?.serverTime)

  // Khởi tạo số lượng món từ đơn (khi quay lại trang)
  useEffect(() => {
    if (!b || initialized.current) return
    initialized.current = true
    setQuantities(Object.fromEntries(b.items.map((i) => [i.menuItemId, i.quantity])))
  }, [b])

  useEffect(() => {
    if (!expired) return
    toast.error('Hết thời gian giữ chỗ, phòng đã được mở lại')
    navigate('/search', { replace: true })
  }, [expired, navigate])

  useEffect(() => () => clearTimeout(saveTimer.current), [])

  const applyVoucher = (code: string) => {
    setVoucherError(null)
    validateVoucher.mutate(code, {
      onSuccess: setVoucher,
      onError: (e) => {
        setVoucher(null)
        setVoucherError(errorMessage(e))
      },
    })
  }

  // Lưu món sau 600ms không thao tác; tổng thay đổi → kiểm tra lại voucher
  const changeQuantity = (menuItemId: number, quantity: number) => {
    const next = { ...quantities, [menuItemId]: quantity }
    setQuantities(next)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveItems(next), 600)
  }

  const saveItems = (q: Record<number, number>) => {
    clearTimeout(saveTimer.current)
    const items = Object.entries(q)
      .filter(([, n]) => n > 0)
      .map(([mid, n]) => ({ menuItemId: Number(mid), quantity: n }))
    setItems.mutate(items, { onSuccess: () => voucher && applyVoucher(voucher.code) })
  }

  const onConfirm = () =>
    confirm.mutate(
      { paymentMethod: method, voucherCode: voucher?.code },
      {
        onSuccess: (res) => {
          if (res.paymentUrl) {
            goToPayment(res.paymentUrl, navigate)
          } else {
            toast.success(`Đặt phòng thành công · mã ${res.code}`)
            navigate(`/my-bookings/${res.id}`, { replace: true })
          }
        },
        onError: (e) => {
          if (e instanceof ApiRequestError && e.code === 'HOLD_EXPIRED') {
            toast.error(e.message)
            navigate('/search', { replace: true })
          } else if (e instanceof ApiRequestError && e.code === 'VOUCHER_INVALID') {
            setVoucher(null)
            setVoucherError(e.message)
          } else {
            toast.error(errorMessage(e))
          }
        },
      },
    )

  if (booking.isPending) return <LoadingState />
  if (booking.isError)
    return <ErrorState error={booking.error} onRetry={() => void booking.refetch()} />
  if (!b) return null
  if (b.status !== 'HOLD') return <Navigate to={`/my-bookings/${b.id}`} replace />

  const fnb = b.fnbAmount
  const subtotal = b.roomAmount + fnb
  const discount = voucher?.discount ?? 0
  const total = Math.round((subtotal - discount) / 1000) * 1000
  const draftFnb = (menu.data ?? []).reduce((sum, m) => sum + (quantities[m.id] ?? 0) * m.price, 0)

  return (
    <div className="flex flex-col gap-6">
      <nav className="text-muted-foreground text-xs whitespace-pre" aria-label="Breadcrumb">
        <Link to="/search" className="hover:text-foreground">
          Tìm phòng
        </Link>
        {'  /  '}
        <span>Checkout</span>
      </nav>
      <h1 className="text-[28px] leading-9 font-bold">Hoàn tất đặt phòng</h1>

      <div className="bg-room-held-bg border-room-held flex flex-wrap items-center gap-4 rounded-xl border px-6 py-4">
        <ClockIcon className="text-room-held size-6 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Phòng {b.room.code} đang được giữ cho bạn</p>
          <p className="text-muted-foreground text-xs">
            Hoàn tất trước khi hết giờ, nếu không phòng sẽ được mở lại cho khách khác.
          </p>
        </div>
        {b.holdExpiresAt && (
          <HoldCountdown
            deadline={b.holdExpiresAt}
            serverTime={b.serverTime}
            compact
            className="text-room-held font-sans text-[28px] font-bold"
          />
        )}
        <Button variant="outline" onClick={() => setConfirmRelease(true)}>
          Bỏ giữ chỗ
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="bg-card flex flex-col gap-4 rounded-xl border p-6">
            <h2 className="text-base font-semibold">Thông tin đặt phòng</h2>
            <BookingInfo booking={b} />
          </section>

          <section className="bg-card flex flex-col gap-4 rounded-xl border p-6">
            <h2 className="text-base font-semibold">Đồ ăn uống (tùy chọn)</h2>
            {menu.data ? (
              <MenuPicker
                variant="cards"
                items={menu.data}
                quantities={quantities}
                onChange={changeQuantity}
              />
            ) : (
              <LoadingState rows={3} />
            )}
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Tạm tính đồ ăn uống: {formatVND(draftFnb)}</p>
              <Button
                variant="outline"
                disabled={setItems.isPending}
                onClick={() => saveItems(quantities)}
              >
                {setItems.isPending ? 'Đang lưu…' : 'Lưu món'}
              </Button>
            </div>
          </section>

          <section className="bg-card flex flex-col gap-4 rounded-xl border p-6">
            <h2 className="text-base font-semibold">Phương thức thanh toán</h2>
            <RadioGroup
              value={method}
              onValueChange={(v) => setMethod(v as PaymentMethod)}
              className="flex flex-col gap-4"
            >
              {METHODS.map(({ value, title, text }) => (
                <Label
                  key={value}
                  htmlFor={`method-${value}`}
                  className={cn(
                    'flex cursor-pointer flex-col items-start gap-1.5 rounded-xl border px-4 py-4',
                    method === value ? 'border-primary bg-secondary' : 'border-border',
                  )}
                >
                  <span className="flex items-center gap-2.5 text-sm">
                    <RadioGroupItem id={`method-${value}`} value={value} />
                    {title}
                  </span>
                  <span className="text-muted-foreground text-xs">{text}</span>
                </Label>
              ))}
            </RadioGroup>
            <div className="bg-background rounded-xl p-4">
              <p className="mb-2 text-sm font-semibold">Chính sách hủy</p>
              <ul className="text-muted-foreground flex flex-col gap-1 text-xs">
                {POLICY.map((p) => (
                  <li key={p}>• {p}</li>
                ))}
              </ul>
            </div>
            <Label htmlFor="agree">
              <Checkbox id="agree" checked={agree} onCheckedChange={(v) => setAgree(v === true)} />
              Tôi đồng ý với chính sách đặt và hủy phòng
            </Label>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <section className="bg-card flex flex-col gap-4 rounded-xl border p-6">
            <h2 className="text-base font-semibold">Tóm tắt thanh toán</h2>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="voucher">Mã voucher</Label>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (voucher) {
                    setVoucher(null)
                    setVoucherCode('')
                  } else if (voucherCode.trim()) applyVoucher(voucherCode.trim())
                }}
              >
                <Input
                  id="voucher"
                  placeholder="VD: KTV10"
                  value={voucher ? voucher.code : voucherCode}
                  readOnly={!!voucher}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  aria-invalid={!!voucherError}
                />
                <Button
                  type="submit"
                  variant="outline"
                  className="h-10"
                  disabled={!voucher && (validateVoucher.isPending || !voucherCode.trim())}
                >
                  {voucher ? 'Gỡ' : 'Áp dụng'}
                </Button>
              </form>
              {voucher && (
                <p className="text-room-available flex items-center gap-1 text-xs">
                  <CheckIcon className="size-3.5" /> Đã áp dụng {voucher.code}: giảm{' '}
                  {voucher.type === 'PERCENT' ? `${voucher.value}%` : formatVND(voucher.value)}
                </p>
              )}
              {voucherError && <p className="text-destructive text-xs">{voucherError}</p>}
            </div>
            <dl className="flex flex-col gap-3 border-t pt-4">
              <InfoRow label="Tiền phòng">{formatVND(b.roomAmount)}</InfoRow>
              {b.priceBreakdown.map((l, i) => (
                <p key={i} className="text-muted-foreground -mt-1 text-xs">
                  {formatHours(l.hours)} × {formatVND(l.unitPrice)} ({DAY_TYPE_SHORT[l.dayType]},{' '}
                  {l.from}–{l.to})
                </p>
              ))}
              <InfoRow label="Đồ ăn uống">{formatVND(fnb)}</InfoRow>
              {discount > 0 && (
                <InfoRow label={`Giảm giá (${voucher?.code})`}>
                  <span className="text-room-available">−{formatVND(discount)}</span>
                </InfoRow>
              )}
            </dl>
            <div className="flex items-baseline justify-between border-t pt-4">
              <span className="text-muted-foreground text-sm">Tổng cộng</span>
              <span className="text-link text-[28px] leading-9 font-bold">{formatVND(total)}</span>
            </div>
            <Button
              className="w-full"
              onClick={onConfirm}
              disabled={confirm.isPending || setItems.isPending || !agree}
            >
              {confirm.isPending ? 'Đang xử lý…' : 'Xác nhận đặt phòng'}
            </Button>
            <p className="text-muted-foreground text-xs">
              {method === 'VNPAY'
                ? 'Bạn sẽ được chuyển tới cổng VNPay để thanh toán.'
                : 'Đơn được xác nhận ngay, thanh toán khi đến quầy.'}
            </p>
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmRelease}
        onOpenChange={setConfirmRelease}
        title="Bỏ giữ chỗ?"
        description="Phòng sẽ được mở lại cho người khác ngay lập tức."
        confirmLabel="Bỏ giữ chỗ"
        destructive
        loading={release.isPending}
        onConfirm={() =>
          release.mutate(id, {
            onSuccess: () => {
              toast.success('Đã bỏ giữ chỗ')
              navigate('/search', { replace: true })
            },
          })
        }
      />
    </div>
  )
}
