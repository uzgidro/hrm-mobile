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
    expect(newsKeys.list(5)).toEqual(['news', 'list', 5]);
    expect(newsKeys.list()).toEqual(['news', 'list', null]);
    expect(newsKeys.detail(9)).toEqual(['news', 'detail', 9]);
    // all is a prefix of both → invalidating it matches list and detail
    expect(newsKeys.detail(9).slice(0, 1)).toEqual(newsKeys.all);
    expect(newsKeys.list(5).slice(0, 1)).toEqual(newsKeys.all);
  });
});

describe('newsListQuery', () => {
  it('carries the list key and passes the branch filter', () => {
    const opts = newsListQuery(7);
    expect(opts.queryKey).toEqual(['news', 'list', 7]);
  });

  it('returns a bare array response as-is', async () => {
    mock.onGet(NEWS_POSTS).reply(200, [{ id: 1 }, { id: 2 }]);
    const opts = newsListQuery();
    const data = await (opts.queryFn as () => Promise<unknown[]>)();
    expect(data).toHaveLength(2);
  });

  it('unwraps an { items } envelope', async () => {
    mock.onGet(NEWS_POSTS).reply(200, { items: [{ id: 1 }] });
    const data = await (newsListQuery().queryFn as () => Promise<unknown[]>)();
    expect(data).toEqual([{ id: 1 }]);
  });

  it('defaults to an empty array when the response has neither array nor items', async () => {
    mock.onGet(NEWS_POSTS).reply(200, {});
    const data = await (newsListQuery().queryFn as () => Promise<unknown[]>)();
    expect(data).toEqual([]);
  });

  it('sends organization_branch_id only when provided', async () => {
    mock.onGet(NEWS_POSTS).reply(200, []);
    await (newsListQuery(3).queryFn as () => Promise<unknown[]>)();
    expect(mock.history.get[0].params).toEqual({ organization_branch_id: 3 });

    mock.resetHistory();
    await (newsListQuery().queryFn as () => Promise<unknown[]>)();
    expect(mock.history.get[0].params).toEqual({});
  });
});
