import { CreditCardIcon, ShieldCheckIcon } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { formatVND } from '@utils/format'

/**
 * Cổng VNPay giả lập (chỉ dùng khi chạy mock): thay cho sandbox.vnpayment.vn,
 * trả về trang return với `vnp_ResponseCode` như VNPay thật.
 */
export function MockVnpayPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const amount = Number(params.get('amount') ?? 0)
  const txnRef = params.get('txnRef') ?? ''

  const finish = (responseCode: string) =>
    navigate(
      `/payment/result?${new URLSearchParams({
        vnp_TxnRef: txnRef,
        vnp_ResponseCode: responseCode,
        vnp_Amount: String(amount * 100),
      })}`,
      { replace: true },
    )

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b5ea8]/10 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 text-[#0b5ea8]">
            <CreditCardIcon /> <span className="text-lg font-bold">VNPAY</span>
            <span className="ml-auto rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Sandbox giả lập
            </span>
          </div>
          <CardTitle>Thanh toán đơn {params.get('code')}</CardTitle>
          <CardDescription>Chọn kết quả giao dịch để mô phỏng phản hồi từ VNPay.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="bg-muted rounded-lg p-4 text-center">
            <p className="text-muted-foreground text-sm">Số tiền</p>
            <p className="text-3xl font-bold">{formatVND(amount)}</p>
            <p className="text-muted-foreground mt-1 text-xs">Mã giao dịch: {txnRef}</p>
          </div>
          <Button
            size="lg"
            className="bg-[#0b5ea8] hover:bg-[#0b5ea8]/90"
            onClick={() => finish('00')}
          >
            <ShieldCheckIcon /> Thanh toán thành công
          </Button>
          <Button size="lg" variant="outline" onClick={() => finish('24')}>
            Hủy giao dịch
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
