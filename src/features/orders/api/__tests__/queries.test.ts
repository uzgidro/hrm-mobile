import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import {
  ORDER_ACTS, ORDER_ACT_DETAIL, EMPLOYEES_LIST, ORDER_ACT_COMMENTS, ORDER_ACT_HISTORY,
} from '@/api/urls';
import {
  orderKeys, ordersListQuery, orderDetailQuery,
  orderEmployeesQuery, orderCommentsQuery, orderHistoryQuery,
} from '../queries';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('orderKeys', () => {
  it('keeps `all` equal to the legacy ["order-acts"] key so existing invalidations still prefix-match', () => {
    expect(orderKeys.all).toEqual(['order-acts']);
  });

  it("ro'yxat kaliti bitta — ro'yxat endi filialga qisilmaydi", () => {
    expect(orderKeys.list()).toEqual(['order-acts', 'list']);
  });

  it('places the detail under `all` so a single invalidate refreshes list + detail', () => {
    expect(orderKeys.detail(42)).toEqual(['order-acts', 'detail', 42]);
    expect(orderKeys.detail(42).slice(0, 1)).toEqual(orderKeys.all);
    expect(orderKeys.list().slice(0, 1)).toEqual(orderKeys.all);
  });
});

describe('ordersListQuery', () => {
  it("FILIAL parametrini YUBORMAYDI — boshqa filial buyrug'i ham ko'rinsin", async () => {
    // Web leadership tabi ham `organization_branch_id: null` yuboradi: rahbar
    // boshqa filial buyrug'iga imzolovchi bo'lishi mumkin. Ko'lamni backend
    // (`_apply_visibility`) belgilaydi, filtr esa uni noto'g'ri qisardi.
    const opts = ordersListQuery();
    expect(opts.queryKey).toEqual(['order-acts', 'list']);
    mock.onGet(ORDER_ACTS).reply(200, []);
    await (opts.queryFn as () => Promise<unknown[]>)();
    expect(mock.history.get[0].params).toBeUndefined();
  });

  it('returns a bare array and unwraps an { items } envelope', async () => {
    mock.onGet(ORDER_ACTS).reply(200, [{ id: 1 }, { id: 2 }]);
    expect(await (ordersListQuery().queryFn as () => Promise<unknown[]>)()).toHaveLength(2);
    mock.resetHistory();
    mock.onGet(ORDER_ACTS).reply(200, { items: [{ id: 3 }] });
    expect(await (ordersListQuery().queryFn as () => Promise<unknown[]>)()).toEqual([{ id: 3 }]);
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


describe('orderEmployeesQuery — buyruq KELISHUVCHILARI', () => {
  it('filialning BARCHA xodimlari, rol filtrisiz, razryad bo\'yicha tartiblangan', async () => {
    mock.onGet(EMPLOYEES_LIST).reply(200, { items: [], total: 0 });
    await (orderEmployeesQuery(4).queryFn as () => Promise<unknown>)();
    const p = mock.history.get[0].params;
    expect(p.organization_branch_id).toBe(4);
    // Kelishuvchi HAR QANDAY xodim bo'lishi mumkin — rol filtri bo'lmasligi shart.
    expect(p.multi_org_employee_role).toBeUndefined();
    expect(p.sort_by_razryad).toBe(true);
  });
});

describe('izohlar va tahrir tarixi', () => {
  it('o\'z endpointlaridan o\'qiydi va bo\'sh javobda [] qaytaradi', async () => {
    mock.onGet(ORDER_ACT_COMMENTS(5)).reply(200, null);
    mock.onGet(ORDER_ACT_HISTORY(5)).reply(200, null);
    expect(await (orderCommentsQuery(5).queryFn as () => Promise<unknown>)()).toEqual([]);
    expect(await (orderHistoryQuery(5).queryFn as () => Promise<unknown>)()).toEqual([]);
  });

  it('id berilmasa so\'rov yubormaydi', () => {
    expect(orderCommentsQuery(0).enabled).toBe(false);
    expect(orderHistoryQuery(0).enabled).toBe(false);
  });
});
