import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import {
  cleanParams, unwrapPage, nextPageParam, flattenPages, pagesTotal, pagedListOptions, PAGE_SIZE,
} from '../pagedList';

describe('pagedList helpers', () => {
  it('cleanParams drops empty / all / null / undefined', () => {
    expect(cleanParams({ a: 1, b: '', c: 'all', d: null, e: undefined, f: false, g: 'x' }))
      .toEqual({ a: 1, f: false, g: 'x' });
  });

  it('unwrapPage reads the envelope', () => {
    expect(unwrapPage({ items: [{ id: 1 }], total: 61, page: 2, size: 30, pages: 3 }, 2, 30))
      .toEqual({ items: [{ id: 1 }], total: 61, page: 2, size: 30, pages: 3 });
  });

  it('unwrapPage tolerates a bare array (old backend) and reports one page', () => {
    const p = unwrapPage([{ id: 1 }, { id: 2 }], 1, 30);
    expect(p.items).toHaveLength(2);
    expect(p.total).toBe(2);
    expect(nextPageParam(p)).toBeUndefined();
  });

  it('unwrapPage derives pages when the envelope omits them', () => {
    const p = unwrapPage({ items: [], total: 61 }, 1, 30);
    expect(p.pages).toBe(3);
    expect(nextPageParam(p)).toBe(2);
  });

  it('nextPageParam stops on the last page', () => {
    expect(nextPageParam({ items: [], total: 3, page: 3, size: 1, pages: 3 })).toBeUndefined();
    expect(nextPageParam({ items: [], total: 3, page: 1, size: 1, pages: 3 })).toBe(2);
  });

  it('flattenPages / pagesTotal', () => {
    const pages = [
      { items: [1, 2], total: 3, page: 1, size: 2, pages: 2 },
      { items: [3], total: 3, page: 2, size: 2, pages: 2 },
    ];
    expect(flattenPages(pages)).toEqual([1, 2, 3]);
    expect(pagesTotal(pages)).toBe(3);
    expect(flattenPages(undefined)).toEqual([]);
    expect(pagesTotal(undefined)).toBeUndefined();
  });
});

describe('pagedListOptions', () => {
  const mock = new MockAdapter(apiClient);
  afterEach(() => mock.reset());

  it('sends cleaned params plus page/size and unwraps the envelope', async () => {
    mock.onGet('letters').reply((cfg) => {
      expect(cfg.params).toEqual({ search: 'ali', action_required: true, page: 2, size: PAGE_SIZE });
      return [200, { items: [{ id: 9 }], total: 31, page: 2, size: PAGE_SIZE, pages: 2 }];
    });
    const opts = pagedListOptions<{ id: number }>({
      queryKey: ['letters', 'list', 'x'],
      url: 'letters',
      params: { search: 'ali', status: 'all', letter_type: '', action_required: true },
    });
    const page = await (opts.queryFn as any)({ pageParam: 2 });
    expect(page.items).toEqual([{ id: 9 }]);
    expect(opts.getNextPageParam(page, [page], 2, [1, 2])).toBeUndefined();
  });
});
