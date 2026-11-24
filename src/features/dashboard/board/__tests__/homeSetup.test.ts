import type { User } from '@/types';
import { CUSTOM_MAX, customOf, normaliseSetup, offeredKeys, sameSetup, setupOf, visibleHome, type HomeBlockKey } from '../homeBlocks';
import { homeLayout } from '../homeLayout';

const employee = { id: 1, type: 'employee', employee: { id: 7 } } as unknown as User;
const master = { id: 3, type: 'master-admin' } as unknown as User;

describe('normaliseSetup', () => {
  it('reads added blocks, the design and single looks; drops what it does not know', () => {
    expect(
      normaliseSetup(
        {
          board: 'employee',
          blocks: ['hero', 'mod:orders', 'page:kpi', 'note:abc1', 'mod:kpi', 'page:nope', 'page:home', 'note:!!', 'x:y'],
          look: { bg: 'sky', accent: 'azure', card: 'neon', radius: 18, gap: 8 },
          items: {
            'note:abc1': { title: 'Reja', text: 'Salom', accent: 'pink' },
            'page:kpi': { accent: 'green' },
            'page:gone': { title: 'x' },
            hero: 'x',
          },
        },
        'employee',
      ),
    ).toEqual({
      blocks: ['hero', 'mod:orders', 'page:kpi', 'note:abc1'],
      look: { bg: 'sky', accent: 'azure', gap: 8 },
      items: { 'note:abc1': { title: 'Reja', text: 'Salom' }, 'page:kpi': { accent: 'green' } },
    });
  });
  it('a config of the version before has no design', () =>
    expect(normaliseSetup({ board: 'employee', blocks: ['week'] }, 'employee')).toEqual({ blocks: ['week'] }));
  it('keeps at most the allowed number of each kind', () => {
    const notes = Array.from({ length: 9 }, (_, i) => `note:n${i}`);
    expect(normaliseSetup({ blocks: notes }, 'leader')?.blocks).toHaveLength(CUSTOM_MAX.note);
  });
});

it('the default design is no design: going back to it is not a change', () => {
  expect(setupOf(['week'], { bg: 'plain', card: 'soft', radius: 18, gap: 12 }, {})).toEqual({ blocks: ['week'] });
  expect(sameSetup(setupOf(['week'], {}, { week: {} }), { blocks: ['week'] })).toBe(true);
});

describe('rights', () => {
  const all = ['mod:employees', 'page:employees', 'mod:chrono', 'note:a'] as HomeBlockKey[];
  it('a page the account may not open is neither drawn nor offered', () => {
    const drawn = visibleHome(all, employee, 'employee');
    expect(drawn).not.toContain('mod:employees');
    expect(drawn).not.toContain('page:employees');
    expect(offeredKeys('page', employee, 'employee')).not.toContain('page:employees');
    expect(offeredKeys('page', master, 'leader')).toContain('page:employees');
  });
  it('a list about the person needs an employee card; a note is always theirs', () => {
    expect(visibleHome(all, master, 'leader')).not.toContain('mod:chrono');
    expect(visibleHome(['note:a'], master, 'leader')).toEqual(['note:a']);
  });
  it('the home page is not offered on itself', () =>
    expect(offeredKeys('page', master, 'leader').map((k) => customOf(k)?.id)).not.toContain('home'));
});

describe('layout', () => {
  const lay = (keys: HomeBlockKey[]) =>
    homeLayout({ board: 'employee', keys, sizeClass: 'medium', bentoColumns: 2 }).map(
      (s) => (s.grid ? '#' : '') + s.cells.map((c) => c.keys.join('+')).join(' '),
    );
  it('what is added below leaves the design alone; buttons share a grid', () =>
    expect(lay(['hero', 'timeline', 'stats', 'mod:orders', 'page:kpi', 'page:news', 'note:a'])).toEqual([
      'hero timeline+stats', 'mod:orders', '#page:kpi page:news', 'note:a',
    ]));
  it('added in between — everything flows in order', () =>
    expect(lay(['hero', 'page:kpi', 'week'])).toEqual(['hero', '#page:kpi', 'week']));
});
