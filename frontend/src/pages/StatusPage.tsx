import { Link } from 'react-router-dom'
import { Button } from '@components/ui/button'

export function StatusPage({ code, message }: { code: string; message: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <p className="text-primary text-6xl font-bold">{code}</p>
      <p className="text-muted-foreground">{message}</p>
      <Button asChild variant="outline">
        <Link to="/">Về trang chủ</Link>
      </Button>
    </div>
  )
}
