import type { BookingStatus } from '@/types/domain'
import { Tag } from '@components/Tag'
import { BOOKING_STATUS_COLOR, BOOKING_STATUS_LABEL } from '@utils/booking'

export function BookingStatusBadge({
  status,
  className,
}: {
  status: BookingStatus
  className?: string
}) {
  return (
    <Tag color={BOOKING_STATUS_COLOR[status]} className={className}>
      {BOOKING_STATUS_LABEL[status]}
    </Tag>
  )
}
