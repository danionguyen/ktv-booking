import { useState } from 'react'
import { StarRating } from '@components/StarRating'
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
import { Textarea } from '@components/ui/textarea'

const LABELS = ['', 'Rất tệ', 'Chưa tốt', 'Bình thường', 'Tốt', 'Rất tốt']

interface ReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** vd. "phòng P201 – VIP" */
  roomLabel: string
  /** vd. "KTV Cầu Giấy · hát ngày 28/10/2026" */
  subtitle?: string
  loading: boolean
  onSubmit: (rating: number, comment: string) => void
}

/** SCR-C12c */
export function ReviewDialog({
  open,
  onOpenChange,
  roomLabel,
  subtitle,
  loading,
  onSubmit,
}: ReviewDialogProps) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Đánh giá {roomLabel}</DialogTitle>
          {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
        </DialogHeader>
        <div className="bg-background flex flex-col items-center gap-2 rounded-xl p-5">
          <StarRating value={rating} onChange={setRating} size="lg" />
          <span className="text-room-held text-sm font-semibold">{LABELS[rating]}</span>
        </div>
        <Field>
          <FieldLabel htmlFor="review-comment">Nhận xét (tùy chọn)</FieldLabel>
          <Textarea
            id="review-comment"
            placeholder="Chia sẻ trải nghiệm của bạn (âm thanh, phục vụ, đồ ăn…)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
          />
          <p className="text-muted-foreground text-xs">
            {comment.length}/1000 · Có thể đánh giá trong 7 ngày sau khi hát xong
          </p>
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Để sau
          </Button>
          <Button disabled={loading} onClick={() => onSubmit(rating, comment.trim())}>
            {loading ? 'Đang gửi…' : 'Gửi đánh giá'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
