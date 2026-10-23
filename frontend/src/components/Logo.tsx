import { MicIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@lib/utils'

interface LogoProps {
  className?: string
  to?: string
  /** `brand`: ô tối + chữ lớn trên panel thương hiệu (SCR-C01..C04); `sider`: trên sidebar tối. */
  variant?: 'default' | 'brand' | 'sider'
}

/** Logo như Figma: ô vuông gradient thương hiệu + icon mic + chữ "KTV Booking". */
export function Logo({ className, to = '/', variant = 'default' }: LogoProps) {
  const brand = variant === 'brand'
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center font-semibold',
        brand ? 'text-on-hero gap-2.5 text-xl' : 'gap-2 text-base',
        className,
      )}
    >
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-lg',
          brand
            ? 'bg-card text-primary size-8'
            : 'bg-grad-primary text-primary-foreground size-[30px]',
        )}
      >
        <MicIcon className={brand ? 'size-5' : 'size-[18px]'} />
      </span>
      KTV Booking
    </Link>
  )
}
