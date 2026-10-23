import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BranchCard } from '@components/booking/BranchCard'
import { LiveMapPreview } from '@components/booking/LiveMapPreview'
import { SearchForm } from '@components/booking/SearchForm'
import { ErrorState } from '@components/states'
import { Skeleton } from '@components/ui/skeleton'
import { useBranches } from '@hooks/queries/useCatalog'
import { defaultSearch, toSearchParams } from '@utils/search'
import { minutesOf } from '@utils/time'

const HIGHLIGHTS = ['Sơ đồ real-time', 'Giữ chỗ 10 phút', 'VNPay · Trả tại quầy']

/** Giờ đóng cửa muộn nhất (tính qua đêm) để hiện "mở cửa đến …". */
function latestClose(branches: { openTime: string; closeTime: string }[]) {
  const late = (b: { openTime: string; closeTime: string }) =>
    minutesOf(b.closeTime) + (b.closeTime <= b.openTime ? 24 * 60 : 0)
  const last = branches.reduce((a, b) => (late(b) > late(a) ? b : a))
  const hour = Number(last.closeTime.slice(0, 2))
  return late(last) > 24 * 60
    ? `${hour} giờ sáng`
    : last.closeTime === '00:00'
      ? 'nửa đêm'
      : last.closeTime
}

/** SCR-C05 */
export function HomePage() {
  const navigate = useNavigate()
  const { hash } = useLocation()
  const branches = useBranches()

  // Header "Chi nhánh" trỏ tới /#chi-nhanh
  useEffect(() => {
    if (hash && branches.data)
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
  }, [hash, branches.data])

  const initial = useMemo(
    () => (branches.data?.[0] ? defaultSearch(branches.data[0]) : null),
    [branches.data],
  )

  if (branches.isError)
    return <ErrorState error={branches.error} onRetry={() => void branches.refetch()} />
  const list = branches.data

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-hero grid items-center gap-12 rounded-[20px] p-6 sm:p-14 lg:grid-cols-[minmax(0,560px)_350px] lg:justify-between">
        <div className="flex flex-col gap-5">
          <h1 className="text-on-hero text-3xl leading-[1.2] font-bold sm:text-[40px]">
            Đặt phòng karaoke
            <br />
            chỉ trong 1 phút
          </h1>
          <p className="text-on-hero-muted max-w-[520px] text-sm leading-relaxed">
            Xem phòng trống theo thời gian thực, giữ chỗ 10 phút trong lúc chọn món và thanh toán
            VNPay hoặc trả tại quầy.
          </p>
          <ul className="flex flex-wrap gap-2">
            {HIGHLIGHTS.map((h) => (
              <li key={h} className="text-on-hero rounded-full bg-black/15 px-3 py-1.5 text-xs">
                {h}
              </li>
            ))}
          </ul>
        </div>
        {list?.[0] ? <LiveMapPreview branch={list[0]} /> : <Skeleton className="h-52 rounded-xl" />}
      </section>

      <section className="bg-card rounded-xl border p-5">
        {list?.length && initial ? (
          <SearchForm
            branches={list}
            initial={initial}
            layout="inline"
            onSubmit={(v) => navigate(`/search?${toSearchParams(v)}`)}
          />
        ) : (
          <Skeleton className="h-14" />
        )}
      </section>

      <section id="chi-nhanh" className="flex scroll-mt-20 flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-[28px] leading-9 font-bold">Chi nhánh</h2>
          {list && (
            <p className="text-muted-foreground text-sm">
              {list.length} chi nhánh tại Hà Nội · mở cửa đến {latestClose(list)}
            </p>
          )}
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
          {list
            ? list.map((b) => <BranchCard key={b.id} branch={b} />)
            : Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
        </div>
      </section>
    </div>
  )
}
