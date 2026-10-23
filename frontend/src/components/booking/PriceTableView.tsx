import { useState } from 'react'
import type { PriceTable } from '@/types/domain'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@components/ui/table'
import { Segmented } from '@components/Segmented'
import { formatVND } from '@utils/format'
import { priceAt } from '@utils/price'

/**
 * Bảng giá như Figma SCR-C06: tab theo loại phòng, hàng = khung giờ ngày thường,
 * cột = loại ngày (khung "cả ngày" của cuối tuần / ngày lễ lặp lại ở mọi hàng).
 */
export function PriceTableView({
  table,
  title = 'Bảng giá',
  roomTypeId,
}: {
  table: PriceTable
  title?: string
  /** Chỉ hiện một loại phòng (trang chi tiết phòng), ẩn nút chọn loại. */
  roomTypeId?: number
}) {
  const [picked, setTypeId] = useState(String(table.roomTypes[0]?.roomType.id ?? ''))
  const typeId = roomTypeId !== undefined ? String(roomTypeId) : picked
  const rules = table.roomTypes.find((t) => String(t.roomType.id) === typeId)?.rules ?? []
  const weekday = rules
    .filter((r) => r.dayType === 'WEEKDAY')
    .sort((a, b) => a.startHour.localeCompare(b.startHour))
  const rows = weekday.length ? weekday : rules.slice(0, 1)

  return (
    <section className="bg-card rounded-xl border p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{title}</h2>
        {roomTypeId === undefined && (
          <Segmented
            value={typeId}
            onChange={setTypeId}
            options={table.roomTypes.map(({ roomType }) => ({
              value: String(roomType.id),
              label: roomType.name,
            }))}
          />
        )}
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Khung giờ</TableHead>
              <TableHead className="text-right">T2 – T6</TableHead>
              <TableHead className="text-right">T7, CN</TableHead>
              <TableHead className="text-right">Ngày lễ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.startHour}>
                <TableCell>
                  {row.startHour} – {row.endHour}
                </TableCell>
                {(['WEEKDAY', 'WEEKEND', 'HOLIDAY'] as const).map((d) => {
                  const price = priceAt(rules, d, row.startHour)
                  return (
                    <TableCell key={d} className="text-right tabular-nums">
                      {price ? formatVND(price) : '—'}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-muted-foreground mt-3 text-xs">
        Đơn giá / giờ. Một lượt đặt có thể trải qua nhiều khung giờ; giá được chốt tại thời điểm
        đặt.
      </p>
    </section>
  )
}
