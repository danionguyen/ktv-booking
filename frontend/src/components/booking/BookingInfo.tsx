import type { ReactNode } from 'react'
import type { Booking } from '@/types/domain'
import { InfoRow } from '@components/InfoRow'
import { formatDate, formatTime } from '@utils/format'

/** Thông tin chính của một đơn dạng danh sách nhãn / giá trị (SCR-C09, C12, S03). */
export function BookingInfo({ booking, extra }: { booking: Booking; extra?: ReactNode }) {
  return (
    <dl className="flex flex-col gap-4">
      <InfoRow label="Mã đơn">{booking.code}</InfoRow>
      <InfoRow label="Chi nhánh">{booking.branch.name}</InfoRow>
      <InfoRow label="Phòng">
        {booking.room.code} – {booking.room.type} · tối đa {booking.room.capacity} người
      </InfoRow>
      <InfoRow label="Thời gian">
        {formatDate(booking.startTime)} {formatTime(booking.startTime)} –{' '}
        {formatTime(booking.endTime)}
      </InfoRow>
      <InfoRow label="Số người">{booking.people}</InfoRow>
      {extra}
    </dl>
  )
}
