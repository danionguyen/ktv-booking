import { MinusIcon, PlusIcon } from 'lucide-react'

interface QuantityStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  disabled?: boolean
  label?: string
}

/** Bộ tăng giảm số lượng (Figma Menu Item Card › Stepper: khung viền 84×32). */
export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = 99,
  disabled,
  label,
}: QuantityStepperProps) {
  const btn =
    'text-muted-foreground hover:text-foreground flex h-full w-7 items-center justify-center disabled:opacity-40 [&_svg]:size-3.5'
  return (
    <div
      className="bg-card inline-flex h-8 items-center rounded-lg border"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        className={btn}
        aria-label="Giảm"
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
      >
        <MinusIcon />
      </button>
      <span className="w-7 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        className={btn}
        aria-label="Tăng"
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
      >
        <PlusIcon />
      </button>
    </div>
  )
}
