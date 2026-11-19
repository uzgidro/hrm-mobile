// Sanatorium "sections" API, part 1: switches, journey, location, territory, info sections,
// broadcasts, waitlist, housekeeping, transfers. Request functions are pure; screens wrap them in
// useQuery / the hooks at the bottom. Every key lives under `sanKeys.all`, so the broad
// invalidation of the older mutations also refreshes these lists.
import { infiniteQueryOptions, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { appendFile, type UploadFile } from '@/api/formFile';
import { unwrapList } from '@/api/response';
import {
  SANATORIUM_BROADCAST, SANATORIUM_BROADCAST_AUDIENCES, SANATORIUM_BROADCAST_PHOTO, SANATORIUM_BROADCASTS,
  SANATORIUM_FEATURES, SANATORIUM_HK_BOARD, SANATORIUM_HK_MY_TASKS, SANATORIUM_HK_SETTINGS, SANATORIUM_HK_TASK,
  SANATORIUM_HK_TASK_DONE, SANATORIUM_HK_TASK_START, SANATORIUM_HK_TASKS, SANATORIUM_INFO_SECTION,
  SANATORIUM_INFO_SECTION_PHOTO, SANATORIUM_INFO_SECTIONS, SANATORIUM_INFO_SECTIONS_ORDER, SANATORIUM_JOURNEY_BOARD,
  SANATORIUM_JOURNEY_SETTINGS, SANATORIUM_JOURNEY_STAGE, SANATORIUM_JOURNEY_STAGES, SANATORIUM_JOURNEY_STAGES_ORDER,
  SANATORIUM_JOURNEY_STAY, SANATORIUM_JOURNEY_STAY_STAGE, SANATORIUM_LOCATION, SANATORIUM_ROOM_HK_STATUS,
  SANATORIUM_TERRITORY, SANATORIUM_TERRITORY_PLAN, SANATORIUM_TERRITORY_POI, SANATORIUM_TERRITORY_POIS,
  SANATORIUM_TERRITORY_POIS_ORDER, SANATORIUM_TRANSFER, SANATORIUM_TRANSFER_VEHICLES, SANATORIUM_TRANSFERS,
  SANATORIUM_WAITLIST, SANATORIUM_WAITLIST_CANCEL, SANATORIUM_WAITLIST_CONVERT, SANATORIUM_WAITLIST_ITEM,
} from '@/api/urls';
import type {
  AudienceCount, Broadcast, BroadcastAudience, FeatureRow, HkBoard, HkMyTasks, HkStatus, HkTask, HkTasksPage,
  InfoSection, JourneyBoard, JourneySettings, JourneyStage, JourneyStayInfo, Poi, SanLocation, Territory,
  TerritoryPlan, Transfer, TransferVehicle, TransfersPage, WaitlistItem, WaitlistPage,
} from '../types1';
import { waitlistParams } from '../utils/sections1';
import { SAN_FEATURES_KEY } from '../utils/features';
import { sanKeys } from './queries';

type Json = Record<string, unknown>;
export const PAGE1 = 30;

export const s1Keys = {
  features: () => [...sanKeys.all, 's1', 'features'] as const,
  board: () => [...sanKeys.all, 's1', 'journey-board'] as const,
  stages: () => [...sanKeys.all, 's1', 'journey-stages'] as const,
  journeySettings: () => [...sanKeys.all, 's1', 'journey-settings'] as const,
  journeyStay: (id: number) => [...sanKeys.all, 's1', 'journey-stay', id] as const,
  location: () => [...sanKeys.all, 's1', 'location'] as const,
  territory: () => [...sanKeys.all, 's1', 'territory'] as const,
  info: () => [...sanKeys.all, 's1', 'info'] as const,
  broadcasts: () => [...sanKeys.all, 's1', 'broadcasts'] as const,
  audiences: () => [...sanKeys.all, 's1', 'audiences'] as const,
  waitlist: (f: string) => [...sanKeys.all, 's1', 'waitlist', f] as const,
  hkBoard: (status: string) => [...sanKeys.all, 's1', 'hk-board', status] as const,
  hkTasks: (f: string) => [...sanKeys.all, 's1', 'hk-tasks', f] as const,
  hkMine: () => [...sanKeys.all, 's1', 'hk-mine'] as const,
  hkSettings: () => [...sanKeys.all, 's1', 'hk-settings'] as const,
  transfers: (f: string) => [...sanKeys.all, 's1', 'transfers', f] as const,
  vehicles: () => [...sanKeys.all, 's1', 'vehicles'] as const,
};

// ── Reads ──
export const fetchFeatures = () => apiClient.get(SANATORIUM_FEATURES).then((r) => unwrapList<FeatureRow>(r.data));
export const fetchJourneyBoard = () => apiClient.get<JourneyBoard>(SANATORIUM_JOURNEY_BOARD).then((r) => r.data);
export const fetchStages = () => apiClient.get(SANATORIUM_JOURNEY_STAGES).then((r) => unwrapList<JourneyStage>(r.data));
export const fetchJourneySettings = () => apiClient.get<JourneySettings>(SANATORIUM_JOURNEY_SETTINGS).then((r) => r.data);
export const fetchJourneyStay = (id: number) => apiClient.get<JourneyStayInfo>(SANATORIUM_JOURNEY_STAY(id)).then((r) => r.data);
export const fetchLocation = () => apiClient.get<SanLocation>(SANATORIUM_LOCATION).then((r) => r.data);
export const fetchTerritory = () => apiClient.get<Territory>(SANATORIUM_TERRITORY, { params: { include_inactive: true } }).then((r) => r.data);
export const fetchInfoSections = () => apiClient.get(SANATORIUM_INFO_SECTIONS).then((r) => unwrapList<InfoSection>(r.data));
export const fetchBroadcasts = (page = 1, size = PAGE1) =>
  apiClient.get<{ items: Broadcast[]; total: number }>(SANATORIUM_BROADCASTS, { params: { page, size } }).then((r) => r.data);
export const fetchAudiences = () =>
  apiClient.get<Record<BroadcastAudience, AudienceCount>>(SANATORIUM_BROADCAST_AUDIENCES).then((r) => r.data);
export const fetchWaitlist = (f: { status: string; q: string; from?: string | null; to?: string | null }, page: number) =>
  apiClient.get<WaitlistPage>(SANATORIUM_WAITLIST, { params: waitlistParams(f, page, PAGE1) }).then((r) => ({ ...r.data, page }));
export const fetchHkBoard = (status: string) =>
  apiClient.get<HkBoard>(SANATORIUM_HK_BOARD, { params: status && status !== 'all' ? { status } : {} }).then((r) => r.data);
export type HkTaskFilter = { status?: string; kind?: string; room_id?: number; assignee_staff_id?: number };
export const fetchHkTasks = (f: HkTaskFilter, page: number) =>
  apiClient.get<HkTasksPage>(SANATORIUM_HK_TASKS, { params: { ...f, page, size: PAGE1 } }).then((r) => ({ ...r.data, page }));
export const fetchHkMine = () => apiClient.get<HkMyTasks>(SANATORIUM_HK_MY_TASKS, { params: { include_unassigned: true } }).then((r) => r.data);
export const fetchHkSettings = () => apiClient.get<{ linen_change_days: number }>(SANATORIUM_HK_SETTINGS).then((r) => r.data);
export type TransferFilter = { status?: string; direction?: string; q?: string; from?: string | null; to?: string | null };
export const fetchTransfers = (f: TransferFilter, page: number) =>
  apiClient
    .get<TransfersPage>(SANATORIUM_TRANSFERS, {
      params: {
        ...(f.status && f.status !== 'all' ? { status: f.status } : {}),
        ...(f.direction && f.direction !== 'all' ? { direction: f.direction } : {}),
        ...(f.q?.trim() ? { q: f.q.trim() } : {}),
        ...(f.from ? { from: f.from } : {}),
        ...(f.to ? { to: f.to } : {}),
        page,
        size: PAGE1,
      },
    })
    .then((r) => ({ ...r.data, page }));
export const fetchVehicles = () => apiClient.get(SANATORIUM_TRANSFER_VEHICLES).then((r) => unwrapList<TransferVehicle>(r.data));

export const featuresQuery = (enabled = true) => queryOptions({ queryKey: s1Keys.features(), queryFn: fetchFeatures, enabled });
export const journeyBoardQuery = (enabled = true) => queryOptions({ queryKey: s1Keys.board(), queryFn: fetchJourneyBoard, enabled });
export const stagesQuery = (enabled = true) => queryOptions({ queryKey: s1Keys.stages(), queryFn: fetchStages, enabled });
export const journeySettingsQuery = (enabled = true) => queryOptions({ queryKey: s1Keys.journeySettings(), queryFn: fetchJourneySettings, enabled });
export const journeyStayQuery = (id: number, enabled = true) =>
  queryOptions({ queryKey: s1Keys.journeyStay(id), queryFn: () => fetchJourneyStay(id), enabled: enabled && id > 0 });
export const locationQuery = (enabled = true) => queryOptions({ queryKey: s1Keys.location(), queryFn: fetchLocation, enabled });
export const territoryQuery = (enabled = true) => queryOptions({ queryKey: s1Keys.territory(), queryFn: fetchTerritory, enabled });
export const infoSectionsQuery = (enabled = true) => queryOptions({ queryKey: s1Keys.info(), queryFn: fetchInfoSections, enabled });
/** Polls every 5 s while a broadcast is still queued or sending. */
export const broadcastsQuery = (enabled = true) =>
  queryOptions({
    queryKey: s1Keys.broadcasts(),
    queryFn: () => fetchBroadcasts(),
    enabled,
    refetchInterval: (q) => (q.state.data?.items.some((b) => b.status !== 'done') ? 5000 : false),
  });
export const audiencesQuery = (enabled = true) => queryOptions({ queryKey: s1Keys.audiences(), queryFn: fetchAudiences, enabled });
export const hkBoardQuery = (status: string, enabled = true) => queryOptions({ queryKey: s1Keys.hkBoard(status), queryFn: () => fetchHkBoard(status), enabled });
export const hkMineQuery = (enabled = true) => queryOptions({ queryKey: s1Keys.hkMine(), queryFn: fetchHkMine, enabled });
export const hkSettingsQuery = (enabled = true) => queryOptions({ queryKey: s1Keys.hkSettings(), queryFn: fetchHkSettings, enabled });
export const vehiclesQuery = (enabled = true) => queryOptions({ queryKey: s1Keys.vehicles(), queryFn: fetchVehicles, enabled, staleTime: 5 * 60_000 });

const nextPage = <T extends { items: unknown[]; total: number; page: number }>(last: T, all: T[]) =>
  all.reduce((n, p) => n + p.items.length, 0) < last.total && last.items.length > 0 ? last.page + 1 : undefined;
export const waitlistInfinite = (f: { status: string; q: string; from?: string | null; to?: string | null }, enabled = true) =>
  infiniteQueryOptions({
    queryKey: s1Keys.waitlist(JSON.stringify(f)),
    queryFn: ({ pageParam }) => fetchWaitlist(f, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    enabled,
  });
export const hkTasksInfinite = (f: HkTaskFilter, enabled = true) =>
  infiniteQueryOptions({
    queryKey: s1Keys.hkTasks(JSON.stringify(f)),
    queryFn: ({ pageParam }) => fetchHkTasks(f, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    enabled,
  });
export const transfersInfinite = (f: TransferFilter, enabled = true) =>
  infiniteQueryOptions({
    queryKey: s1Keys.transfers(JSON.stringify(f)),
    queryFn: ({ pageParam }) => fetchTransfers(f, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    enabled,
  });

// ── Writes (bodies are STRICT on the server) ──
async function multipart<T>(method: 'put' | 'post', url: string, file: UploadFile): Promise<T> {
  const fd = new FormData();
  await appendFile(fd, 'file', file);
  const config = { headers: { 'Content-Type': 'multipart/form-data' } };
  return (method === 'put' ? apiClient.put<T>(url, fd, config) : apiClient.post<T>(url, fd, config)).then((r) => r.data);
}

export const saveFeatures = (features: Record<string, boolean>) =>
  apiClient.patch(SANATORIUM_FEATURES, { features }).then((r) => unwrapList<FeatureRow>(r.data));
export const saveStage = ({ id, body }: { id?: number; body: Json }) =>
  (id ? apiClient.put(SANATORIUM_JOURNEY_STAGE(id), body) : apiClient.post(SANATORIUM_JOURNEY_STAGES, body)).then((r) => r.data as JourneyStage);
export const deleteStage = (id: number) => apiClient.delete(SANATORIUM_JOURNEY_STAGE(id)).then((r) => r.data);
export const reorderStages = (ids: number[]) => apiClient.put(SANATORIUM_JOURNEY_STAGES_ORDER, { ids }).then((r) => r.data);
export const saveJourneySettings = (body: JourneySettings) => apiClient.patch(SANATORIUM_JOURNEY_SETTINGS, body).then((r) => r.data);
export const moveStay = ({ stayId, stage_id, note }: { stayId: number; stage_id: number; note?: string }) =>
  apiClient.post<JourneyStayInfo>(SANATORIUM_JOURNEY_STAY_STAGE(stayId), { stage_id, ...(note ? { note } : {}) }).then((r) => r.data);

export const saveLocation = (body: SanLocation) => apiClient.put(SANATORIUM_LOCATION, body).then((r) => r.data);

export const uploadPlan = (file: UploadFile) => multipart<TerritoryPlan>('put', SANATORIUM_TERRITORY_PLAN, file);
export const deletePlan = () => apiClient.delete(SANATORIUM_TERRITORY_PLAN).then((r) => r.data);
export const savePoi = ({ id, body }: { id?: number; body: Json }) =>
  (id ? apiClient.put(SANATORIUM_TERRITORY_POI(id), body) : apiClient.post(SANATORIUM_TERRITORY_POIS, body)).then((r) => r.data as Poi);
export const deletePoi = (id: number) => apiClient.delete(SANATORIUM_TERRITORY_POI(id)).then((r) => r.data);
export const reorderPois = (ids: number[]) => apiClient.put(SANATORIUM_TERRITORY_POIS_ORDER, { ids }).then((r) => r.data);

export const saveInfoSection = ({ id, body }: { id?: number; body: Json }) =>
  (id ? apiClient.put(SANATORIUM_INFO_SECTION(id), body) : apiClient.post(SANATORIUM_INFO_SECTIONS, body)).then((r) => r.data as InfoSection);
export const deleteInfoSection = (id: number) => apiClient.delete(SANATORIUM_INFO_SECTION(id)).then((r) => r.data);
export const reorderInfoSections = (ids: number[]) => apiClient.put(SANATORIUM_INFO_SECTIONS_ORDER, { ids }).then((r) => r.data);
export const uploadInfoPhoto = ({ id, file }: { id: number; file: UploadFile }) => multipart<InfoSection>('put', SANATORIUM_INFO_SECTION_PHOTO(id), file);
export const deleteInfoPhoto = (id: number) => apiClient.delete(SANATORIUM_INFO_SECTION_PHOTO(id)).then((r) => r.data);

export const uploadBroadcastPhoto = (file: UploadFile) =>
  multipart<{ photo_key: string; url: string; thumb_url: string }>('post', SANATORIUM_BROADCAST_PHOTO, file);
export const sendBroadcast = (body: Json) => apiClient.post<Broadcast>(SANATORIUM_BROADCASTS, body).then((r) => r.data);
export const fetchBroadcast = (id: number) => apiClient.get<Broadcast>(SANATORIUM_BROADCAST(id)).then((r) => r.data);

export const createWaitlist = (body: Json) => apiClient.post<WaitlistItem>(SANATORIUM_WAITLIST, body).then((r) => r.data);
export const patchWaitlist = ({ id, body }: { id: number; body: Json }) => apiClient.patch<WaitlistItem>(SANATORIUM_WAITLIST_ITEM(id), body).then((r) => r.data);
export const convertWaitlist = ({ id, body }: { id: number; body: Json }) => apiClient.post(SANATORIUM_WAITLIST_CONVERT(id), body).then((r) => r.data);
export const cancelWaitlist = ({ id, reason }: { id: number; reason?: string }) =>
  apiClient.post(SANATORIUM_WAITLIST_CANCEL(id), reason ? { reason } : {}).then((r) => r.data);

export const setRoomHkStatus = ({ roomId, status, note }: { roomId: number; status: HkStatus; note?: string }) =>
  apiClient.patch(SANATORIUM_ROOM_HK_STATUS(roomId), { status, ...(note ? { note } : {}) }).then((r) => r.data);
export const saveHkTask = ({ id, body }: { id?: number; body: Json }) =>
  (id ? apiClient.patch(SANATORIUM_HK_TASK(id), body) : apiClient.post(SANATORIUM_HK_TASKS, body)).then((r) => r.data as HkTask);
export const deleteHkTask = (id: number) => apiClient.delete(SANATORIUM_HK_TASK(id)).then((r) => r.data);
export const startHkTask = (id: number) => apiClient.post(SANATORIUM_HK_TASK_START(id)).then((r) => r.data);
export const doneHkTask = (id: number) => apiClient.post(SANATORIUM_HK_TASK_DONE(id)).then((r) => r.data);
export const saveHkSettings = (linen_change_days: number) => apiClient.patch(SANATORIUM_HK_SETTINGS, { linen_change_days }).then((r) => r.data);

export const createTransfer = (body: Json) => apiClient.post<Transfer>(SANATORIUM_TRANSFERS, body).then((r) => r.data);
export const patchTransfer = ({ id, body }: { id: number; body: Json }) => apiClient.patch<Transfer>(SANATORIUM_TRANSFER(id), body).then((r) => r.data);

const meta = { skipErrorToast: true };
function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: SAN_FEATURES_KEY });
    return qc.invalidateQueries({ queryKey: sanKeys.all });
  };
}
const hook = <V, R>(fn: (v: V) => Promise<R>) =>
  function useSection1Mutation() {
    const onSuccess = useInvalidate();
    return useMutation({ meta, mutationFn: fn, onSuccess });
  };

export const useSaveFeatures = hook(saveFeatures);
export const useSaveStage = hook(saveStage);
export const useDeleteStage = hook(deleteStage);
export const useReorderStages = hook(reorderStages);
export const useSaveJourneySettings = hook(saveJourneySettings);
export const useMoveStay = hook(moveStay);
export const useSaveLocation = hook(saveLocation);
export const useUploadPlan = hook(uploadPlan);
export const useDeletePlan = hook(deletePlan);
export const useSavePoi = hook(savePoi);
export const useDeletePoi = hook(deletePoi);
export const useReorderPois = hook(reorderPois);
export const useSaveInfoSection = hook(saveInfoSection);
export const useDeleteInfoSection = hook(deleteInfoSection);
export const useReorderInfoSections = hook(reorderInfoSections);
export const useUploadInfoPhoto = hook(uploadInfoPhoto);
export const useDeleteInfoPhoto = hook(deleteInfoPhoto);
export const useUploadBroadcastPhoto = hook(uploadBroadcastPhoto);
export const useSendBroadcast = hook(sendBroadcast);
export const useCreateWaitlist = hook(createWaitlist);
export const usePatchWaitlist = hook(patchWaitlist);
export const useConvertWaitlist = hook(convertWaitlist);
export const useCancelWaitlist = hook(cancelWaitlist);
export const useSetRoomHkStatus = hook(setRoomHkStatus);
export const useSaveHkTask = hook(saveHkTask);
export const useDeleteHkTask = hook(deleteHkTask);
export const useStartHkTask = hook(startHkTask);
export const useDoneHkTask = hook(doneHkTask);
export const useSaveHkSettings = hook(saveHkSettings);
export const useCreateTransfer = hook(createTransfer);
export const usePatchTransfer = hook(patchTransfer);
