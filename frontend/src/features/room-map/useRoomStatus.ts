import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { subscribeRoomStatus } from '@lib/realtime'
import type { RoomStatusEvent } from '@/types/domain'

/**
 * Nghe sự kiện trạng thái phòng của chi nhánh (FD-ROM-03): refetch snapshot + kết quả tìm phòng,
 * và trả về các phòng vừa đổi để hiệu ứng nhấp nháy.
 */
export function useRoomStatus(
  branchId: number | undefined,
  onEvent?: (e: RoomStatusEvent) => void,
) {
  const qc = useQueryClient()
  const [flashing, setFlashing] = useState<Set<number>>(new Set())
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    if (!branchId) return
    const timers: ReturnType<typeof setTimeout>[] = []
    const refetch = () => {
      void qc.invalidateQueries({ queryKey: ['room-map', branchId] })
      void qc.invalidateQueries({ queryKey: ['availability'] })
      void qc.invalidateQueries({ queryKey: ['staff', 'timeline'] })
    }
    const unsubscribe = subscribeRoomStatus(branchId, {
      onConnect: refetch,
      onEvent: (event) => {
        refetch()
        onEventRef.current?.(event)
        setFlashing((s) => new Set(s).add(event.roomId))
        timers.push(
          setTimeout(
            () =>
              setFlashing((s) => {
                const next = new Set(s)
                next.delete(event.roomId)
                return next
              }),
            2000,
          ),
        )
      },
    })
    return () => {
      unsubscribe()
      timers.forEach(clearTimeout)
    }
  }, [branchId, qc])

  return { flashing }
}
