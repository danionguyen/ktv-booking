import { Spinner } from './ui/spinner'

export function FullPageSpinner() {
  return (
    <div className="text-primary flex min-h-screen items-center justify-center">
      <Spinner className="size-8" />
    </div>
  )
}
