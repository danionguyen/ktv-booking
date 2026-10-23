import { adminHandlers } from './admin'
import { authHandlers } from './auth'
import { bookingHandlers } from './bookings'
import { catalogHandlers } from './catalog'
import { staffHandlers } from './staff'
import { statsHandlers } from './stats'

export const handlers = [
  ...authHandlers,
  ...catalogHandlers,
  ...bookingHandlers,
  ...staffHandlers,
  ...adminHandlers,
  ...statsHandlers,
]
