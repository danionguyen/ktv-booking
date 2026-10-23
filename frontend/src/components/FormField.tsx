import type { ReactNode } from 'react'
import type { FieldError as RHFFieldError } from 'react-hook-form'
import { Field, FieldDescription, FieldError, FieldLabel } from '@components/ui/field'

interface FormFieldProps {
  label: string
  htmlFor: string
  error?: RHFFieldError
  description?: ReactNode
  children: ReactNode
  className?: string
}

/** Nhãn + control + lỗi theo shadcn Field, nối với react-hook-form qua `error`. */
export function FormField({
  label,
  htmlFor,
  error,
  description,
  children,
  className,
}: FormFieldProps) {
  return (
    <Field data-invalid={!!error} className={className}>
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      {children}
      {description && !error && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError>{error.message}</FieldError>}
    </Field>
  )
}
