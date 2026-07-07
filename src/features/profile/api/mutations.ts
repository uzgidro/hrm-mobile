import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { EMPLOYEE_DETAIL, EMPLOYEE_SELF_UPDATE, USER_INFO } from '@/api/urls';
import { useAuthStore } from '@/store/authStore';
import type { EmployeeFull, User } from '@/types';

// Self-update payload: only the fields the employee may edit themselves. Values
// are sent selectively (non-empty) by the caller so blanks never wipe existing
// data — matching the web self-update form.
export type MyProfilePayload = Record<string, string>;

// ── Request functions (pure data access; unit-testable without React) ────────

// Read the current employee's full record (used to prefill the edit form).
export function getMyProfile(employeeId: number): Promise<EmployeeFull> {
  return apiClient.get<EmployeeFull>(EMPLOYEE_DETAIL(employeeId)).then((r) => r.data);
}

export function updateMyProfile(payload: MyProfilePayload): Promise<unknown> {
  return apiClient.patch(EMPLOYEE_SELF_UPDATE, payload).then((r) => r.data);
}

// Re-fetch the signed-in user so profile edits show immediately everywhere.
export function fetchCurrentUser(): Promise<User> {
  return apiClient.get<User>(USER_INFO).then((r) => r.data);
}

// ── Mutation hooks ──────────────────────────────────────────────────────────
export function useUpdateMyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateMyProfile,
    onSuccess: async () => {
      // Refresh the cached user so changes show immediately everywhere. This
      // mirrors the original screen: on failure it's swallowed so the save
      // still counts as successful.
      try {
        const me = await fetchCurrentUser();
        useAuthStore.getState().setUser(me);
      } catch {}
      // Invalidate the employee-detail cache so the edit-form prefill re-reads.
      // NOTE: coarse root `['employees']` matches the employees feature's
      // `employeeKeys.all`; we invalidate by the string root rather than
      // importing from `src/features/employees` (cross-feature imports are
      // banned). This couples us to that feature's key root — keep in sync.
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}
