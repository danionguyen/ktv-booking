/** Bật MSW + dữ liệu giả lập thay cho backend thật (xem src/mocks). */
export const MOCK_ENABLED = import.meta.env.VITE_ENABLE_MOCK === 'true'

export const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:8080/ws'
