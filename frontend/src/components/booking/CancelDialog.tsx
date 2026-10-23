import { useEffect, useState } from 'react'
import { Notice } from '@components/Notice'
import { Button } from '@components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog'
import { Field, FieldLabel } from '@components/ui/field'
import { Input } from '@components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select'
import { formatVND } from '@utils/format'

const REASONS = ['Đổi lịch', 'Bận việc đột xuất', 'Đặt nhầm phòng / giờ', 'Khác']
const OTHER = 'Khác'

interface CancelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** % hoàn theo chính sách; null = admin hủy (không hiện thông tin hoàn tiền). */
  refundPercent: number | null
  paidAmount: number
  /** vd. "KTV-20261028-0007 · P201 – VIP · 28/10/2026 19:00" */
  subtitle?: string
  loading: boolean
  onConfirm: (reason: string) => void
}

/** SCR-C12b — xác nhận hủy, chọn lý do (bắt buộc). */
export function CancelDialog({
  open,
  onOpenChange,
  refundPercent,
  paidAmount,
  subtitle,
  loading,
  onConfirm,
}: CancelDialogProps) {
  const [choice, setChoice] = useState(REASONS[0])
  const [other, setOther] = useState('')
  useEffect(() => {
    if (open) {
      setChoice(REASONS[0])
      setOther('')
    }
  }, [open])
  const reason = choice === OTHER ? other.trim() : choice
  const refund = refundPercent ? Math.round((paidAmount * refundPercent) / 100 / 1000) * 1000 : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hủy đặt phòng?</DialogTitle>
          <DialogDescription>
            {subtitle ?? 'Phòng sẽ được mở lại cho khách khác ngay sau khi hủy.'}
          </DialogDescription>
        </DialogHeader>
        {refundPercent !== null && (
          <Notice tone="info">
            {paidAmount > 0
              ? refundPercent > 0
                ? `Bạn sẽ được hoàn ${formatVND(refund)} (${refundPercent}%) về tài khoản VNPay trong 3–5 ngày làm việc.`
                : 'Theo chính sách, đơn hủy lúc này không được hoàn tiền.'
              : 'Đơn chưa thanh toán trước nên không phát sinh hoàn tiền.'}
          </Notice>
        )}
        <Field>
          <FieldLabel htmlFor="cancel-reason">Lý do *</FieldLabel>
          <Select value={choice} onValueChange={setChoice}>
            <SelectTrigger id="cancel-reason" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REASONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {choice === OTHER && (
          <Field>
            <FieldLabel htmlFor="cancel-other">Lý do khác</FieldLabel>
            <Input
              id="cancel-other"
              value={other}
              onChange={(e) => setOther(e.target.value)}
              maxLength={255}
              autoFocus
            />
            <p className="text-muted-foreground text-xs">{other.length}/255</p>
          </Field>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Đóng
          </Button>
          <Button
            variant="destructive"
            disabled={loading || !reason}
            onClick={() => onConfirm(reason)}
          >
            {loading ? 'Đang hủy…' : 'Xác nhận hủy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
