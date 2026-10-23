import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MOCK_ENABLED } from '@lib/env'
import App from './App'
import './index.css'

async function bootstrap() {
  // Bật MSW trước khi render để request đầu tiên (refresh session) đã được mock
  if (MOCK_ENABLED) {
    const { startMockApi } = await import('@mocks/browser')
    await startMockApi()
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
