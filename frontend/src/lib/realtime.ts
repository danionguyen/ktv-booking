import type { RoomStatusEvent } from '@/types/domain'
import { MOCK_ENABLED, WS_URL } from './env'

/** Kênh dùng khi chạy mock: mọi tab cùng origin nhận được sự kiện (demo 2 trình duyệt cạnh nhau). */
export const MOCK_CHANNEL = 'ktv-room-status'

interface Subscription {
  onEvent: (event: RoomStatusEvent) => void
  /** Gọi khi (re)connect — nơi refetch snapshot để không lỡ sự kiện. */
  onConnect?: () => void
}

/** Theo dõi `/topic/branches/{branchId}/rooms`. Trả về hàm hủy đăng ký. */
export function subscribeRoomStatus(branchId: number, { onEvent, onConnect }: Subscription) {
  if (MOCK_ENABLED) {
    const channel = new BroadcastChannel(MOCK_CHANNEL)
    channel.onmessage = (msg: MessageEvent<RoomStatusEvent>) => {
      if (msg.data.branchId === branchId) onEvent(msg.data)
    }
    onConnect?.()
    return () => channel.close()
  }

  let cancelled = false
  let deactivate: (() => void) | undefined
  void Promise.all([import('@stomp/stompjs'), import('sockjs-client')]).then(
    ([{ Client }, { default: SockJS }]) => {
      if (cancelled) return
      const client = new Client({
        webSocketFactory: () => new SockJS(WS_URL),
        reconnectDelay: 3000,
      })
      client.onConnect = () => {
        onConnect?.()
        client.subscribe(`/topic/branches/${branchId}/rooms`, (msg) =>
          onEvent({ ...(JSON.parse(msg.body) as RoomStatusEvent), branchId }),
        )
      }
      client.activate()
      deactivate = () => void client.deactivate()
    },
  )
  return () => {
    cancelled = true
    deactivate?.()
  }
}
