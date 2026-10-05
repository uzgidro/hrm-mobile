import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import {
  ADMIN,
  ADMINS,
  ADMIN_SEND_PASSWORD,
  EMPLOYEE_ACTIVATE,
  EMPLOYEE_DEACTIVATE,
  MULTI_MODAL_USER,
  MULTI_MODAL_USERS,
  MULTI_MODAL_USER_SEND_PASSWORD,
} from '@/api/urls';
import { usersKeys } from './queries';

/** Faolsizlantirish O'CHIRISH EMAS: kartochka va tarix qoladi, kirish va jonli seanslar to'xtaydi. */
export const setEmployeeActive = ({ id, active }: { id: number; active: boolean }) =>
  apiClient.post(active ? EMPLOYEE_ACTIVATE(id) : EMPLOYEE_DEACTIVATE(id)).then((r) => r.data);

export const createAdmin = (body: Record<string, unknown>) => apiClient.post(ADMINS, body).then((r) => r.data);
export const updateAdmin = ({ id, body }: { id: number; body: Record<string, unknown> }) =>
  apiClient.patch(ADMIN(id), body).then((r) => r.data);
export const deleteAdmin = (id: number) => apiClient.delete(ADMIN(id)).then((r) => r.data);
/** Server bir martalik parolni POCHTAGA yuboradi — javobda parol yo'q. */
export const sendAdminPassword = (id: number) => apiClient.post(ADMIN_SEND_PASSWORD(id)).then(() => undefined);

export const createKiosk = (body: Record<string, unknown>) =>
  apiClient.post(MULTI_MODAL_USERS, body).then((r) => r.data);
export const updateKiosk = ({ id, body }: { id: number; body: Record<string, unknown> }) =>
  apiClient.patch(MULTI_MODAL_USER(id), body).then((r) => r.data);
export const deleteKiosk = (id: number) => apiClient.delete(MULTI_MODAL_USER(id)).then((r) => r.data);
export const sendKioskPassword = (id: number) =>
  apiClient.post(MULTI_MODAL_USER_SEND_PASSWORD(id), {}).then(() => undefined);

const meta = { skipErrorToast: true };

function useInvalidate(extra: readonly unknown[][] = []) {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: usersKeys.all }),
      ...extra.map((queryKey) => qc.invalidateQueries({ queryKey })),
    ]);
}

export function useSetEmployeeActive() {
  // Xodimlar ro'yxati ham hisob holatini ko'rsatadi (v2: employees + employee-kpi).
  const onSuccess = useInvalidate([['employees']]);
  return useMutation({ meta, mutationFn: setEmployeeActive, onSuccess });
}

export function useSaveAdmin() {
  const onSuccess = useInvalidate();
  return useMutation({
    meta,
    mutationFn: ({ id, body }: { id: number | null; body: Record<string, unknown> }) =>
      id == null ? createAdmin(body) : updateAdmin({ id, body }),
    onSuccess,
    // Kiritilgan parol so'rov tanasida — keshda turib qolmasin.
    gcTime: 0,
  });
}
export function useDeleteAdmin() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: deleteAdmin, onSuccess });
}
export function useSendAdminPassword() {
  return useMutation({ meta, mutationFn: sendAdminPassword });
}

export function useSaveKiosk() {
  const onSuccess = useInvalidate();
  return useMutation({
    meta,
    mutationFn: ({ id, body }: { id: number | null; body: Record<string, unknown> }) =>
      id == null ? createKiosk(body) : updateKiosk({ id, body }),
    onSuccess,
    gcTime: 0,
  });
}
export function useDeleteKiosk() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: deleteKiosk, onSuccess });
}
export function useSendKioskPassword() {
  return useMutation({ meta, mutationFn: sendKioskPassword });
}
