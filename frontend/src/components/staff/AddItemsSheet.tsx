import { useState } from 'react'
import { toast } from 'sonner'
import { MenuPicker } from '@components/MenuPicker'
import { Button } from '@components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@components/ui/sheet'
import { useMenu } from '@hooks/queries/useCatalog'
import { useAddItem } from '@hooks/queries/useStaff'
import { formatVND } from '@utils/format'

interface AddItemsSheetProps {
  bookingId: number
  roomCode: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Gọi thêm món trong lúc hát (FD-OPS-04). */
export function AddItemsSheet({ bookingId, roomCode, open, onOpenChange }: AddItemsSheetProps) {
  const menu = useMenu({ available: true })
  const addItem = useAddItem(bookingId)
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const [saving, setSaving] = useState(false)
  const picked = Object.entries(quantities).filter(([, q]) => q > 0)
  const total = picked.reduce(
    (s, [id, q]) => s + (menu.data?.find((m) => m.id === Number(id))?.price ?? 0) * q,
    0,
  )

  const submit = async () => {
    setSaving(true)
    try {
      for (const [id, quantity] of picked)
        await addItem.mutateAsync({ menuItemId: Number(id), quantity })
      toast.success(`Đã thêm ${picked.length} món cho phòng ${roomCode}`)
      setQuantities({})
      onOpenChange(false)
    } catch {
      // lỗi đã được toast bởi MutationCache
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Gọi thêm món · {roomCode}</SheetTitle>
          <SheetDescription>Tính vào hóa đơn, thanh toán khi check-out.</SheetDescription>
        </SheetHeader>
        <div className="px-4">
          {menu.data && (
            <MenuPicker
              items={menu.data}
              quantities={quantities}
              onChange={(id, q) => setQuantities((s) => ({ ...s, [id]: q }))}
            />
          )}
        </div>
        <SheetFooter>
          <Button disabled={!picked.length || saving} onClick={() => void submit()}>
            {saving ? 'Đang thêm…' : `Thêm ${picked.length} món · ${formatVND(total)}`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
