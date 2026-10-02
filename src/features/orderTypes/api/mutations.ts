import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { ORDER_ACT_CATEGORIES } from '@/api/urls';
import { orderTypeKeys } from './queries';

export const saveOrderType = (id: number | null, body: { name: string; creator_role: string }) =>
  (id == null
    ? apiClient.post(ORDER_ACT_CATEGORIES, body)
    : apiClient.patch(`${ORDER_ACT_CATEGORIES}/${id}`, body)
  ).then((r) => r.data);
export const deleteOrderType = (id: number) => apiClient.delete(`${ORDER_ACT_CATEGORIES}/${id}`).then((r) => r.data);

export function useSaveOrderType() {
  const qc = useQueryClient();
  return useMutation({
    // Forma xatoni o'zi ko'rsatadi (inline / toast) — global toast takrorlamasin.
    meta: { skipErrorToast: true },
    mutationFn: ({ id, body }: { id: number | null; body: { name: string; creator_role: string } }) =>
      saveOrderType(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: orderTypeKeys.all }),
  });
}

export function useDeleteOrderType() {
  const qc = useQueryClient();
  return useMutation({
    // Forma xatoni o'zi ko'rsatadi (inline / toast) — global toast takrorlamasin.
    meta: { skipErrorToast: true },
    mutationFn: deleteOrderType,
    onSuccess: () => qc.invalidateQueries({ queryKey: orderTypeKeys.all }),
  });
}
