import { setupWorker } from 'msw/browser'
import { getDb, resetDb, save } from './db'
import { handlers } from './handlers'
import { sweep } from './logic'
import { publish } from './realtime'

export const worker = setupWorker(...handlers)

export async function startMockApi() {
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
    // Khi deploy dưới đường dẫn con (GitHub Pages) worker nằm ở <base>/mockServiceWorker.js
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })
  // Như HoldExpiryScheduler (BR-12): mỗi 30 giây quét giữ chỗ hết hạn
  setInterval(() => {
    const events = sweep(getDb())
    if (events.length) {
      save()
      events.forEach(publish)
    }
  }, 30_000)
}

export { resetDb }
