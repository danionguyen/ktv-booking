import type { TooltipProps } from 'recharts'

/** Tooltip chung cho biểu đồ: nền popover, chữ theo token text (không dùng màu series). */
export function ChartTooltip({
  active,
  payload,
  label,
  formatLabel,
  formatValue,
}: TooltipProps<number, string> & {
  formatLabel: (l: string) => string
  formatValue: (v: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground">{formatLabel(String(label))}</p>
      <p className="text-sm font-semibold tabular-nums">{formatValue(Number(payload[0].value))}</p>
    </div>
  )
}
