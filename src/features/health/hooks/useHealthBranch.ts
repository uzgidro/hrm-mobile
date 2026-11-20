// Which branch the health screen (and the home card) works in. A nurse's own branch
// comes first: `nurse_branch_ids` from auth/me, or from `health-checks/access` when
// the cached user predates that field. The mobile app has no global branch picker,
// so a nurse of several branches (or a site master-admin who is no nurse) picks it
// on the screen itself.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { isSiteMasterAdmin } from '@/utils/roles';
import { healthAccessQuery, healthBranchesQuery } from '../api/queries';
import { branchCandidates, resolveHealthBranch } from '../utils/health';

export function useHealthBranch({ withPicker = true }: { withPicker?: boolean } = {}) {
  const user = useAuthStore((s) => s.user);
  const [picked, setPicked] = useState<number | null>(null);
  const userNurse = user?.nurse_branch_ids;
  const identity = useQuery(healthAccessQuery(null, !userNurse?.length));
  const candidates = branchCandidates(userNurse, identity.data?.nurse_branch_ids);
  const anyBranch = withPicker && !candidates.length && isSiteMasterAdmin(user);
  const branchId = resolveHealthBranch(picked, candidates);
  const showPicker = withPicker && (candidates.length > 1 || anyBranch);
  const branches = useQuery(healthBranchesQuery(showPicker));
  const branchName = (id: number) => branches.data?.find((b) => b.id === id)?.name || `#${id}`;
  const options = (anyBranch ? (branches.data ?? []).map((b) => b.id) : candidates).map((id) => ({
    value: id,
    label: branchName(id),
  }));

  // `can_check` is asked for EXACTLY the branch on screen (the server narrows it).
  const access = useQuery(healthAccessQuery(branchId, branchId != null));
  const canCheck = branchId != null && !!access.data?.can_check;

  return {
    branchId,
    setPicked,
    identity,
    access,
    canCheck,
    showPicker,
    branchName,
    options,
    branchesLoading: branches.isFetching,
  };
}
