// Server capability flags that /auth/me does not carry.
//
// The app ships over the air to every phone at once while the backend is deployed on its own
// schedule. A module whose endpoints may not exist yet stays out of the menu until the server
// is PROVEN to have them: `undefined` (not probed yet / probe failed) hides it exactly like `false`.
// Same idea as `serverHasExam` (roles.ts), but for features with no /auth/me flag.
import { apiClient } from '@/api/client';
import { WEEKEND_TABEL } from '@/api/urls';

let weekendTabel: boolean | undefined;

/** Whether the server has the rest-day tabel (`/weekend-tabel`). `undefined` = unknown yet. */
export function weekendTabelSupported(): boolean | undefined {
  return weekendTabel;
}

export function setWeekendTabelSupported(v: boolean | undefined): void {
  weekendTabel = v;
}

/** True when an axios-like error says "no such route" (an old server). */
export function isNotFound(err: unknown): boolean {
  return (err as { response?: { status?: number } } | null)?.response?.status === 404;
}

/**
 * Probes the server once. `GET /weekend-tabel` without its required query answers 422 on a server
 * that has the route (validation runs before any work) and 404 on one that does not — the probe
 * never loads a grid. 401 / 5xx / network failures leave the previous answer untouched.
 */
export async function probeWeekendTabel(): Promise<boolean | undefined> {
  try {
    const res = await apiClient.get(WEEKEND_TABEL, { validateStatus: () => true });
    if (res.status === 404) setWeekendTabelSupported(false);
    else if ([200, 403, 422].includes(res.status)) setWeekendTabelSupported(true);
  } catch {
    /* offline: keep the previous answer */
  }
  return weekendTabel;
}
