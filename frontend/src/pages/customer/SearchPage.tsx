import { SearchXIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { HoldPanel, type HoldTarget } from '@components/booking/HoldPanel'
import { RoomCard } from '@components/booking/RoomCard'
import { SearchForm } from '@components/booking/SearchForm'
import { Notice } from '@components/Notice'
import { Segmented } from '@components/Segmented'
import { EmptyState, ErrorState, LoadingState } from '@components/states'
import { Tag } from '@components/Tag'
import { Button } from '@components/ui/button'
import { Popover, PopoverAnchor, PopoverContent } from '@components/ui/popover'
import { RoomCell } from '@features/room-map/RoomCell'
import { StatusLegend } from '@features/room-map/StatusLegend'
import { useRoomStatus } from '@features/room-map/useRoomStatus'
import { useAvailability, useBranches, useRoomMap } from '@hooks/queries/useCatalog'
import { useHoldRoom } from '@hooks/useHoldRoom'
import { formatDateLong, formatTime, formatVND } from '@utils/format'
import {
  defaultSearch,
  endIsoOf,
  parseSearch,
  startIsoOf,
  toSearchParams,
  type SearchValues,
} from '@utils/search'
import { vn } from '@utils/time'
import type { MapRoom } from '@/types/domain'

type View = 'map' | 'grid'

/** SCR-C07a (sơ đồ theo loại phòng, real-time) và SCR-C07b (lưới phòng trống). */
export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const branches = useBranches()
  const view: View = params.get('view') === 'grid' ? 'grid' : 'map'

  // Điền giá trị mặc định cho tham số còn thiếu
  const values = useMemo<SearchValues | null>(() => {
    if (!branches.data?.length) return null
    const parsed = parseSearch(params)
    const branch = branches.data.find((b) => b.id === parsed.branchId) ?? branches.data[0]
    const fallback = defaultSearch(branch)
    return {
      branchId: branch.id,
      date: parsed.date ?? fallback.date,
      time: parsed.time ?? fallback.time,
      hours: parsed.hours ?? fallback.hours,
      people: parsed.people ?? fallback.people,
    }
  }, [branches.data, params])

  const branch = branches.data?.find((b) => b.id === values?.branchId)
  const start = values && branch ? startIsoOf(values, branch) : undefined
  const end = values && branch ? endIsoOf(values, branch) : undefined
  const stale = !!start && vn(start).isBefore(vn().add(30, 'minute'))

  const map = useRoomMap(
    view === 'map' && !stale ? values?.branchId : undefined,
    start && end ? { start, end } : undefined,
  )
  // Cả 2 chế độ đều cần giá theo loại phòng + số phòng trống
  const availability = useAvailability(
    values && start && !stale
      ? { branchId: values.branchId, start, hours: values.hours, people: values.people }
      : null,
  )
  const [target, setTarget] = useState<HoldTarget | null>(null)
  const { holdRoom, isPending } = useHoldRoom()

  const { flashing } = useRoomStatus(values?.branchId, (e) => {
    if (target && e.roomId === target.roomId && e.event === 'HOLD') {
      toast.warning(`Phòng ${target.code} vừa được người khác giữ`)
    }
  })

  // Đồng bộ trạng thái phòng đang chọn với dữ liệu mới nhất
  useEffect(() => {
    if (!target) return
    const live = map.data?.rooms.find((r) => r.id === target.roomId)?.status
    if (live && (live === 'AVAILABLE') !== target.available)
      setTarget({ ...target, available: live === 'AVAILABLE' })
  }, [map.data, target])

  const priceByType = useMemo(
    () => new Map(availability.data?.groups.map((g) => [g.roomType.name, g.quote.total])),
    [availability.data],
  )
  // Nhóm theo loại phòng, giữ thứ tự xuất hiện trên sơ đồ
  const groups = useMemo(() => {
    const m = new Map<string, MapRoom[]>()
    for (const r of map.data?.rooms ?? []) m.set(r.type, [...(m.get(r.type) ?? []), r])
    return [...m.entries()]
  }, [map.data])

  const submit = (v: SearchValues) => setParams(toSearchParams(v, { view }), { replace: true })
  const setView = (v: View) => {
    const next = new URLSearchParams(params)
    next.set('view', v)
    setParams(next, { replace: true })
  }

  if (branches.isPending) return <LoadingState />
  if (branches.isError)
    return <ErrorState error={branches.error} onRetry={() => void branches.refetch()} />
  if (!values || !branch || !start || !end) return null

  const freeRooms =
    availability.data?.groups.flatMap((g) =>
      g.rooms.filter((r) => r.available).map((r) => ({ ...r, group: g })),
    ) ?? []
  const roomUrl = (roomId: number) =>
    `/rooms/${roomId}?start=${encodeURIComponent(start)}&hours=${values.hours}&people=${values.people}`

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-card rounded-xl border p-5">
        <SearchForm
          branches={branches.data}
          initial={values}
          onSubmit={submit}
          layout="inline"
          autoSubmit
        />
      </section>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">
            {availability.data ? `${freeRooms.length} phòng trống phù hợp` : 'Đang tìm phòng…'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {formatDateLong(start)} · {formatTime(start)} – {formatTime(end)} · {values.people}{' '}
            người · giá dự tính đã gồm các khung giờ
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Tag color="green">● Trực tiếp</Tag>
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'grid', label: 'Lưới' },
              { value: 'map', label: 'Sơ đồ' },
            ]}
          />
        </div>
      </div>

      {availability.data && availability.data.suggestions.length > 0 && (
        <Notice tone="warning">
          <div className="flex flex-wrap items-center gap-2">
            <span>Hết phòng khung giờ này. Gợi ý:</span>
            {availability.data.suggestions.map((s) => (
              <Button
                key={s.start}
                size="sm"
                variant="outline"
                onClick={() => submit({ ...values, time: formatTime(s.start) })}
              >
                {formatTime(s.start)} – {formatTime(s.end)}
              </Button>
            ))}
          </div>
        </Notice>
      )}

      {stale ? (
        <EmptyState
          icon={SearchXIcon}
          title="Khung giờ này đã qua"
          description="Giờ bắt đầu phải sau hiện tại ít nhất 30 phút. Hãy chọn lại giờ."
        />
      ) : view === 'map' ? (
        map.isPending ? (
          <LoadingState rows={1} className="[&>*]:h-96" />
        ) : map.isError ? (
          <ErrorState error={map.error} onRetry={() => void map.refetch()} />
        ) : (
          <section className="bg-card flex flex-col gap-5 rounded-xl border p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Sơ đồ mặt bằng · {branch.name}</h2>
              <StatusLegend />
            </div>
            {groups.map(([type, rooms]) => (
              <div key={type} className="bg-background flex flex-col gap-3 rounded-xl p-4">
                <h3 className="text-sm font-semibold">
                  {type} ({rooms[0].capacity} người)
                </h3>
                <div className="flex flex-wrap gap-4">
                  {rooms.map((r) => {
                    const price = priceByType.get(r.type)
                    const selectable = r.status === 'AVAILABLE' && r.capacity >= values.people
                    const open = target?.roomId === r.id
                    return (
                      <Popover key={r.id} open={open} onOpenChange={(o) => !o && setTarget(null)}>
                        <PopoverAnchor asChild>
                          <RoomCell
                            room={r}
                            selected={open}
                            flashing={flashing.has(r.id)}
                            disabled={!selectable}
                            note={price !== undefined ? formatVND(price) : undefined}
                            className="h-[95px] w-[150px]"
                            onClick={() =>
                              setTarget({
                                roomId: r.id,
                                code: r.code,
                                type: r.type,
                                capacity: r.capacity,
                                available: true,
                              })
                            }
                          />
                        </PopoverAnchor>
                        <PopoverContent side="right" align="start" className="w-[268px] p-4">
                          {open && (
                            <HoldPanel
                              target={target}
                              start={start}
                              end={end}
                              hours={values.hours}
                              people={values.people}
                              pending={isPending}
                              onHold={() =>
                                holdRoom({
                                  roomId: target.roomId,
                                  startTime: start,
                                  hours: values.hours,
                                  people: values.people,
                                })
                              }
                            />
                          )}
                        </PopoverContent>
                      </Popover>
                    )
                  })}
                </div>
              </div>
            ))}
            <p className="text-muted-foreground text-xs">
              Bấm vào phòng màu xanh để giữ chỗ. Phòng nhỏ hơn {values.people} người bị làm mờ.
            </p>
          </section>
        )
      ) : availability.isPending ? (
        <LoadingState />
      ) : availability.isError ? (
        <ErrorState error={availability.error} onRetry={() => void availability.refetch()} />
      ) : freeRooms.length === 0 ? (
        <EmptyState
          icon={SearchXIcon}
          title={`Không còn phòng trống cho ${values.people} người`}
          description="Hãy đổi khung giờ, giảm số người hoặc chọn chi nhánh khác."
        />
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {freeRooms.map((r) => (
            <RoomCard
              key={r.id}
              code={r.code}
              type={r.group.roomType.name}
              capacity={r.group.roomType.capacity}
              total={r.group.quote.total}
              hours={values.hours}
              to={roomUrl(r.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
