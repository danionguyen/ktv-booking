import { Link } from 'react-router-dom'
import { Button } from '@components/ui/button'

export function HomePage() {
  return (
    <section className="flex flex-col items-start gap-4 py-12">
      <h1 className="text-4xl font-bold tracking-tight">Đặt phòng karaoke trong 1 phút</h1>
      <p className="text-muted-foreground max-w-xl text-lg">
        Xem phòng trống theo thời gian thực, giữ chỗ và thanh toán online.
      </p>
      <Button asChild size="lg">
        <Link to="/search">Tìm phòng ngay</Link>
      </Button>
    </section>
  )
}
