import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import {
  HIK_SYNC_ACCESS_LISTS,
  HIK_SYNC_DEVICES,
  HIK_SYNC_DOORS,
  ISAPI_DEVICES,
  ISAPI_DEVICE_CREDENTIALS,
  ISAPI_DEVICE_POLL,
  ISAPI_DEVICE_SYNC_EMPLOYEES,
  ISAPI_DEVICE_TEST,
  ISAPI_DEVICE_UNKNOWN_USERS,
  TURNSTILE,
  TURNSTILES,
  TURNSTILE_DOOR,
  TURNSTILE_DOORS,
} from '@/api/urls';
import type { IsapiPollResult, IsapiTestResult, IsapiUnknownUsers } from '../utils/turnstiles';
import { turnstilesKeys } from './queries';

/**
 * Qurilmaga yetib boradigan so'rovlarda mijoz muddati YO'Q (v2 `REACHES_HARDWARE`): sekin aloqada
 * qurilma/HikCentral javobi 30 s dan oshadi, muddat esa serverni to'xtatmaydi — faqat «tarmoq xatosi»
 * ko'rsatib, aslida muvaffaqiyatli bajarilgan amalni xato deb ko'rsatardi.
 */
const HW = { timeout: 0 } as const;

type Save = { id: number | null; body: Record<string, unknown> };

export const saveTurnstile = ({ id, body }: Save) =>
  (id == null ? apiClient.post(TURNSTILES, body) : apiClient.patch(TURNSTILE(id), body)).then((r) => r.data);
export const deleteTurnstile = (id: number) => apiClient.delete(TURNSTILE(id)).then((r) => r.data);

export const createDoor = (body: Record<string, unknown>) => apiClient.post(TURNSTILE_DOORS, body).then((r) => r.data);
export const setDoorDirection = ({ id, direction }: { id: number; direction: string }) =>
  apiClient.patch(TURNSTILE_DOOR(id), { direction_type: direction }).then((r) => r.data);
export const deleteDoor = (id: number) => apiClient.delete(TURNSTILE_DOOR(id)).then((r) => r.data);

/** Server avval qurilmaga ULANADI, keyin yozadi — xato bo'lsa yarim turniket qolmaydi. */
export const registerIsapi = (body: Record<string, unknown>) =>
  apiClient.post(ISAPI_DEVICES, body, HW).then((r) => r.data);
export const testIsapi = (id: number) =>
  apiClient.post<IsapiTestResult>(ISAPI_DEVICE_TEST(id), {}, HW).then((r) => r.data);
export const pollIsapi = (id: number) =>
  apiClient.post<IsapiPollResult>(ISAPI_DEVICE_POLL(id), {}, HW).then((r) => r.data);
/** Navbatga qo'yiladi; `prune: false` — qurilmadagi qo'lda kiritilgan hisoblar o'chirilmaydi (v2). */
export const syncIsapiEmployees = (id: number) =>
  apiClient.post(ISAPI_DEVICE_SYNC_EMPLOYEES(id), { prune: false }).then((r) => r.data);
/** Yangi hisob darhol sinaladi; ishlamasa saqlanmaydi. Bo'sh parol (`null`) — joriy parol qoladi. */
export const setIsapiCredentials = ({ id, body }: { id: number; body: Record<string, unknown> }) =>
  apiClient.patch(ISAPI_DEVICE_CREDENTIALS(id), body, HW).then((r) => r.data);
/** Faqat o'qish: qurilmada bor, lekin tizimda hech kimga mos kelmagan hisoblar. */
export const fetchIsapiUnknownUsers = (id: number) =>
  apiClient.get<IsapiUnknownUsers>(ISAPI_DEVICE_UNKNOWN_USERS(id), HW).then((r) => r.data);

/**
 * HikCentral TO'LIQ sinxroni — v1 tartibida: qurilmalar → eshiklar → ruxsat guruhlari. Tartib muhim
 * (eshik qurilmaga, guruh ikkalasiga bog'lanadi); bir qadam yiqilsa qolganlari bajarilmaydi.
 */
export async function runHikSync(): Promise<void> {
  await apiClient.post(HIK_SYNC_DEVICES, {}, HW);
  await apiClient.post(HIK_SYNC_DOORS, {}, HW);
  await apiClient.post(HIK_SYNC_ACCESS_LISTS, {}, HW);
}

const meta = { skipErrorToast: true };

/**
 * Filiallar ekranining kesh ildizi — LITERAL (funksiyalararo import yo'q): filial varag'idagi
 * «Turniketlar» soni (`turnstile_count`) turniket qo'shilsa/o'chirilsa/manzili almashsa o'zgaradi.
 */
const BRANCHES_ADMIN_KEY = ['branches-admin'] as const;

/** `withBranches` — turniketlar to'plami (soni yoki manzillari) o'zgaradigan amallar uchun. */
function useInvalidate(withBranches = false) {
  const qc = useQueryClient();
  // HikCentral monitoringi (Terminallar ekrani) ham shu qurilmalarni ko'rsatadi.
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: turnstilesKeys.all }),
      qc.invalidateQueries({ queryKey: ['hik-monitoring'] }),
      ...(withBranches ? [qc.invalidateQueries({ queryKey: BRANCHES_ADMIN_KEY })] : []),
    ]);
}

export function useSaveTurnstile() {
  const onSuccess = useInvalidate(true);
  return useMutation({ meta, mutationFn: saveTurnstile, onSuccess });
}
export function useDeleteTurnstile() {
  const onSuccess = useInvalidate(true);
  return useMutation({ meta, mutationFn: deleteTurnstile, onSuccess });
}

export function useCreateDoor() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: createDoor, onSuccess });
}
export function useSetDoorDirection() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: setDoorDirection, onSuccess });
}
export function useDeleteDoor() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: deleteDoor, onSuccess });
}

export function useRegisterIsapi() {
  // Server terminal bilan birga turniket ham yaratadi — filial soni o'zgaradi.
  const onSuccess = useInvalidate(true);
  // Terminal paroli so'rov tanasida — mutatsiya keshida turib qolmasin.
  return useMutation({ meta, mutationFn: registerIsapi, onSuccess, gcTime: 0 });
}
export function useTestIsapi() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: testIsapi, onSuccess });
}
export function usePollIsapi() {
  return useMutation({ meta, mutationFn: pollIsapi });
}
export function useSyncIsapiEmployees() {
  return useMutation({ meta, mutationFn: syncIsapiEmployees });
}
export function useSetIsapiCredentials() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: setIsapiCredentials, onSuccess, gcTime: 0 });
}
export function useIsapiUnknownUsers() {
  return useMutation({ meta, mutationFn: fetchIsapiUnknownUsers });
}
/**
 * To'liq sinxron uchun kalit: varaq yopilib qayta ochilsa ham ishlayotgan sinxron ko'rinadi
 * (`useIsMutating`) — ikkinchi marta boshlab bo'lmaydi.
 */
export const HIK_SYNC_MUTATION_KEY = [...turnstilesKeys.all, 'hik-sync'] as const;

export function useHikSync() {
  // Qurilmalar sinxroni turniketlarni qo'shishi mumkin — filial soni ham.
  const onSuccess = useInvalidate(true);
  return useMutation({ meta, mutationKey: HIK_SYNC_MUTATION_KEY, mutationFn: runHikSync, onSuccess });
}
