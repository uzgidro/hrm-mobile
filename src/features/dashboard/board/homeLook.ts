// The home screen's design: ground, accent, cards, corners, spacing — and the look of one
// block. Pure: a stored value is read field by field, what is unknown falls out.
import { ACCENTS, GROUNDS, type Accent, type Ground } from '@/theme/accents';
import { CARD_STYLES, type CardStyle } from '@/theme/CardLook';

export const HOME_RADII = [4, 10, 18, 26] as const;
export const HOME_GAPS = [8, 12, 20] as const;
export const DEFAULT_RADIUS = 18;
export const DEFAULT_GAP = 12;

export interface HomeLook {
  bg?: Ground;
  accent?: Accent;
  card?: CardStyle;
  radius?: (typeof HOME_RADII)[number];
  gap?: (typeof HOME_GAPS)[number];
}

export interface BlockLook {
  /** The person's own name for a module card, a page button or a note. */
  title?: string;
  /** Body of a note. */
  text?: string;
  accent?: Accent;
}

export const TITLE_MAX = 60;
export const TEXT_MAX = 600;

const oneOf = <T,>(v: unknown, list: readonly T[]): T | undefined => list.find((x) => x === v);
const text = (v: unknown, max: number): string | undefined =>
  typeof v === 'string' && v.trim() ? v.slice(0, max) : undefined;

/** Without the fields that say nothing, so equal designs compare equal. */
function compact<T extends object>(o: T): T | undefined {
  const out = Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
  return Object.keys(out).length ? (out as T) : undefined;
}

export function readLook(raw: unknown): HomeLook | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const bg = oneOf(r.bg, GROUNDS);
  const card = oneOf(r.card, CARD_STYLES);
  const radius = oneOf(r.radius, HOME_RADII);
  const gap = oneOf(r.gap, HOME_GAPS);
  return compact<HomeLook>({
    bg: bg === 'plain' ? undefined : bg,
    accent: oneOf(r.accent, ACCENTS),
    card: card === 'soft' ? undefined : card,
    radius: radius === DEFAULT_RADIUS ? undefined : radius,
    gap: gap === DEFAULT_GAP ? undefined : gap,
  });
}

export function readBlockLook(raw: unknown): BlockLook | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  return compact<BlockLook>({ title: text(r.title, TITLE_MAX), text: text(r.text, TEXT_MAX), accent: oneOf(r.accent, ACCENTS) });
}
