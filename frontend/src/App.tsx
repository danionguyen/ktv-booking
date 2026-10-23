import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { queryClient } from '@api/queryClient'
import { MockToolbar } from '@components/MockToolbar'
import { Toaster } from '@components/ui/sonner'
import { TooltipProvider } from '@components/ui/tooltip'
import { useSessionBootstrap } from '@hooks/useSessionBootstrap'
import { MOCK_ENABLED } from '@lib/env'
import { router } from '@routes/router'

export default function App() {
  useSessionBootstrap()
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <RouterProvider router={router} />
        {MOCK_ENABLED && <MockToolbar />}
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
