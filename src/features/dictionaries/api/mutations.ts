import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { DICTIONARIES_SYNC, DICTIONARY_ENTRIES, DICTIONARY_ENTRY } from '@/api/urls';
import { dictionariesKeys } from './queries';

type Save = { code: string; id: number | null; body: Record<string, unknown> };

/** Yangi yozuv — ma'lumotnoma kodi bo'yicha (POST), tahrir — yozuv id si bo'yicha (PUT). */
export const saveEntry = ({ code, id, body }: Save) =>
  (id == null ? apiClient.post(DICTIONARY_ENTRIES(code), body) : apiClient.put(DICTIONARY_ENTRY(id), body)).then(
    (r) => r.data,
  );
/** Ishlatilayotgan yozuvni server o'chirmaydi (409) — o'rniga faolsizlantirish taklif qilinadi. */
export const deleteEntry = (id: number) => apiClient.delete(DICTIONARY_ENTRY(id)).then((r) => r.data);
/** TZ majburiy ma'lumotnomalarini tekshiradi va yetishmaganini qo'shadi; mavjud yozuvlarga tegmaydi. */
export const syncCatalog = () =>
  apiClient.post<{ types_created: number; entries_created: number }>(DICTIONARIES_SYNC, {}).then((r) => r.data);

const meta = { skipErrorToast: true };

function useInvalidate() {
  const qc = useQueryClient();
  // Ildiz: katalog soni, yozuvlar va boshqa ekranlardagi tanlagichlar (ta'til sabablari va h.k.) birga.
  return () => qc.invalidateQueries({ queryKey: dictionariesKeys.all });
}

export function useSaveEntry() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: saveEntry, onSuccess });
}
export function useDeleteEntry() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: deleteEntry, onSuccess });
}
export function useSyncCatalog() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: syncCatalog, onSuccess });
}
