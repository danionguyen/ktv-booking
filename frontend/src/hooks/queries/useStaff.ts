import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@api/keys'
import { staffApi } from '@api/staff'
import type { Booking } from '@/types/domain'

export const useTimeline = (date: string, branchId?: number) =>
  useQuery({
    queryKey: qk.timeline(date, branchId),
    queryFn: () => staffApi.timeline(date, branchId),
    refetchInterval: 60_000,
  })

export const useStaffBooking = (id: number) =>
  useQuery({ queryKey: qk.staffBooking(id), queryFn: () => staffApi.booking(id), retry: false })

export const useExtendOptions = (id: number, enabled: boolean) =>
  useQuery({
    queryKey: qk.extendOptions(id),
    queryFn: () => staffApi.extendOptions(id),
    enabled,
    staleTime: 0,
  })

export const useInvoice = (id: number) =>
  useQuery({ queryKey: qk.invoice(id), queryFn: () => staffApi.invoice(id), staleTime: 0 })

/** Cập nhật cache chi tiết đơn + làm mới timeline/sơ đồ sau thao tác tại quầy. */
function useStaffUpdate() {
  const qc = useQueryClient()
  return (b: Booking) => {
    qc.setQueryData(qk.staffBooking(b.id), b)
    void qc.invalidateQueries({ queryKey: ['staff', 'timeline'] })
    void qc.invalidateQueries({ queryKey: qk.invoice(b.id) })
    void qc.invalidateQueries({ queryKey: ['room-map'] })
  }
}

export function useWalkIn() {
  const update = useStaffUpdate()
  return useMutation({ mutationFn: staffApi.walkIn, onSuccess: update })
}

export function useCheckIn(id: number) {
  const update = useStaffUpdate()
  return useMutation({ mutationFn: () => staffApi.checkIn(id), onSuccess: update })
}

export function useAddItem(id: number) {
  const update = useStaffUpdate()
  return useMutation({
    mutationFn: ({ menuItemId, quantity }: { menuItemId: number; quantity: number }) =>
      staffApi.addItem(id, menuItemId, quantity),
    onSuccess: update,
  })
}

export function useRemoveItem(id: number) {
  const update = useStaffUpdate()
  return useMutation({
    mutationFn: (itemId: number) => staffApi.removeItem(id, itemId),
    onSuccess: update,
  })
}

export function useExtend(id: number) {
  const update = useStaffUpdate()
  return useMutation({
    mutationFn: (minutes: number) => staffApi.extend(id, minutes),
    onSuccess: update,
  })
}

export function useCheckOut(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (receivedAmount: number) => staffApi.checkOut(id, receivedAmount),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.staffBooking(id) })
      void qc.invalidateQueries({ queryKey: qk.invoice(id) })
      void qc.invalidateQueries({ queryKey: ['staff', 'timeline'] })
      void qc.invalidateQueries({ queryKey: ['room-map'] })
    },
  })
}
