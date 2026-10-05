import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { MENU_BADGES_KEY } from './menuBadges';

/**
 * Invalidate a feature's own keys AND the menu badge counts after a document
 * action (sign/agree/register/reject, leave approval, ticket reply ...).
 *
 * WHY: every feature only invalidated its own `xKeys.all`, so the red numbers
 * on the tab bar / Modules grid kept the pre-action value for up to 60 s (the
 * poll interval) — a user who just signed the last pending order still saw
 * "1". The notifications list is refreshed too: most actions create one.
 */
export function invalidateAfterAction(qc: QueryClient, ...featureKeys: QueryKey[]): Promise<void> {
  return Promise.all([
    ...featureKeys.map((key) => qc.invalidateQueries({ queryKey: key })),
    qc.invalidateQueries({ queryKey: MENU_BADGES_KEY }),
    qc.invalidateQueries({ queryKey: ['notifications', 'list'] }),
  ]).then(() => undefined);
}

/**
 * After a successful DELETE: drop the deleted record's own queries from the
 * cache FIRST, then refresh the lists (+ badges / notifications).
 *
 * WHY (QA 2026-10-05): `invalidateAfterAction(qc, leaveKeys.all)` prefix-matched
 * the still-mounted detail query of the record that had just been deleted; its
 * refetch answered 404 and — the query already holding data — the global
 * QueryCache handler showed a second, English «Work leave not found» toast
 * right after «So'rov o'chirildi» (same for a deleted project: `GET
 * workspaces/{id}` 404). Cancelling + removing the deleted keys (exact) means
 * the prefix invalidation below can no longer reach them.
 *
 * ⚠️ The detail SCREEN must also stop its observer from rebuilding the query
 * (a removed query is re-created on the next render and fetched again): pass
 * `enabled: !deleteMutation.isSuccess` to its `useQuery`.
 */
export async function invalidateAfterDelete(
  qc: QueryClient,
  deletedKeys: QueryKey[],
  ...listKeys: QueryKey[]
): Promise<void> {
  await Promise.all(deletedKeys.map((key) => qc.cancelQueries({ queryKey: key, exact: true })));
  for (const key of deletedKeys) qc.removeQueries({ queryKey: key, exact: true });
  await invalidateAfterAction(qc, ...listKeys);
}
