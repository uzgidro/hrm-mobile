import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { MODULE_RESPONSIBLE, MODULE_RESPONSIBLES } from '@/api/urls';
import { responsibleKeys, type ResponsibleScope } from './queries';

export interface AddResponsibleBody {
  module: string;
  scope_type: ResponsibleScope;
  scope_id: number;
}

export const addResponsible = (body: AddResponsibleBody) =>
  apiClient.post(MODULE_RESPONSIBLES, body).then((r) => r.data);
export const removeResponsible = (id: number) => apiClient.delete(MODULE_RESPONSIBLE(id)).then((r) => r.data);

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: responsibleKeys.all });
}

export function useAddResponsible() {
  const onSuccess = useInvalidate();
  // Ekran xatoni o'zi toast qiladi — global toast takrorlamasin.
  return useMutation({ meta: { skipErrorToast: true }, mutationFn: addResponsible, onSuccess });
}

export function useRemoveResponsible() {
  const onSuccess = useInvalidate();
  return useMutation({ meta: { skipErrorToast: true }, mutationFn: removeResponsible, onSuccess });
}
