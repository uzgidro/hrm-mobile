// WHAT THE HOME SCREEN IS MADE OF (2026-11-24: «every employee arranges their own
// home screen»). One catalogue of blocks for both boards (web v2 `boardConfig` is the
// counterpart; the blocks differ, so the storage key does too).
//
// The config is an ordered list of block keys. A key the account may not read simply
// is not drawn — the config never grants access to anything. A block that is off is
// not mounted, so it asks the server for nothing.
import type { IconName } from '@/components/Icon';
import type { ModuleTintKey } from '@/theme/tokens';
import type { User } from '@/types';
import { canAccessPage } from '@/utils/roles';
import type { HomeBoard } from '@/utils/homeBoard';
import { canSeeSanatorium } from '@/features/sanatorium/utils/sanatorium';

/** The boards a person can arrange; the other `HomeBoard`s live on other screens. */
export type HomeBoardKind = Extract<HomeBoard, 'employee' | 'leader'>;

export const HOME_BLOCK_KEYS = [
  'sanatorium', 'health', 'trip', 'leaves',
  'hero', 'timeline', 'stats', 'week',
  'tiles', 'live', 'status', 'birthdays', 'composition', 'discipline',
] as const;
export type HomeBlockKey = (typeof HOME_BLOCK_KEYS)[number];

export interface HomeBlockDef {
  titleKey: string;
  /** Shown under the title in the editor: when the block appears at all. */
  hintKey?: string;
  icon: IconName;
  tint: ModuleTintKey;
  /** May this account see the block on this board? */
  available: (user: User | null | undefined, board: HomeBoardKind) => boolean;
}

const hasCard = (user: User | null | undefined) => !!user?.employee?.id;
/** «My day» blocks: the employee board always; elsewhere only with an employee card. */
const mine: HomeBlockDef['available'] = (user, board) => board === 'employee' || hasCard(user);
const apparatus: HomeBlockDef['available'] = (_user, board) => board === 'leader';

export const HOME_BLOCKS: Record<HomeBlockKey, HomeBlockDef> = {
  sanatorium: {
    titleKey: 'sanatorium.title',
    icon: 'sun',
    tint: 'cyan',
    available: (u) => !!u?.sanatorium_home && canSeeSanatorium(u),
  },
  health: {
    titleKey: 'health.title',
    icon: 'check',
    tint: 'pink',
    available: (u) => !!u?.nurse_branch_ids?.length && canAccessPage(u, 'health'),
  },
  trip: {
    titleKey: 'dashboard.customise.blockTrip',
    hintKey: 'dashboard.customise.blockTripHint',
    icon: 'mapPin',
    tint: 'drop',
    available: hasCard,
  },
  leaves: {
    titleKey: 'leaves.homeTitle',
    icon: 'calendar',
    tint: 'orange',
    available: (u) => !!u?.employee && canAccessPage(u, 'requests'),
  },
  hero: { titleKey: 'dashboard.home.myDay', icon: 'user', tint: 'violet', available: mine },
  timeline: { titleKey: 'dashboard.home.todayPath', icon: 'clock', tint: 'violet', available: mine },
  stats: { titleKey: 'dashboard.customise.blockStats', icon: 'grid', tint: 'green', available: mine },
  week: { titleKey: 'dashboard.home.myWeek', icon: 'calendar', tint: 'green', available: mine },
  tiles: { titleKey: 'dashboard.customise.blockTiles', icon: 'grid', tint: 'violet', available: apparatus },
  live: { titleKey: 'dashboard.home.live', icon: 'eye', tint: 'green', available: apparatus },
  status: { titleKey: 'dashboard.home.todayStatus', icon: 'chart', tint: 'violet', available: apparatus },
  birthdays: { titleKey: 'dashboard.home.birthdays', icon: 'gift', tint: 'pink', available: () => true },
  composition: { titleKey: 'dashboard.home.composition', icon: 'users', tint: 'violet', available: apparatus },
  discipline: { titleKey: 'dashboard.home.discipline', icon: 'checklist', tint: 'pink', available: apparatus },
};

/** Blocks drawn from the leader's day board (one pair of requests between them). */
export const DAY_BLOCKS: readonly HomeBlockKey[] = ['tiles', 'live', 'status'];

/**
 * The designed home, before the administrator or the person changes it. It also lists the
 * cards that depend on the account (nurse, sanatorium, trip): a person who becomes a nurse
 * later gets the card where the design puts it.
 */
const BUILTIN: Record<HomeBoardKind, readonly HomeBlockKey[]> = {
  employee: ['sanatorium', 'health', 'trip', 'hero', 'timeline', 'stats', 'week', 'birthdays'],
  leader: [
    'sanatorium', 'health', 'trip', 'leaves',
    'tiles', 'live', 'status', 'birthdays', 'composition', 'discipline',
  ],
};
export const builtinHome = (board: HomeBoardKind): HomeBlockKey[] => [...BUILTIN[board]];

const isKey = (k: unknown): k is HomeBlockKey => (HOME_BLOCK_KEYS as readonly unknown[]).includes(k);

/**
 * A stored config made safe to draw: unknown and repeated keys dropped. `null` — not a
 * usable config for this board, the caller falls back to the next level. An empty list
 * is a valid choice; a list whose every key is unknown is not.
 *
 * A config names the board it was made on. The same account can move to the other board
 * (an employee becomes HR), and an arrangement of one is meaningless on the other.
 */
export function normaliseHome(raw: unknown, board: HomeBoardKind): HomeBlockKey[] | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.blocks)) return null;
  if (r.board != null && r.board !== board) return null;
  const out = [...new Set(r.blocks.filter(isKey))];
  return out.length === 0 && r.blocks.length > 0 ? null : out;
}

/** Key of a role's mobile standard inside the `dashboard.defaults` system setting. */
export const roleHomeKey = (role: string) => `mobile:${role}`;

/** The standard of a role: the administrator's, else the designed one. */
export function standardHome(defaults: unknown, board: HomeBoardKind, role: string): HomeBlockKey[] {
  const stored =
    defaults && typeof defaults === 'object' && !Array.isArray(defaults)
      ? (defaults as Record<string, unknown>)[roleHomeKey(role)]
      : undefined;
  return normaliseHome(stored, board) ?? builtinHome(board);
}

export const isHomeBlockAvailable = (k: HomeBlockKey, user: User | null | undefined, board: HomeBoardKind) =>
  HOME_BLOCKS[k].available(user, board);

/** The part of the config this account may see, in order. */
export const visibleHome = (blocks: readonly HomeBlockKey[], user: User | null | undefined, board: HomeBoardKind) =>
  blocks.filter((k) => isHomeBlockAvailable(k, user, board));

export const sameHome = (a: readonly HomeBlockKey[], b: readonly HomeBlockKey[]) => a.join() === b.join();

/**
 * Moves the visible block at `from` to the visible position `to`. The full list may hold
 * blocks the account cannot see right now; they keep their places.
 */
export function reorderBlocks(
  blocks: readonly HomeBlockKey[],
  visible: readonly HomeBlockKey[],
  from: number,
  to: number,
): HomeBlockKey[] {
  const inside = (i: number) => Number.isInteger(i) && i >= 0 && i < visible.length;
  if (from === to || !inside(from) || !inside(to)) return [...blocks];
  const order = [...visible];
  order.splice(to, 0, ...order.splice(from, 1));
  let next = 0;
  return blocks.map((k) => (visible.includes(k) ? order[next++]! : k));
}

/** One step up (−1) or down (1) among the visible blocks. */
export const moveBlock = (
  blocks: readonly HomeBlockKey[],
  visible: readonly HomeBlockKey[],
  key: HomeBlockKey,
  dir: -1 | 1,
) => {
  const at = visible.indexOf(key);
  return reorderBlocks(blocks, visible, at, at + dir);
};
