import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { CUSTOM_FIELD, CUSTOM_FIELDS, CUSTOM_FIELD_GROUP, CUSTOM_FIELD_GROUPS } from '@/api/urls';
import { customFieldsKeys } from './queries';

type Save = { id: number | null; body: Record<string, unknown> };

export const saveGroup = ({ id, body }: Save) =>
  (id == null ? apiClient.post(CUSTOM_FIELD_GROUPS, body) : apiClient.patch(CUSTOM_FIELD_GROUP(id), body)).then(
    (r) => r.data,
  );
/** Guruh o'chsa ichidagi maydonlar va ularga kiritilgan QIYMATLAR ham o'chadi (server kaskadi). */
export const deleteGroup = (id: number) => apiClient.delete(CUSTOM_FIELD_GROUP(id)).then((r) => r.data);

export const saveField = ({ id, body }: Save) =>
  (id == null ? apiClient.post(CUSTOM_FIELDS, body) : apiClient.patch(CUSTOM_FIELD(id), body)).then((r) => r.data);
export const deleteField = (id: number) => apiClient.delete(CUSTOM_FIELD(id)).then((r) => r.data);

const meta = { skipErrorToast: true };

function useInvalidate() {
  const qc = useQueryClient();
  // Ildiz: guruhlar ro'yxati ham, kartochkalardagi ta'rif (v2 `schema`) ham shu kalit ostida.
  return () => qc.invalidateQueries({ queryKey: customFieldsKeys.all });
}

export function useSaveGroup() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: saveGroup, onSuccess });
}
export function useDeleteGroup() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: deleteGroup, onSuccess });
}
export function useSaveField() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: saveField, onSuccess });
}
export function useDeleteField() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: deleteField, onSuccess });
}
