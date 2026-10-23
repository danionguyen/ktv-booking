import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select'
import { useBranches } from '@hooks/queries/useCatalog'
import { useStaffBranch } from '@hooks/useStaffBranch'

/** Chỉ admin thấy — nhân viên luôn ở chi nhánh được gán. */
export function BranchSwitcher() {
  const { branchId, isAdmin, setBranchId } = useStaffBranch()
  const branches = useBranches()
  if (!isAdmin || !branches.data) return null
  return (
    <Select value={String(branchId)} onValueChange={(v) => setBranchId(Number(v))}>
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {branches.data.map((b) => (
          <SelectItem key={b.id} value={String(b.id)}>
            {b.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
