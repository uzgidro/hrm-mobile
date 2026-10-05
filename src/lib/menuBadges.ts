// Menu badge counts ("needs my action" per module) — shared by the tab bar,
// NavRail, the Home shell and every list screen that shows a tab count.
// Lives in `src/lib` (not a feature) because letters/orders/leaves/support
// mutations must invalidate it after an action (see `invalidateAfterAction`)
// and features may not import each other.
import { queryOptions, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { MENU_BADGES } from '@/api/urls';
import { useAuthStore } from '@/store/authStore';

export interface MenuBadges {
  letters: number;
  orders: number;
  support: number;
  projects: number;
  fleet: number;
  documents: number;
  /** Ruxsatnomalar — meni imzosini kutayotganlar (server hisoblaydi). Eski API'da yo'q. */
  leaves?: number;
  /** O'qilmagan bildirishnomalar soni — server COUNT(*). Eski API'da yo'q. */
  unread_notifications?: number;
}

// Under the `['notifications']` prefix on purpose: the push service and the
// notifications screen invalidate that prefix, which must refresh these too.
export const MENU_BADGES_KEY = ['notifications', 'menu-badges'] as const;

export const EMPTY_BADGES: MenuBadges = {
  letters: 0, orders: 0, support: 0, projects: 0, fleet: 0, documents: 0,
};

// Web DashboardLayout polls this every 60 s; so do we. A FAILED refetch keeps
// the previous numbers on screen (react-query retains `data` on error) instead
// of the old `.catch(() => zeros)`, which silently showed "nothing pending"
// whenever the request failed. No toast either — a background poll failing
// must not nag every minute.
//
// MEHMON — so'rov ham, polling ham yo'q: server unga `notifications/menu-badges` ni yopadi (403
// `guest_forbidden`, `core/security._GUEST_ALLOWED_EXACT`) — real QA'da 60 s polling 148 ta konsol
// xatosini bergan. Mehmonning bo'sh javobi darrov eskiradi: tasdiqlangan hisob bilan qayta kirilsa,
// birinchi ekranning o'zi haqiqiy raqamlarni so'raydi (60 s kutmaydi).
const GUEST_BADGES: MenuBadges = { ...EMPTY_BADGES };
const isGuest = () => useAuthStore.getState().user?.type === 'guest';

export function menuBadgesQuery() {
  return queryOptions({
    queryKey: MENU_BADGES_KEY,
    queryFn: () =>
      isGuest()
        ? Promise.resolve(GUEST_BADGES)
        : apiClient
            .get<Partial<MenuBadges>>(MENU_BADGES)
            .then((r) => ({ ...EMPTY_BADGES, ...(r.data ?? {}) }) as MenuBadges),
    placeholderData: keepPreviousData,
    staleTime: (q) => (q.state.data === GUEST_BADGES ? 0 : 60 * 1000),
    refetchInterval: () => (isGuest() ? false : 60 * 1000),
    meta: { skipErrorToast: true },
  });
}
