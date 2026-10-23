import type { ReactNode } from 'react'
import { Field, FieldLabel } from '@components/ui/field'
import { cn } from '@lib/utils'

/** Ô lọc có nhãn phía trên (thanh lọc A05, A09, A10). */
export function FilterField({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string
  htmlFor: string
  children: ReactNode
  className?: string
}) {
  return (
    <Field className={cn('w-44', className)}>
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      {children}
    </Field>
  )
}
