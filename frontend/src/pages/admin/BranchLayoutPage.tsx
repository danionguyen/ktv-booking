import { GripVerticalIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { adminApi } from '@api/admin'
import { qk } from '@api/keys'
import { PageHeader } from '@components/PageHeader'
import { ErrorState, LoadingState } from '@components/states'
import { Button } from '@components/ui/button'
import { Field, FieldLabel } from '@components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select'
import { Input } from '@components/ui/input'
import { LayoutEditor, type LayoutRoom } from '@features/room-map/LayoutEditor'
import { cn } from '@lib/utils'
import { useAdminBranches, useAdminMutation, useAdminRooms } from '@hooks/queries/useAdmin'

/** "Tự sắp xếp": mỗi loại phòng một hàng, cách nhau 20px (bám lưới). */
function autoArrange(rooms: LayoutRoom[], mapWidth: number): LayoutRoom[] {
  const GAP = 20
  const byType = new Map<string, LayoutRoom[]>()
  for (const r of rooms) byType.set(r.type, [...(byType.get(r.type) ?? []), r])
  const out: LayoutRoom[] = []
  let y = GAP * 2
  for (const group of byType.values()) {
    let x = GAP * 2
    let rowH = 0
    for (const r of group) {
      if (x + r.width > mapWidth - GAP) {
        x = GAP * 2
        y += rowH + GAP
        rowH = 0
      }
      out.push({ ...r, posX: x, posY: y })
      x += r.width + GAP
      rowH = Math.max(rowH, r.height)
    }
    y += rowH + GAP * 2
  }
  return out
}

/** SCR-A03 — kéo thả vị trí phòng, chỉnh kích thước ô và khung sơ đồ (FD-BRN-03). */
export function BranchLayoutPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const branches = useAdminBranches()
  const rooms = useAdminRooms(id)
  const branch = branches.data?.find((b) => b.id === id)
  const [layout, setLayout] = useState<LayoutRoom[]>([])
  const [size, setSize] = useState({ mapWidth: 1000, mapHeight: 560 })
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [dirty, setDirty] = useState(false)
  const save = useAdminMutation(
    () =>
      adminApi.branches.saveLayout(id, {
        ...size,
        rooms: layout.map(({ id, posX, posY, width, height }) => ({
          id,
          posX,
          posY,
          width,
          height,
        })),
      }),
    [qk.admin.rooms(id), qk.admin.branches, ['room-map', id]],
  )

  const reset = () => {
    if (!rooms.data || !branch) return
    setLayout(rooms.data)
    setSize({ mapWidth: branch.mapWidth, mapHeight: branch.mapHeight })
    setDirty(false)
  }
  useEffect(reset, [rooms.data, branch])

  const selected = layout.find((r) => r.id === selectedId)
  const update = (rows: LayoutRoom[]) => {
    setLayout(rows)
    setDirty(true)
  }
  const resize = (patch: Partial<Pick<LayoutRoom, 'width' | 'height'>>) =>
    selected && update(layout.map((r) => (r.id === selected.id ? { ...r, ...patch } : r)))

  if (rooms.isPending || branches.isPending) return <LoadingState />
  if (rooms.isError) return <ErrorState error={rooms.error} />

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[248px_minmax(0,1fr)]">
      <PageHeader
        breadcrumb="Quản trị  /  Chi nhánh  /  Sơ đồ"
        title={`Sơ đồ mặt bằng · ${branch?.name ?? ''}`}
        actions={
          <>
            <Button variant="outline" onClick={() => update(autoArrange(layout, size.mapWidth))}>
              Tự sắp xếp
            </Button>
            <Button variant="outline" onClick={reset} disabled={!dirty}>
              Hoàn tác
            </Button>
            <Button
              disabled={!dirty || save.isPending}
              onClick={() =>
                save.mutate(undefined, {
                  onSuccess: () => (toast.success('Đã lưu sơ đồ'), setDirty(false)),
                })
              }
            >
              {save.isPending ? 'Đang lưu…' : 'Lưu sơ đồ'}
            </Button>
          </>
        }
      />
      <section className="bg-card flex flex-col gap-4 rounded-xl border p-6">
        <h2 className="text-base font-semibold">Phòng ({layout.length})</h2>
        <ul className="flex max-h-[420px] flex-col gap-3 overflow-y-auto">
          {layout.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setSelectedId(r.id)}
                className={cn(
                  'bg-background flex w-full items-center gap-2.5 rounded-lg border px-4 py-2.5 text-left text-sm font-semibold',
                  r.id === selectedId && 'border-primary',
                )}
              >
                <GripVerticalIcon className="text-muted-foreground size-4" />
                {r.code} · {r.type}
              </button>
            </li>
          ))}
        </ul>
        {selected ? (
          <div className="grid grid-cols-2 gap-3 border-t pt-4">
            <p className="col-span-2 text-sm font-semibold">Kích thước {selected.code}</p>
            <Field>
              <FieldLabel htmlFor="room-w">Rộng</FieldLabel>
              <Input
                id="room-w"
                type="number"
                step={10}
                min={80}
                value={selected.width}
                onChange={(e) => resize({ width: Number(e.target.value) })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="room-h">Cao</FieldLabel>
              <Input
                id="room-h"
                type="number"
                step={10}
                min={60}
                value={selected.height}
                onChange={(e) => resize({ height: Number(e.target.value) })}
              />
            </Field>
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            Kéo phòng trên canvas để đặt vị trí (lưu pos_x, pos_y). Bấm một phòng để chỉnh kích
            thước.
          </p>
        )}
      </section>

      <section className="bg-card flex min-w-0 flex-col gap-4 rounded-xl border p-6">
        <h2 className="text-base font-semibold">Canvas</h2>
        <div className="flex flex-wrap items-end gap-3">
          <Field className="w-60">
            <FieldLabel htmlFor="layout-branch">Chi nhánh</FieldLabel>
            <Select
              value={String(id)}
              onValueChange={(v) => navigate(`/admin/branches/${v}/layout`)}
            >
              <SelectTrigger id="layout-branch" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {branches.data?.map((br) => (
                  <SelectItem key={br.id} value={String(br.id)}>
                    {br.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field className="w-28">
            <FieldLabel htmlFor="map-w">Rộng (px)</FieldLabel>
            <Input
              id="map-w"
              type="number"
              step={10}
              value={size.mapWidth}
              onChange={(e) => (
                setSize({ ...size, mapWidth: Number(e.target.value) }),
                setDirty(true)
              )}
            />
          </Field>
          <Field className="w-28">
            <FieldLabel htmlFor="map-h">Cao (px)</FieldLabel>
            <Input
              id="map-h"
              type="number"
              step={10}
              value={size.mapHeight}
              onChange={(e) => (
                setSize({ ...size, mapHeight: Number(e.target.value) }),
                setDirty(true)
              )}
            />
          </Field>
          <p className="text-muted-foreground pb-2.5 text-xs">
            Lưới snap 10px{selected ? ` · đang chọn ${selected.code}` : ''}
          </p>
        </div>
        <LayoutEditor
          rooms={layout}
          mapWidth={size.mapWidth}
          mapHeight={size.mapHeight}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onChange={update}
        />
      </section>
    </div>
  )
}

/** Mục "Sơ đồ mặt bằng" trên sidebar: mở sơ đồ của chi nhánh đầu tiên. */
export function FirstBranchLayoutRedirect() {
  const branches = useAdminBranches()
  if (branches.isPending) return <LoadingState rows={4} />
  const first = branches.data?.[0]
  return <Navigate to={first ? `/admin/branches/${first.id}/layout` : '/admin/branches'} replace />
}
