// Where the blocks of the home screen stand. Pure — every branch is tested.
//
// While the person keeps the designed ORDER (blocks may be missing), the designed
// composition holds: it is today's layout for every screen width, rows and all. Once the
// order is their own, the blocks simply flow in that order: cards share bento rows, the
// wide ones take a row of their own.
import type { SizeClass } from '@/utils/responsive';
import { DAY_BLOCKS, builtinHome, customOf, type BuiltinKey, type HomeBlockKey, type HomeBoardKind } from './homeBlocks';

export interface HomeCell {
  /** More than one key — the cards are stacked in one cell. */
  keys: HomeBlockKey[];
  span: number;
}
export interface HomeSection {
  cells: HomeCell[];
  /** One full-width block, outside any bento row. */
  wide?: boolean;
  /** Page buttons, several in a row. */
  grid?: boolean;
  /** The leader's day data failed: draw one error state before this section. */
  dayError?: boolean;
}

/** Cards that stand above the board and carry their own bottom margin. */
export const TOP_CARDS: readonly HomeBlockKey[] = ['sanatorium', 'health', 'trip'];
const WIDE: readonly HomeBlockKey[] = [...TOP_CARDS, 'leaves'];

const cell = (keys: HomeBlockKey[], span = 1): HomeCell => ({ keys, span });

/** Is `keys` the designed order with some blocks missing? */
export function followsDesign(keys: readonly HomeBlockKey[], board: HomeBoardKind): boolean {
  let at = -1;
  const design = builtinHome(board);
  return keys.every((k) => {
    const i = design.indexOf(k as BuiltinKey);
    if (i <= at) return false;
    at = i;
    return true;
  });
}

function designed(board: HomeBoardKind, sizeClass: SizeClass, bentoColumns: number, has: (k: HomeBlockKey) => boolean): HomeSection[] {
  const top: HomeSection[] = WIDE.map((k) => ({ wide: true, cells: [cell([k])] }));
  if (board === 'employee') {
    const side: HomeCell[] = has('hero')
      ? [cell(['timeline', 'stats'], bentoColumns >= 3 ? 2 : 1)]
      : [cell(['timeline']), cell(['stats'])];
    return [...top, { cells: [cell(['hero']), ...side] }, { cells: [cell(['week']), cell(['birthdays'])] }];
  }
  if (sizeClass === 'expanded') {
    return [
      ...top,
      { cells: [cell(['live']), cell(['composition']), cell(['tiles'])] },
      { cells: [cell(['status']), cell(['birthdays']), cell(['discipline'])] },
    ];
  }
  return [
    ...top,
    { wide: true, cells: [cell(['tiles'])] },
    { cells: [cell(['live']), cell(['status'])] },
    { cells: [cell(['birthdays']), cell(['composition']), cell(['discipline'])] },
  ];
}

function flowing(sizeClass: SizeClass, keys: readonly HomeBlockKey[]): HomeSection[] {
  const out: HomeSection[] = [];
  for (const k of keys) {
    const button = customOf(k)?.kind === 'page';
    const wide = WIDE.includes(k) || (k === 'tiles' && sizeClass !== 'expanded');
    const last = out[out.length - 1];
    if (button) {
      if (last?.grid) last.cells.push(cell([k]));
      else out.push({ grid: true, cells: [cell([k])] });
    } else if (wide || !last || last.wide || last.grid) out.push({ ...(wide && { wide }), cells: [cell([k])] });
    else last.cells.push(cell([k]));
  }
  return out;
}

export function homeLayout({
  board,
  keys,
  sizeClass,
  bentoColumns,
  dayError = false,
}: {
  board: HomeBoardKind;
  /** Blocks to draw, in the person's order. */
  keys: readonly HomeBlockKey[];
  sizeClass: SizeClass;
  bentoColumns: number;
  dayError?: boolean;
}): HomeSection[] {
  const has = (k: HomeBlockKey) => keys.includes(k);
  // What a person added below the designed blocks does not take the composition apart.
  const added = keys.findIndex((k) => customOf(k));
  const head = added < 0 ? keys : keys.slice(0, added);
  const tail = added < 0 ? [] : keys.slice(added);
  const raw =
    followsDesign(head, board) && tail.every((k) => customOf(k))
      ? [...designed(board, sizeClass, bentoColumns, has), ...flowing(sizeClass, tail)]
      : flowing(sizeClass, keys);
  const drop = (s: HomeSection, gone: (k: HomeBlockKey) => boolean): HomeSection => ({
    ...s,
    cells: s.cells.map((c) => ({ ...c, keys: c.keys.filter((k) => !gone(k)) })).filter((c) => c.keys.length > 0),
  });
  const sections = raw.map((s) => drop(s, (k) => !has(k))).filter((s) => s.cells.length > 0);
  if (!dayError) return sections;

  // One error in place of the blocks that share the failed requests (a counter that
  // silently reads 0 would lie); the other cards keep their own data.
  const first = sections.findIndex((s) => s.cells.some((c) => c.keys.some((k) => DAY_BLOCKS.includes(k))));
  return sections
    .map((s, i) => ({ ...drop(s, (k) => DAY_BLOCKS.includes(k)), ...(i === first && { dayError: true }) }))
    .filter((s) => s.cells.length > 0 || s.dayError);
}
