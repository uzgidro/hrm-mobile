// WHAT THE HOME SCREEN IS MADE OF (2026-11-24: «every employee arranges their own
// home screen»). One catalogue of blocks for both boards (web v2 `boardConfig` is the
// counterpart; the blocks differ, so the storage key does too).
//
// The config is an ordered list of block keys: built-in blocks, plus the ones a person adds —
// a module's list (`mod:<page>`), a button to a page (`page:<page>`), a note (`note:<id>`).
// A key the account may not read simply is not drawn — the config never grants access to anything. A block that is off is
// not mounted, so it asks the server for nothing.
import { CATALOG, type CatalogEntry } from '@/utils/moduleCatalog';
import type { IconName } from '@/components/Icon';
import type { ModuleTintKey } from '@/theme/tokens';
import type { User } from '@/types';
import { canAccessPage } from '@/utils/roles';
import type { HomeBoard } from '@/utils/homeBoard';
import { canSeeSanatorium } from '@/features/sanatorium/utils/sanatorium';
import { isFacePage } from '../faces/faceQueries';
import { readBlockLook, readLook, type BlockLook, type HomeLook } from './homeLook';

/** The boards a person can arrange; the other `HomeBoard`s live on other screens. */
export type HomeBoardKind = Extract<HomeBoard, 'employee' | 'leader'>;

export const HOME_BLOCK_KEYS = [
  'sanatorium', 'health', 'trip', 'leaves',
  'hero', 'timeline', 'stats', 'week',
  'tiles', 'live', 'status', 'birthdays', 'composition', 'discipline',
] as const;
export type BuiltinKey = (typeof HOME_BLOCK_KEYS)[number];
export type CustomKind = 'mod' | 'page' | 'note';
export type HomeBlockKey = BuiltinKey | `${CustomKind}:${string}`;

/** How many of each a person may keep: a module list asks the server, the others do not. */
export const CUSTOM_MAX: Record<CustomKind, number> = { mod: 6, page: 12, note: 4 };

/** `null` — a built-in block. */
export function customOf(key: HomeBlockKey): { kind: CustomKind; id: string } | null {
  const m = /^(mod|page|note):(.+)$/.exec(key);
  return m ? { kind: m[1] as CustomKind, id: m[2]! } : null;
}
export const entryOf = (page: string): CatalogEntry | undefined =>
  page === 'home' ? undefined : CATALOG.find((m) => m.page === page);

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

export const HOME_BLOCKS: Record<BuiltinKey, HomeBlockDef> = {
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

/** Module lists that are about the person: the server refuses them without an employee card. */
const FACES_WITH_CARD: readonly string[] = ['chrono', 'support'];

/** Title, icon and rights of any block; `undefined` — a page this version does not know. */
export function blockDef(key: HomeBlockKey): HomeBlockDef | undefined {
  const custom = customOf(key);
  if (!custom) return HOME_BLOCKS[key as BuiltinKey];
  if (custom.kind === 'note') {
    return { titleKey: 'dashboard.customise.note', icon: 'edit', tint: 'amber', available: () => true };
  }
  const entry = entryOf(custom.id);
  if (!entry || (custom.kind === 'mod' && !isFacePage(custom.id))) return undefined;
  return {
    titleKey: entry.labelKey,
    icon: entry.icon,
    tint: entry.tint,
    available: (u) =>
      canAccessPage(u, entry.page) && (custom.kind === 'page' || hasCard(u) || !FACES_WITH_CARD.includes(entry.page)),
  };
}

/** Pages the account may put on its home screen, as a button or as a list. */
export function offeredKeys(kind: 'mod' | 'page', user: User | null | undefined, board: HomeBoardKind): HomeBlockKey[] {
  const pages = [...new Set(CATALOG.map((m) => m.page))];
  return pages
    .map((page) => `${kind}:${page}` as HomeBlockKey)
    .filter((k) => isHomeBlockAvailable(k, user, board));
}

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

const isKey = (k: unknown): k is HomeBlockKey => {
  if (typeof k !== 'string') return false;
  if ((HOME_BLOCK_KEYS as readonly string[]).includes(k)) return true;
  const custom = customOf(k as HomeBlockKey);
  if (!custom) return false;
  return custom.kind === 'note' ? /^[a-z0-9]{1,12}$/.test(custom.id) : blockDef(k as HomeBlockKey) !== undefined;
};

/** Over the limit of its kind: the server may hold anything, the screen draws a bounded number. */
function withinLimits(keys: HomeBlockKey[]): HomeBlockKey[] {
  const n: Record<CustomKind, number> = { mod: 0, page: 0, note: 0 };
  return keys.filter((k) => {
    const custom = customOf(k);
    return !custom || ++n[custom.kind] <= CUSTOM_MAX[custom.kind];
  });
}

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
  const out = withinLimits([...new Set(r.blocks.filter(isKey))]);
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
  blockDef(k)?.available(user, board) ?? false;

/** The part of the config this account may see, in order. */
export const visibleHome = (blocks: readonly HomeBlockKey[], user: User | null | undefined, board: HomeBoardKind) =>
  blocks.filter((k) => isHomeBlockAvailable(k, user, board));

/** Everything a person decides about their home screen. */
export interface HomeSetup {
  blocks: HomeBlockKey[];
  look?: HomeLook;
  /** Name, colour and text of single blocks. */
  items?: Record<string, BlockLook>;
}

/** A setup in the one shape it is saved and compared in. */
export function setupOf(blocks: HomeBlockKey[], look?: unknown, items?: unknown): HomeSetup {
  const cleanLook = readLook(look);
  const raw = items && typeof items === 'object' ? (items as Record<string, unknown>) : {};
  const kept = blocks
    .map((k) => [k, readBlockLook(raw[k])] as const)
    .filter((e): e is [HomeBlockKey, BlockLook] => e[1] !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : 1));
  return { blocks, ...(cleanLook && { look: cleanLook }), ...(kept.length > 0 && { items: Object.fromEntries(kept) }) };
}

/** A stored config made safe to draw; `null` — see `normaliseHome`. */
export function normaliseSetup(raw: unknown, board: HomeBoardKind): HomeSetup | null {
  const blocks = normaliseHome(raw, board);
  if (!blocks) return null;
  const r = raw as Record<string, unknown>;
  return setupOf(blocks, r.look, r.items);
}

/** The standard of a role with its design. */
export function standardSetup(defaults: unknown, board: HomeBoardKind, role: string): HomeSetup {
  const stored = (defaults as Record<string, unknown> | null | undefined)?.[roleHomeKey(role)];
  return normaliseSetup(stored, board) ?? { blocks: builtinHome(board) };
}

export const sameSetup = (a: HomeSetup, b: HomeSetup) => JSON.stringify(a) === JSON.stringify(b);

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
