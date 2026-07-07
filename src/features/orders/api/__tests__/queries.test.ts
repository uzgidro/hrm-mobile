import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { ORDER_ACTS, ORDER_ACT_DETAIL } from '@/api/urls';
import { orderKeys, ordersListQuery, orderDetailQuery } from '../queries';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('orderKeys', () => {
  it('keeps `all` equal to the legacy ["order-acts"] key so existing invalidations still prefix-match', () => {
    expect(orderKeys.all).toEqual(['order-acts']);
  });

  it('builds the list key identical to the old tab key ["order-acts", orgBranchId]', () => {
    expect(orderKeys.list(9)).toEqual(['order-acts', 9]);
    expect(orderKeys.list()).toEqual(['order-acts', null]);
  });

  it('places the detail under `all` so a single invalidate refreshes list + detail', () => {
    expect(orderKeys.detail(42)).toEqual(['order-acts', 'detail', 42]);
    expect(orderKeys.detail(42).slice(0, 1)).toEqual(orderKeys.all);
    expect(orderKeys.list(9).slice(0, 1)).toEqual(orderKeys.all);
  });
});

describe('ordersListQuery', () => {
  it('carries the list key and sends organization_branch_id when present', async () => {
    const opts = ordersListQuery(9);
    expect(opts.queryKey).toEqual(['order-acts', 9]);
    mock.onGet(ORDER_ACTS).reply(200, []);
    await (opts.queryFn as () => Promise<unknown[]>)();
    expect(mock.history.get[0].params).toEqual({ organization_branch_id: 9 });
  });

  it('sends no params when there is no branch', async () => {
    mock.onGet(ORDER_ACTS).reply(200, []);
    await (ordersListQuery().queryFn as () => Promise<unknown[]>)();
    expect(mock.history.get[0].params).toEqual({});
  });

  it('returns a bare array and unwraps an { items } envelope', async () => {
    mock.onGet(ORDER_ACTS).reply(200, [{ id: 1 }, { id: 2 }]);
    expect(await (ordersListQuery(9).queryFn as () => Promise<unknown[]>)()).toHaveLength(2);
    mock.resetHistory();
    mock.onGet(ORDER_ACTS).reply(200, { items: [{ id: 3 }] });
    expect(await (ordersListQuery(9).queryFn as () => Promise<unknown[]>)()).toEqual([{ id: 3 }]);
  });
});

describe('orderDetailQuery', () => {
  it('carries the detail key and always revalidates on mount', () => {
    const opts = orderDetailQuery(42);
    expect(opts.queryKey).toEqual(['order-acts', 'detail', 42]);
    expect(opts.refetchOnMount).toBe('always');
    expect(opts.enabled).toBe(true);
  });

  it('is disabled for a falsy id', () => {
    expect(orderDetailQuery(0).enabled).toBe(false);
    expect(orderDetailQuery(undefined as unknown as number).enabled).toBe(false);
  });

  it('fetches the order by id', async () => {
    mock.onGet(ORDER_ACT_DETAIL(42)).reply(200, { id: 42, status: 'approved' });
    const data = await (orderDetailQuery(42).queryFn as unknown as () => Promise<{ id: number }>)();
    expect(data.id).toBe(42);
  });
});
