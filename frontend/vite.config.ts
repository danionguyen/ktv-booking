/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const src = fileURLToPath(new URL('./src', import.meta.url))

export default defineConfig({
  // GitHub Pages phục vụ dưới /<tên-repo>/ → build với BASE_PATH=/ktv-booking/
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    // @/x → src/x, @api/x → src/api/x, ... (giữ đồng bộ với "paths" trong tsconfig)
    alias: [
      {
        find: /^@(api|components|features|hooks|layouts|lib|mocks|pages|routes|stores|utils)\//,
        replacement: `${src}/$1/`,
      },
      { find: /^@\//, replacement: `${src}/` },
    ],
  },
  // sockjs-client tham chiếu biến `global` của Node
  define: { global: 'globalThis' },
  server: { port: 5173 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
