import { useEffect, useMemo, useState } from 'react';
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { UI_SETTING } from '@/api/urls';
import { loadDraft, saveDraft } from '@/lib/formDraft';
import { navSettingsQuery } from '@/lib/navSettings';
import { useAuthStore } from '@/store/authStore';
import { getRoleKey } from '@/utils/roles';
import {
  builtinHome,
  normaliseHome,
  standardHome,
  visibleHome,
  type HomeBlockKey,
  type HomeBoardKind,
} from './homeBlocks';

/** Separate from the web's `dashboard:board_hr|employee` — the blocks differ. */
export const HOME_SETTING_KEY = 'dashboard:board_mobile';
/** System setting with the administrator's standards (`mobile:<role>` is ours). */
export const BOARD_DEFAULTS_SETTING = 'dashboard.defaults';
/** Local copy for the first frame, in the per-user store that sign-out empties. */
export const HOME_LOCAL_KEY = 'home-board';
/** How long a device without a local copy waits for the answer before the standard is drawn. */
export const HOME_WAIT_MS = 2500;

export type HomeConfig = { board: HomeBoardKind; blocks: HomeBlockKey[] };
/** `custom: false` — the standard that was in force, so the next start need not wait for it. */
export type HomeLocalCopy = HomeConfig & { uid: number | string; custom: boolean };

export const homeKeys = {
  all: ['ui-settings'] as const,
  mine: (uid: number | string | undefined) => ['ui-settings', HOME_SETTING_KEY, uid ?? null] as const,
  local: (uid: number | string | undefined) => ['home-board-local', uid ?? null] as const,
};

/** The raw saved value, `null` when the person has saved nothing. */
export const fetchHomeConfig = (): Promise<unknown> =>
  apiClient.get<{ value?: unknown }>(UI_SETTING(HOME_SETTING_KEY)).then((r) => r.data?.value ?? null);
export const saveHomeConfig = (value: HomeConfig) => apiClient.put(UI_SETTING(HOME_SETTING_KEY), { value });
export const resetHomeConfig = () => apiClient.delete(UI_SETTING(HOME_SETTING_KEY));

export function homeConfigQuery(uid: number | string | undefined) {
  return queryOptions({
    queryKey: homeKeys.mine(uid),
    queryFn: fetchHomeConfig,
    staleTime: 10 * 60_000,
    retry: false,
    // Unreachable or an older server (404): the local copy / the standard stands in silently.
    meta: { skipErrorToast: true },
  });
}

/** `null` — no copy, a copy of another account, or something unreadable. */
export function readLocalCopy(raw: unknown, uid: number | string | undefined, board: HomeBoardKind) {
  const c = raw as Partial<HomeLocalCopy> | null | undefined;
  if (!c || uid == null || c.uid !== uid) return null;
  const blocks = normaliseHome(c, board);
  return blocks && { blocks, custom: c.custom === true };
}

/**
 * The signed-in person's home screen: their own arrangement, else the role's standard.
 * `board` is `null` on the boards that live on other screens — nothing is requested then.
 */
export function useHomeBoard(board: HomeBoardKind | null) {
  const user = useAuthStore((s) => s.user);
  const uid = user?.id;
  const qc = useQueryClient();
  const enabled = !!board && uid != null;
  const kind: HomeBoardKind = board ?? 'employee';

  const settings = useQuery({ ...navSettingsQuery(), enabled });
  const server = useQuery({ ...homeConfigQuery(uid), enabled });
  const localCopy = useQuery({
    queryKey: homeKeys.local(uid),
    queryFn: () => loadDraft<HomeLocalCopy>(HOME_LOCAL_KEY),
    enabled,
    staleTime: Infinity,
    networkMode: 'always',
    retry: false,
    meta: { skipErrorToast: true },
  });

  const local = useMemo(() => readLocalCopy(localCopy.data, uid, kind), [localCopy.data, uid, kind]);
  const role = getRoleKey(user);
  const defaults = settings.data?.values?.[BOARD_DEFAULTS_SETTING];
  const answered = settings.data !== undefined;
  const standard = useMemo(() => {
    if (answered) return standardHome(defaults, kind, role);
    return local && !local.custom ? local.blocks : builtinHome(kind);
  }, [answered, defaults, kind, role, local]);

  // `undefined` — not answered (or the store is unreachable): the local copy stands in.
  // `null` — answered, nothing saved: the standard applies.
  const mine = useMemo(() => {
    if (server.data !== undefined) return normaliseHome(server.data, kind);
    return local?.custom ? local.blocks : null;
  }, [server.data, kind, local]);
  const config = mine ?? standard;
  const isCustom = mine != null;

  // Keep the local copy equal to what the server last said. Guarded by the CURRENT account:
  // an answer that outlives a sign-out must not be filed under the next person.
  const known = enabled && server.data !== undefined && (isCustom || answered);
  const blocksKey = config.join();
  useEffect(() => {
    if (!known || uid == null || useAuthStore.getState().user?.id !== uid) return;
    const copy: HomeLocalCopy = { uid, board: kind, custom: isCustom, blocks: config };
    void saveDraft(HOME_LOCAL_KEY, copy);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `blocksKey` stands for `config`
  }, [known, uid, kind, isCustom, blocksKey]);

  // A device with no local copy waits for the answer: drawing the standard first would ask
  // for every block the person has removed and then swap the screen under their eyes.
  const [waitedFor, setWaitedFor] = useState<typeof uid>(undefined);
  useEffect(() => {
    if (!enabled) return;
    const id = setTimeout(() => setWaitedFor(uid), HOME_WAIT_MS);
    return () => clearTimeout(id);
  }, [enabled, uid]);
  const waited = waitedFor === uid;
  const localRead = !enabled || !localCopy.isLoading;
  const ready = localRead && (!enabled || local != null || waited || (!server.isLoading && !settings.isLoading));

  const queryKey = homeKeys.mine(uid);
  const save = useMutation({
    mutationFn: (blocks: HomeBlockKey[]) => saveHomeConfig({ board: kind, blocks }),
    // A read already in flight would put the old arrangement back.
    onMutate: () => qc.cancelQueries({ queryKey }),
    onSuccess: (_r, blocks) => qc.setQueryData(queryKey, { board: kind, blocks }),
  });
  const reset = useMutation({
    mutationFn: resetHomeConfig,
    onMutate: () => qc.cancelQueries({ queryKey }),
    onSuccess: () => qc.setQueryData(queryKey, null),
  });

  // `canAccessPage` reads the module matrix that arrives with the settings.
  const visible = useMemo(
    () => visibleHome(config, user, kind),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config, user, kind, settings.data],
  );

  return { localRead, ready, config, visible, standard, isCustom, save, reset };
}

export type HomeBoardState = ReturnType<typeof useHomeBoard>;
