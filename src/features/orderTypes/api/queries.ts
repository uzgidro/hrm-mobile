// Buyruq turlari (buyruq kategoriyalari katalogi) — web v2 `useOrderTypes`.
// Kalit ildizi `['order-act-categories']` — orders feature'dagi kategoriya keshi
// bilan bir xil, shuning uchun bu yerdagi o'zgarish buyruq filtrlariga ham yetadi.
import { queryOptions, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import { ORDER_ACT_CATEGORIES } from '@/api/urls';

export type CreatorRole = 'employee' | 'hr';
export type OrderType = { id: number; name?: string | null; creator_role?: CreatorRole | null };

export const orderTypeKeys = {
  all: ['order-act-categories'] as const,
  list: (search: string, creatorRole: string) => ['order-act-categories', 'types', search, creatorRole] as const,
};

export function orderTypesQuery({ search, creatorRole }: { search: string; creatorRole: string }) {
  return queryOptions({
    queryKey: orderTypeKeys.list(search, creatorRole),
    queryFn: () =>
      apiClient
        .get(ORDER_ACT_CATEGORIES, { params: { ...(search ? { search } : {}), ...(creatorRole ? { creator_role: creatorRole } : {}) } })
        .then((r) => unwrapList<OrderType>(r.data)),
    placeholderData: keepPreviousData,
  });
}

/** Forma tekshiruvi — i18n kaliti yoki null. */
export function validateOrderType(name: string, flow: string): 'nameRequired' | 'flowRequired' | null {
  if (!name.trim()) return 'nameRequired';
  if (!flow) return 'flowRequired';
  return null;
}
