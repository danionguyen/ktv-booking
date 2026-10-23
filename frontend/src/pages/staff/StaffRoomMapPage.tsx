import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@components/PageHeader'
import { Segmented } from '@components/Segmented'
import { BranchSwitcher } from '@components/staff/BranchSwitcher'
import { WalkInDialog } from '@components/staff/WalkInDialog'
import { ErrorState, LoadingState } from '@components/states'
import { Button } from '@components/ui/button'
import { RoomMap } from '@features/room-map/RoomMap'
import { StatusLegend } from '@features/room-map/StatusLegend'
import { useRoomStatus } from '@features/room-map/useRoomStatus'
import { useRoomMap } from '@hooks/queries/useCatalog'
import { useTimeline } from '@hooks/queries/useStaff'
import { useStaffBranch } from '@hooks/useStaffBranch'
import { formatDateLong } from '@utils/format'
import { vn } from '@utils/time'

/** Sơ đồ trạng thái hiện tại: bấm phòng trống → khách vãng lai, phòng có khách → mở đơn. */
export function StaffRoomMapPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { branchId } = useStaffBranch()
  const map = useRoomMap(branchId)
  const today =
    vn().hour() < 6 ? vn().subtract(1, 'day').format('YYYY-MM-DD') : vn().format('YYYY-MM-DD')
  const timeline = useTimeline(today, branchId)
  const { flashing } = useRoomStatus(branchId)
  const [walkInRoom, setWalkInRoom] = useState<number | 'any' | null>(null)

  /** Đơn đang hát / sắp tới gần nhất của phòng. */
  const currentBooking = (roomId: number) => {
    const now = vn()
    return timeline.data?.rooms
      .find((r) => r.id === roomId)
      ?.bookings.filter((b) =>
        ['CHECKED_IN', 'CONFIRMED', 'HOLD', 'PENDING_PAYMENT'].includes(b.status),
      )
      .filter((b) => vn(b.end).isAfter(now))
      .sort((a, b) => a.start.localeCompare(b.start))[0]
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sơ đồ phòng"
        breadcrumb={
          map.data ? `${map.data.branch.name} · ${formatDateLong(vn().toISOString())}` : undefined
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <BranchSwitcher />
        <p className="text-muted-foreground flex-1 text-sm">
          Trạng thái hiện tại, tự cập nhật theo thời gian thực. Bấm phòng trống để nhận khách, phòng
          có khách để mở đơn.
        </p>
        <Segmented
          value="map"
          options={[
            { value: 'timeline', label: 'Timeline', to: `/staff?${params.toString()}` },
            { value: 'map', label: 'Sơ đồ' },
          ]}
        />
        <Button onClick={() => setWalkInRoom('any')}>+ Khách vãng lai</Button>
      </div>
      {map.isPending ? (
        <LoadingState rows={1} className="[&>*]:h-96" />
      ) : map.isError ? (
        <ErrorState error={map.error} onRetry={() => void map.refetch()} />
      ) : (
        <section className="bg-card flex flex-col gap-4 rounded-xl border p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Sơ đồ mặt bằng · {map.data.branch.name}</h2>
            <StatusLegend />
          </div>
          <RoomMap
            snapshot={map.data}
            flashing={flashing}
            isSelectable={(r) => r.status !== 'MAINTENANCE'}
            onSelect={(r) => {
              const booking = currentBooking(r.id)
              if (r.status === 'AVAILABLE' && !booking?.status.match(/CHECKED_IN/))
                setWalkInRoom(r.id)
              else if (booking) navigate(`/staff/bookings/${booking.id}`)
            }}
          />
        </section>
      )}
      {branchId && (
        <WalkInDialog
          open={walkInRoom !== null}
          onOpenChange={(o) => !o && setWalkInRoom(null)}
          branchId={branchId}
          roomId={typeof walkInRoom === 'number' ? walkInRoom : undefined}
        />
      )}
    </div>
  )
}
