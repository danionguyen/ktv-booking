import { ExternalLinkIcon, ImageIcon, PhoneIcon, UsersIcon } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PriceTableView } from '@components/booking/PriceTableView'
import { SearchForm } from '@components/booking/SearchForm'
import { ErrorState, LoadingState } from '@components/states'
import { Button } from '@components/ui/button'
import { Skeleton } from '@components/ui/skeleton'
import { useBranch, usePriceTable } from '@hooks/queries/useCatalog'
import { formatVND } from '@utils/format'
import { defaultSearch, toSearchParams } from '@utils/search'

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-right font-semibold">{children}</dd>
    </div>
  )
}

/** SCR-C06 */
export function BranchDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const branch = useBranch(id)
  const prices = usePriceTable(id)
  const initial = useMemo(() => (branch.data ? defaultSearch(branch.data) : null), [branch.data])

  if (branch.isPending) return <LoadingState />
  if (branch.isError)
    return <ErrorState error={branch.error} onRetry={() => void branch.refetch()} />
  if (!initial) return null
  const b = branch.data
  const overnight = b.closeTime <= b.openTime
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address)}`

  return (
    <div className="flex flex-col gap-6">
      <nav className="text-muted-foreground text-xs whitespace-pre" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-foreground">
          Trang chủ
        </Link>
        {'  /  '}
        <span>{b.name}</span>
      </nav>

      <div className="bg-secondary text-primary flex h-40 items-center justify-center rounded-[20px] sm:h-[260px]">
        <ImageIcon className="size-9" aria-hidden />
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] leading-9 font-bold">{b.name}</h1>
        <p className="text-muted-foreground text-sm">
          {b.roomCount} phòng · {b.roomTypes.length} loại phòng · mở cửa {b.openTime} –{' '}
          {b.closeTime}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="bg-card rounded-xl border p-6">
            <h2 className="mb-2 text-base font-semibold">Thông tin chi nhánh</h2>
            <dl>
              <InfoRow label="Địa chỉ">
                {b.address}{' '}
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-link ml-2 inline-flex items-center gap-0.5 hover:underline"
                >
                  Xem bản đồ <ExternalLinkIcon className="size-3.5" />
                </a>
              </InfoRow>
              <InfoRow label="Điện thoại">
                <a
                  href={`tel:${b.phone.replace(/\s/g, '')}`}
                  className="text-link inline-flex items-center gap-1 hover:underline"
                >
                  <PhoneIcon className="size-3.5" /> {b.phone}
                </a>
              </InfoRow>
              <InfoRow label="Giờ mở cửa">
                {b.openTime} – {b.closeTime}
                {overnight && ' (qua đêm)'}
              </InfoRow>
              <InfoRow label="Số phòng">
                {b.roomCount} phòng · {b.roomTypes.length} loại
              </InfoRow>
            </dl>
          </section>

          <section className="bg-card rounded-xl border p-6">
            <h2 className="mb-4 text-base font-semibold">Loại phòng</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {b.roomTypes.map((t) => (
                <article key={t.id} className="flex flex-col overflow-hidden rounded-xl border">
                  <div className="bg-secondary text-primary flex h-[150px] items-center justify-center">
                    <ImageIcon className="size-7" aria-hidden />
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-4">
                    <h3 className="text-base font-semibold">{t.name}</h3>
                    <p className="text-muted-foreground flex items-center gap-1 text-xs">
                      <UsersIcon className="size-3.5" /> Tối đa {t.capacity} người · {t.roomCount}{' '}
                      phòng
                    </p>
                    <p className="flex items-baseline gap-1 pt-2 pb-1">
                      <span className="text-link text-xl font-bold">{formatVND(t.minPrice)}</span>
                      <span className="text-muted-foreground text-xs">/ giờ (giá từ)</span>
                    </p>
                    <Button asChild variant="outline" className="mt-auto w-full">
                      <Link
                        to={`/search?${toSearchParams({ ...defaultSearch(b), people: Math.min(t.capacity, 4) }, { view: 'grid' })}`}
                      >
                        Xem phòng
                      </Link>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {prices.data ? (
            <PriceTableView table={prices.data} />
          ) : (
            <Skeleton className="h-48 rounded-xl" />
          )}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <section className="bg-card rounded-xl border p-6">
            <h2 className="mb-4 text-base font-semibold">Đặt phòng tại đây</h2>
            <SearchForm
              branches={[b]}
              initial={initial}
              layout="stack"
              hideBranch
              submitLabel="Tìm phòng trống"
              onSubmit={(v) => navigate(`/search?${toSearchParams(v)}`)}
            />
            <p className="text-muted-foreground mt-3 text-xs">
              Đặt trước tối đa 14 ngày · tối thiểu 1 giờ, tối đa 6 giờ
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
