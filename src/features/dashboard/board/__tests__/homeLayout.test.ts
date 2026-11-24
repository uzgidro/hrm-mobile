import { builtinHome, type HomeBlockKey, type HomeBoardKind } from '../homeBlocks';
import { followsDesign, homeLayout, type HomeSection } from '../homeLayout';

/** `[a]` — wide, `a+b` — stacked, `a:2` — span. */
const draw = (sections: HomeSection[]) =>
  sections.map((s) => {
    const cells = s.cells.map((c) => c.keys.join('+') + (c.span > 1 ? `:${c.span}` : '')).join(' ');
    return (s.dayError ? '!' : '') + (s.wide && cells ? `[${cells}]` : cells);
  });
const lay = (board: HomeBoardKind, keys: HomeBlockKey[], size: 'compact' | 'medium' | 'expanded', dayError = false) =>
  draw(homeLayout({ board, keys, sizeClass: size, bentoColumns: { compact: 1, medium: 2, expanded: 3 }[size], dayError }));

const TOP = ['[sanatorium]', '[health]', '[trip]'];

describe('the standard layout is the one shown before blocks could be arranged', () => {
  it.each(['compact', 'medium'] as const)('leader, %s', (size) =>
    expect(lay('leader', builtinHome('leader'), size)).toEqual([
      ...TOP, '[leaves]', '[tiles]', 'live status', 'birthdays composition discipline',
    ]));
  it('leader, expanded', () =>
    expect(lay('leader', builtinHome('leader'), 'expanded')).toEqual([
      ...TOP, '[leaves]', 'live composition tiles', 'status birthdays discipline',
    ]));
  it.each(['compact', 'medium'] as const)('employee, %s', (size) =>
    expect(lay('employee', builtinHome('employee'), size)).toEqual([...TOP, 'hero timeline+stats', 'week birthdays']));
  it('employee, expanded', () =>
    expect(lay('employee', builtinHome('employee'), 'expanded')).toEqual([...TOP, 'hero timeline+stats:2', 'week birthdays']));
});

describe('a missing block', () => {
  it('leaves the rest of the design in place', () => {
    expect(lay('leader', ['tiles', 'status', 'discipline'], 'expanded')).toEqual(['tiles', 'status discipline']);
    expect(lay('employee', ['hero', 'stats', 'birthdays'], 'expanded')).toEqual(['hero stats:2', 'birthdays']);
  });
  it('no hero — the timeline and the figures stand side by side', () =>
    expect(lay('employee', ['timeline', 'stats'], 'medium')).toEqual(['timeline stats']));
  it('nothing → no sections', () => expect(lay('leader', [], 'compact')).toEqual([]));
});

describe('own order', () => {
  it('cards flow in that order, wide ones take a row', () => {
    expect(lay('leader', ['birthdays', 'live', 'tiles', 'hero'], 'medium')).toEqual(['birthdays live', '[tiles]', 'hero']);
    expect(lay('leader', ['birthdays', 'live', 'tiles', 'leaves', 'status'], 'expanded')).toEqual([
      'birthdays live tiles', '[leaves]', 'status',
    ]);
  });
  it('followsDesign: a subsequence only', () => {
    expect(followsDesign(['tiles', 'discipline'], 'leader')).toBe(true);
    expect(followsDesign(['discipline', 'tiles'], 'leader')).toBe(false);
    expect(followsDesign(['tiles', 'hero'], 'leader')).toBe(false);
  });
});

describe('day data failed', () => {
  it('one error where the first day block stood, the other cards stay', () => {
    expect(lay('leader', builtinHome('leader'), 'medium', true)).toEqual([
      ...TOP, '[leaves]', '!', 'birthdays composition discipline',
    ]);
    expect(lay('leader', builtinHome('leader'), 'expanded', true)).toEqual([
      ...TOP, '[leaves]', '!composition', 'birthdays discipline',
    ]);
  });
});
