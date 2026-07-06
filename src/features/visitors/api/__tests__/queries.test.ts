import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { VISITORS_LIST, VISITOR_DETAIL } from '@/api/urls';
import { visitorKeys, visitorsListQuery, visitorDetailQuery } from '../queries';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('visitorKeys', () => {
  it('builds a hierarchical key tree so `all` is a prefix of list and detail', () => {
    expect(visitorKeys.all).toEqual(['visitors']);
    expect(visitorKeys.list(5)).toEqual(['visitors', 'list', 5]);
    expect(visitorKeys.list()).toEqual(['visitors', 'list', null]);
    expect(visitorKeys.detail(9)).toEqual(['visitors', 'detail', 9]);
    // all is a prefix of both → invalidating it matches list and detail
    expect(visitorKeys.detail(9).slice(0, 1)).toEqual(visitorKeys.all);
    expect(visitorKeys.list(5).slice(0, 1)).toEqual(visitorKeys.all);
  });
});

describe('visitorsListQuery', () => {
  it('carries the list key and passes the branch filter', () => {
    const opts = visitorsListQuery(7);
    expect(opts.queryKey).toEqual(['visitors', 'list', 7]);
  });

  it('returns a bare array response as-is', async () => {
    mock.onGet(VISITORS_LIST).reply(200, [{ id: 1 }, { id: 2 }]);
    const opts = visitorsListQuery();
    const data = await (opts.queryFn as () => Promise<unknown[]>)();
    expect(data).toHaveLength(2);
  });

  it('unwraps an { items } envelope', async () => {
    mock.onGet(VISITORS_LIST).reply(200, { items: [{ id: 1 }] });
    const data = await (visitorsListQuery().queryFn as () => Promise<unknown[]>)();
    expect(data).toEqual([{ id: 1 }]);
  });

  it('sends organization_branch_id only when provided', async () => {
    mock.onGet(VISITORS_LIST).reply(200, []);
    await (visitorsListQuery(3).queryFn as () => Promise<unknown[]>)();
    expect(mock.history.get[0].params).toEqual({ organization_branch_id: 3 });

    mock.resetHistory();
    await (visitorsListQuery().queryFn as () => Promise<unknown[]>)();
    expect(mock.history.get[0].params).toEqual({});
  });
});

describe('visitorDetailQuery', () => {
  it('carries the detail key and always revalidates on mount', () => {
    const opts = visitorDetailQuery(42);
    expect(opts.queryKey).toEqual(['visitors', 'detail', 42]);
    expect(opts.refetchOnMount).toBe('always');
    expect(opts.enabled).toBe(true);
  });

  it('is disabled for a falsy id', () => {
    expect(visitorDetailQuery(0).enabled).toBe(false);
  });

  it('fetches the visitor by id', async () => {
    mock.onGet(VISITOR_DETAIL(42)).reply(200, { id: 42, legal_name: 'X' });
    const data = await (visitorDetailQuery(42).queryFn as () => Promise<{ id: number }>)();
    expect(data.id).toBe(42);
  });
});
