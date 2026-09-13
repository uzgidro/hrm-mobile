import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { NEWS_POSTS } from '@/api/urls';
import { newsKeys, newsListQuery } from '../queries';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('newsKeys', () => {
  it('builds a hierarchical key tree so `all` is a prefix of list and detail', () => {
    expect(newsKeys.all).toEqual(['news']);
    expect(newsKeys.list(5)).toEqual(['news', 'list', 5, null]);
    expect(newsKeys.list(undefined, 'suv')).toEqual(['news', 'list', null, 'suv']);
    expect(newsKeys.detail(9)).toEqual(['news', 'detail', 9]);
    // all is a prefix of both → invalidating it matches list and detail
    expect(newsKeys.detail(9).slice(0, 1)).toEqual(newsKeys.all);
    expect(newsKeys.list(5).slice(0, 1)).toEqual(newsKeys.all);
  });
});

describe('newsListQuery (server-paged, server search)', () => {
  type PageFn = (ctx: { pageParam: number }) => Promise<{ items: unknown[] }>;

  it('carries the list key with branch + search', () => {
    expect(newsListQuery(7, ' suv ').queryKey).toEqual(['news', 'list', 7, 'suv']);
  });

  it('returns a bare array response as one page', async () => {
    mock.onGet(NEWS_POSTS).reply(200, [{ id: 1 }, { id: 2 }]);
    const page = await (newsListQuery().queryFn as unknown as PageFn)({ pageParam: 1 });
    expect(page.items).toHaveLength(2);
  });

  it('unwraps an { items } envelope and tolerates an empty object', async () => {
    mock.onGet(NEWS_POSTS).reply(200, { items: [{ id: 1 }], total: 1, page: 1, size: 30, pages: 1 });
    expect((await (newsListQuery().queryFn as unknown as PageFn)({ pageParam: 1 })).items).toEqual([{ id: 1 }]);
    mock.resetHistory();
    mock.onGet(NEWS_POSTS).reply(200, {});
    expect((await (newsListQuery().queryFn as unknown as PageFn)({ pageParam: 1 })).items).toEqual([]);
  });

  it('sends organization_branch_id / search only when provided, plus page/size', async () => {
    mock.onGet(NEWS_POSTS).reply(200, []);
    await (newsListQuery(3, 'suv').queryFn as unknown as PageFn)({ pageParam: 1 });
    expect(mock.history.get[0].params).toEqual({ organization_branch_id: 3, search: 'suv', page: 1, size: 30 });

    mock.resetHistory();
    await (newsListQuery().queryFn as unknown as PageFn)({ pageParam: 1 });
    expect(mock.history.get[0].params).toEqual({ page: 1, size: 30 });
  });
});

