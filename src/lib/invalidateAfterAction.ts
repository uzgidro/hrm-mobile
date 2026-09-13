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
