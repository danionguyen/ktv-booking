import { MOCK_CHANNEL } from '@lib/realtime'
import type { RoomStatusEvent } from '@/types/domain'

let channel: BroadcastChannel | null = null

/** Phát sự kiện như `RoomStatusPublisher` của backend — tới mọi tab đang mở. */
export function publish(event: RoomStatusEvent) {
  channel ??= new BroadcastChannel(MOCK_CHANNEL)
  channel.postMessage(event)
}
