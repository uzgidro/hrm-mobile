import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { WORK_LEAVES, WORK_LEAVE_DETAIL } from '@/api/urls';
import {
  leaveKeys,
  myLeavesQuery,
  assignedLeavesQuery,
  teamLeavesQuery,
  leaveDetailQuery,
} from '../queries';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('leaveKeys', () => {
  it('builds a hierarchical key tree so `all` is a prefix of every list and detail', () => {
    expect(leaveKeys.all).toEqual(['work-leaves']);
    expect(leaveKeys.list('mine', 5)).toEqual(['work-leaves', 'list', 'mine', 5]);
    expect(leaveKeys.list('assigned', 5)).toEqual(['work-leaves', 'list', 'assigned', 5]);
    expect(leaveKeys.list('team')).toEqual(['work-leaves', 'list', 'team', null]);
    expect(leaveKeys.detail(9)).toEqual(['work-leaves', 'detail', 9]);
    // all is a prefix of every list + detail → invalidating it matches them all
    expect(leaveKeys.list('mine', 5).slice(0, 1)).toEqual(leaveKeys.all);
    expect(leaveKeys.list('assigned', 5).slice(0, 1)).toEqual(leaveKeys.all);
    expect(leaveKeys.list('team').slice(0, 1)).toEqual(leaveKeys.all);
    expect(leaveKeys.detail(9).slice(0, 1)).toEqual(leaveKeys.all);
  });
});

describe('myLeavesQuery', () => {
  it('carries the mine list key and sends employee_id + size', async () => {
    const opts = myLeavesQuery(7);
    expect(opts.queryKey).toEqual(['work-leaves', 'list', 'mine', 7]);
    mock.onGet(WORK_LEAVES).reply(200, []);
    await (opts.queryFn as () => Promise<unknown[]>)();
    expect(mock.history.get[0].params).toEqual({ employee_id: 7, size: 100 });
  });

  it('returns a bare array response as-is', async () => {
    mock.onGet(WORK_LEAVES).reply(200, [{ id: 1 }, { id: 2 }]);
    const data = await (myLeavesQuery(7).queryFn as () => Promise<unknown[]>)();
    expect(data).toHaveLength(2);
  });

  it('unwraps an { items } envelope', async () => {
    mock.onGet(WORK_LEAVES).reply(200, { items: [{ id: 1 }] });
    const data = await (myLeavesQuery(7).queryFn as () => Promise<unknown[]>)();
    expect(data).toEqual([{ id: 1 }]);
  });
});

describe('assignedLeavesQuery', () => {
  it('carries the assigned list key and sends assigned_signer + size', async () => {
    const opts = assignedLeavesQuery(7);
    expect(opts.queryKey).toEqual(['work-leaves', 'list', 'assigned', 7]);
    mock.onGet(WORK_LEAVES).reply(200, []);
    await (opts.queryFn as () => Promise<unknown[]>)();
    expect(mock.history.get[0].params).toEqual({ assigned_signer: true, size: 200 });
  });

  it('returns a bare array and unwraps an { items } envelope', async () => {
    mock.onGet(WORK_LEAVES).reply(200, [{ id: 1 }]);
    expect(await (assignedLeavesQuery(7).queryFn as () => Promise<unknown[]>)()).toHaveLength(1);
    mock.resetHistory();
    mock.onGet(WORK_LEAVES).reply(200, { items: [{ id: 2 }, { id: 3 }] });
    expect(await (assignedLeavesQuery(7).queryFn as () => Promise<unknown[]>)()).toHaveLength(2);
  });
});

describe('teamLeavesQuery (role-scoped — no unscoped fetch)', () => {
  const hrUser = { id: 1, type: 'employee', employee: { id: 10, is_multi_org_user: true, multi_org_employee_role: 'hr' } } as any;
  const plainUser = { id: 2, type: 'employee', employee: { id: 20 } } as any;

  it('a regular employee only fetches requests assigned to them (assigned_signer=true)', async () => {
    const opts = teamLeavesQuery(plainUser);
    mock.onGet(WORK_LEAVES).reply(200, []);
    await (opts.queryFn as () => Promise<unknown[]>)();
    expect(mock.history.get[0].params).toEqual({ assigned_signer: true, size: 200 });
  });

  it('no user still scopes to assigned_signer (never an unscoped all-branch fetch)', async () => {
    mock.onGet(WORK_LEAVES).reply(200, []);
    await (teamLeavesQuery().queryFn as () => Promise<unknown[]>)();
    expect(mock.history.get[0].params).toEqual({ assigned_signer: true, size: 200 });
  });

  it('HR gets no row-level filter (branch is the boundary)', async () => {
    const opts = teamLeavesQuery(hrUser, 5);
    mock.onGet(WORK_LEAVES).reply(200, []);
    await (opts.queryFn as () => Promise<unknown[]>)();
    expect(mock.history.get[0].params).toEqual({ organization_branch_id: 5, size: 200 });
  });

  it('scopes to a branch when one is passed', async () => {
    const opts = teamLeavesQuery(plainUser, 5);
    mock.onGet(WORK_LEAVES).reply(200, []);
    await (opts.queryFn as () => Promise<unknown[]>)();
    expect(mock.history.get[0].params).toEqual({ organization_branch_id: 5, assigned_signer: true, size: 200 });
  });

  it('the query key varies by branch + scope so caches never collide', () => {
    expect(teamLeavesQuery(plainUser).queryKey).not.toEqual(teamLeavesQuery(hrUser).queryKey);
    expect(teamLeavesQuery(plainUser, 5).queryKey).not.toEqual(teamLeavesQuery(plainUser, 6).queryKey);
    expect(teamLeavesQuery(plainUser).queryKey.slice(0, 1)).toEqual(leaveKeys.all);
  });

  it('returns a bare array and unwraps an { items } envelope', async () => {
    mock.onGet(WORK_LEAVES).reply(200, [{ id: 1 }, { id: 2 }]);
    expect(await (teamLeavesQuery(plainUser).queryFn as () => Promise<unknown[]>)()).toHaveLength(2);
    mock.resetHistory();
    mock.onGet(WORK_LEAVES).reply(200, { items: [{ id: 1 }] });
    expect(await (teamLeavesQuery(plainUser).queryFn as () => Promise<unknown[]>)()).toEqual([{ id: 1 }]);
  });
});

describe('leaveDetailQuery', () => {
  it('carries the detail key and always revalidates on mount', () => {
    const opts = leaveDetailQuery(42);
    expect(opts.queryKey).toEqual(['work-leaves', 'detail', 42]);
    expect(opts.refetchOnMount).toBe('always');
    expect(opts.enabled).toBe(true);
  });

  it('is disabled for a falsy id', () => {
    expect(leaveDetailQuery(0).enabled).toBe(false);
    expect(leaveDetailQuery(undefined as unknown as number).enabled).toBe(false);
  });

  it('fetches the leave by id', async () => {
    mock.onGet(WORK_LEAVE_DETAIL(42)).reply(200, { id: 42, type: 'Ta\'til' });
    const data = await (leaveDetailQuery(42).queryFn as unknown as () => Promise<{ id: number }>)();
    expect(data.id).toBe(42);
  });
});
