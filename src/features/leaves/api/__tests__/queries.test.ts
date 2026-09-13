import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { WORK_LEAVES, WORK_LEAVE_DETAIL } from '@/api/urls';
import {
  leaveKeys,
  myLeavesQuery,
  workLeavesServerParams,
  leavesListQuery,
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

describe('workLeavesServerParams', () => {
  const hrUser = { id: 1, type: 'employee', employee: { id: 10, is_multi_org_user: true, multi_org_employee_role: 'hr' } } as any;
  const plainUser = { id: 2, type: 'employee', employee: { id: 20 } } as any;

  it('mine: employee_id + status group + search', () => {
    expect(workLeavesServerParams({ scope: 'mine', employeeId: 7, status: 'pending', search: ' ali ' }))
      .toEqual({ employee_id: 7, status: 'pending', search: 'ali' });
    expect(workLeavesServerParams({ scope: 'mine', employeeId: 7, status: 'all' }).status).toBeUndefined();
  });

  it('assigned: "action" = pending AND not yet signed by me; "approved" = signed by me', () => {
    expect(workLeavesServerParams({ scope: 'assigned', status: 'action' }))
      .toMatchObject({ assigned_signer: true, status: 'pending', signer: false });
    expect(workLeavesServerParams({ scope: 'assigned', status: 'approved' }))
      .toMatchObject({ assigned_signer: true, signer: true });
    expect(workLeavesServerParams({ scope: 'assigned', status: 'rejected' }))
      .toMatchObject({ assigned_signer: true, status: 'rejected' });
    expect(workLeavesServerParams({ scope: 'assigned', status: 'all' })).toMatchObject({ assigned_signer: true });
  });

  it('team: role scope (never unscoped) + month window + status', () => {
    expect(workLeavesServerParams({ scope: 'team', user: plainUser, branchId: 5, month: '2026-02', status: 'approved' }))
      .toMatchObject({ organization_branch_id: 5, assigned_signer: true, date_from: '2026-02-01', date_to: '2026-02-28', status: 'approved' });
    expect(workLeavesServerParams({ scope: 'team', user: hrUser, branchId: 5 }))
      .toMatchObject({ organization_branch_id: 5 });
    expect(workLeavesServerParams({ scope: 'team' })).toMatchObject({ assigned_signer: true });
  });
});

describe('leavesListQuery (server-paged)', () => {
  type PageFn = (ctx: { pageParam: number }) => Promise<{ items: unknown[] }>;

  it('sends the server params plus page/size and unwraps the envelope', async () => {
    const opts = leavesListQuery({ scope: 'assigned', status: 'action' });
    expect(opts.queryKey.slice(0, 1)).toEqual(leaveKeys.all);
    mock.onGet(WORK_LEAVES).reply(200, { items: [{ id: 1 }], total: 1, page: 1, size: 30, pages: 1 });
    const page = await (opts.queryFn as unknown as PageFn)({ pageParam: 1 });
    expect(mock.history.get[0].params).toEqual({ assigned_signer: true, status: 'pending', signer: false, page: 1, size: 30 });
    expect(page.items).toEqual([{ id: 1 }]);
  });

  it('the query key varies by scope/branch/filter so caches never collide', () => {
    const a = leavesListQuery({ scope: 'team', branchId: 5 }).queryKey;
    const b = leavesListQuery({ scope: 'team', branchId: 6 }).queryKey;
    const c = leavesListQuery({ scope: 'team', branchId: 5, status: 'pending' }).queryKey;
    expect(a).not.toEqual(b);
    expect(a).not.toEqual(c);
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
