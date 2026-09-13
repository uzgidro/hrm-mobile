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
    expect(visitorKeys.list(5)).toEqual(['visitors', 'list', 5, null]);
    expect(visitorKeys.list(undefined, 'ali')).toEqual(['visitors', 'list', null, 'ali']);
    expect(visitorKeys.detail(9)).toEqual(['visitors', 'detail', 9]);
    // all is a prefix of both → invalidating it matches list and detail
    expect(visitorKeys.detail(9).slice(0, 1)).toEqual(visitorKeys.all);
    expect(visitorKeys.list(5).slice(0, 1)).toEqual(visitorKeys.all);
  });
});

describe('visitorsListQuery (server-paged, server search)', () => {
  type PageFn = (ctx: { pageParam: number }) => Promise<{ items: unknown[] }>;

  it('carries the list key with branch + search', () => {
    expect(visitorsListQuery(7, ' ali ').queryKey).toEqual(['visitors', 'list', 7, 'ali']);
  });

  it('returns a bare array response as one page', async () => {
    mock.onGet(VISITORS_LIST).reply(200, [{ id: 1 }, { id: 2 }]);
    const page = await (visitorsListQuery().queryFn as unknown as PageFn)({ pageParam: 1 });
    expect(page.items).toHaveLength(2);
  });

  it('unwraps an { items } envelope', async () => {
    mock.onGet(VISITORS_LIST).reply(200, { items: [{ id: 1 }], total: 1, page: 1, size: 30, pages: 1 });
    const page = await (visitorsListQuery().queryFn as unknown as PageFn)({ pageParam: 1 });
    expect(page.items).toEqual([{ id: 1 }]);
  });

  it('sends organization_branch_id / search only when provided, plus page/size', async () => {
    mock.onGet(VISITORS_LIST).reply(200, []);
    await (visitorsListQuery(3, 'uge').queryFn as unknown as PageFn)({ pageParam: 2 });
    expect(mock.history.get[0].params).toEqual({ organization_branch_id: 3, search: 'uge', page: 2, size: 30 });

    mock.resetHistory();
    await (visitorsListQuery().queryFn as unknown as PageFn)({ pageParam: 1 });
    expect(mock.history.get[0].params).toEqual({ page: 1, size: 30 });
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
