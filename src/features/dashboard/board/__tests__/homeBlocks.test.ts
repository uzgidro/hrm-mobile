import type { User } from '@/types';
import {
  HOME_BLOCK_KEYS,
  builtinHome,
  moveBlock,
  normaliseHome,
  standardHome,
  visibleHome,
  type HomeBlockKey,
} from '../homeBlocks';
import { readLocalCopy } from '../useHomeBoard';

const employee = { id: 1, type: 'employee', employee: { id: 7 } } as unknown as User;
const role = (r: string, extra: object = {}) =>
  ({ id: 2, type: 'employee', employee: { id: 8, is_multi_org_user: true, multi_org_employee_role: r }, ...extra }) as unknown as User;
const master = { id: 3, type: 'master-admin' } as unknown as User;

describe('normaliseHome', () => {
  it('keeps order, drops unknown and repeated keys', () => {
    expect(normaliseHome({ blocks: ['live', 'nope', 'tiles', 'live', 5, null] }, 'leader')).toEqual(['live', 'tiles']);
  });
  it('an empty list is a choice; a list of unknown keys is not a config', () => {
    expect(normaliseHome({ blocks: [] }, 'leader')).toEqual([]);
    expect(normaliseHome({ blocks: ['gone'] }, 'leader')).toBeNull();
  });
  it.each([null, undefined, 'x', 3, [], ['tiles'], {}, { blocks: 'tiles' }])('not a config: %p', (raw) => {
    expect(normaliseHome(raw, 'leader')).toBeNull();
  });
  it('an arrangement of the other board is ignored', () => {
    expect(normaliseHome({ board: 'employee', blocks: ['hero'] }, 'leader')).toBeNull();
    expect(normaliseHome({ board: 'leader', blocks: ['tiles'] }, 'leader')).toEqual(['tiles']);
  });
});

describe('standardHome', () => {
  it("the administrator's mobile:<role> wins over the designed one", () => {
    const defaults = { 'mobile:hr': { blocks: ['birthdays', 'tiles'] }, 'hr:hr': { main: ['tasks'] } };
    expect(standardHome(defaults, 'leader', 'hr')).toEqual(['birthdays', 'tiles']);
    expect(standardHome(defaults, 'leader', 'deputy')).toEqual(builtinHome('leader'));
  });
  it.each([undefined, null, 'x', [], { 'mobile:hr': { main: [] } }, { 'mobile:hr': { blocks: ['gone'] } }])(
    'invalid → designed: %p',
    (defaults) => expect(standardHome(defaults, 'leader', 'hr')).toEqual(builtinHome('leader')),
  );
});

describe("the standard shows exactly today's blocks per role", () => {
  const LEADER: HomeBlockKey[] = ['tiles', 'live', 'status', 'birthdays', 'composition', 'discipline'];
  const EMPLOYEE: HomeBlockKey[] = ['trip', 'hero', 'timeline', 'stats', 'week', 'birthdays'];
  const show = (u: User, board: 'employee' | 'leader') => visibleHome(builtinHome(board), u, board);

  it('employee', () => expect(show(employee, 'employee')).toEqual(EMPLOYEE));
  it('an employee account without a card still sees its board', () =>
    expect(show({ id: 9, type: 'employee' } as unknown as User, 'employee')).toEqual(EMPLOYEE.filter((k) => k !== 'trip')));
  it.each(['hr', 'deputy', 'ministr', 'accounting', 'dashboard', 'nazoratchi'])('%s', (r) =>
    expect(show(role(r), 'leader')).toEqual(['trip', 'leaves', ...LEADER]));
  it('master admin — no employee card, no personal cards', () => expect(show(master, 'leader')).toEqual(LEADER));
  it('nurse and sanatorium staff: their cards are on top', () => {
    const staff = { ...employee, nurse_branch_ids: [1], sanatorium_home: true, sanatorium_roles: ['registrar'] } as unknown as User;
    expect(show(staff, 'employee')).toEqual(['sanatorium', 'health', ...EMPLOYEE]);
    expect(show({ ...employee, sanatorium_home: true } as User, 'employee')).toEqual(EMPLOYEE);
  });
});

describe('a config never grants access', () => {
  it('an employee cannot put leader blocks on the board', () => {
    expect(visibleHome([...HOME_BLOCK_KEYS], employee, 'employee')).not.toEqual(
      expect.arrayContaining(['tiles']),
    );
    for (const k of ['tiles', 'live', 'status', 'composition', 'discipline', 'sanatorium', 'health'] as const) {
      expect(visibleHome([k], employee, 'employee')).toEqual([]);
    }
  });
  it('my-day blocks on the leader board need an employee card', () => {
    expect(visibleHome(['hero', 'stats'], master, 'leader')).toEqual([]);
    expect(visibleHome(['hero', 'stats'], role('hr'), 'leader')).toEqual(['hero', 'stats']);
  });
});

describe('moveBlock', () => {
  it('moves past the visible neighbour; unseen blocks keep their places', () => {
    const all: HomeBlockKey[] = ['sanatorium', 'tiles', 'health', 'live'];
    expect(moveBlock(all, ['tiles', 'live'], 'live', -1)).toEqual(['sanatorium', 'live', 'health', 'tiles']);
  });
  it('the edges stay', () => {
    expect(moveBlock(['tiles', 'live'], ['tiles', 'live'], 'tiles', -1)).toEqual(['tiles', 'live']);
    expect(moveBlock(['tiles', 'live'], ['tiles', 'live'], 'live', 1)).toEqual(['tiles', 'live']);
  });
});

describe('readLocalCopy', () => {
  const copy = { uid: 1, board: 'leader', custom: true, blocks: ['live'] };
  it('own copy', () => expect(readLocalCopy(copy, 1, 'leader')).toEqual({ blocks: ['live'], custom: true }));
  it("another account's copy, another board, no account — ignored", () => {
    expect(readLocalCopy(copy, 2, 'leader')).toBeNull();
    expect(readLocalCopy(copy, 1, 'employee')).toBeNull();
    expect(readLocalCopy(copy, undefined, 'leader')).toBeNull();
    expect(readLocalCopy(null, 1, 'leader')).toBeNull();
  });
});
