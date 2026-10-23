import { DatabaseIcon, ExternalLinkIcon, RotateCcwIcon } from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog } from '@components/ConfirmDialog'
import { Button } from '@components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover'
import { useAuthStore } from '@stores/authStore'

/** Chỉ hiện khi VITE_ENABLE_MOCK=true: reset dữ liệu giả lập, mở tab thứ 2 để demo real-time. */
export function MockToolbar() {
  const [confirm, setConfirm] = useState(false)
  return (
    <div className="fixed bottom-4 left-4 z-50 print:hidden">
      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" className="bg-background/90 shadow-md backdrop-blur">
            <DatabaseIcon /> Mock API
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 text-sm">
          <p className="font-semibold">Đang chạy dữ liệu giả lập</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Mọi API được MSW trả lời trong trình duyệt. Dữ liệu lưu ở localStorage, dùng chung giữa
            các tab — mở thêm tab để thử sơ đồ phòng real-time.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(window.location.href, '_blank')}
            >
              <ExternalLinkIcon /> Mở tab mới
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setConfirm(true)}>
              <RotateCcwIcon /> Reset dữ liệu mẫu
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Reset dữ liệu mẫu?"
        description="Mọi đơn, tài khoản, thay đổi đã tạo sẽ mất và dữ liệu mẫu được tạo lại theo ngày hôm nay. Bạn sẽ bị đăng xuất."
        destructive
        confirmLabel="Reset"
        onConfirm={async () => {
          const { resetDb } = await import('@mocks/db')
          resetDb()
          localStorage.removeItem('ktv-mock-refresh-user')
          sessionStorage.removeItem('ktv-mock-refresh-user')
          useAuthStore.getState().clearSession()
          window.location.assign(import.meta.env.BASE_URL)
        }}
      />
    </div>
  )
}
