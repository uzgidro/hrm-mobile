import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import {
  ORDER_ACTS, ORDER_ACT_DETAIL, EMPLOYEES_LIST, ORDER_ACT_COMMENTS, ORDER_ACT_HISTORY,
  ORDER_ACT_NUMBER_AVAILABILITY,
} from '@/api/urls';
import {
  orderKeys,
  ordersListQuery,
  ordersListServerParams,
  orderDetailQuery,
  orderEmployeesQuery,
  orderCommentsQuery,
  orderHistoryQuery,
  orderActNumberAvailabilityQuery,
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

  it("ro'yxat kaliti server parametrlarini o'z ichiga oladi (filial YO'Q)", () => {
    expect(orderKeys.list({ tab: 'all' })).toEqual(['order-acts', 'list', {}]);
    expect(orderKeys.list({ tab: 'action', status: 'approved' })).toEqual(['order-acts', 'list', { action_required: true, status: 'approved' }]);
  });

  it('places the detail under `all` so a single invalidate refreshes list + detail', () => {
    expect(orderKeys.detail(42)).toEqual(['order-acts', 'detail', 42]);
    expect(orderKeys.detail(42).slice(0, 1)).toEqual(orderKeys.all);
    expect(orderKeys.list({ tab: 'all' }).slice(0, 1)).toEqual(orderKeys.all);
  });
});

describe('ordersListServerParams', () => {
  it('"Menda" → action_required=true; "Mening" → employee_id (web v1 parity)', () => {
    expect(ordersListServerParams({ tab: 'action', employeeId: 7 })).toMatchObject({ action_required: true, employee_id: undefined });
    expect(ordersListServerParams({ tab: 'mine', employeeId: 7 })).toMatchObject({ employee_id: 7, action_required: undefined });
  });
  it('category/status/search map 1:1', () => {
    expect(ordersListServerParams({ tab: 'all', categoryId: 5, status: 'approved', search: ' 12 ' }))
      .toEqual({ action_required: undefined, employee_id: undefined, category_id: 5, status: 'approved', search: '12' });
    expect(ordersListServerParams({ tab: 'all', categoryId: 'all' }).category_id).toBeUndefined();
  });
});

describe('ordersListQuery', () => {
  type PageFn = (ctx: { pageParam: number }) => Promise<{ items: unknown[] }>;

  it("FILIAL parametrini YUBORMAYDI — boshqa filial buyrug'i ham ko'rinsin; sahifalangan", async () => {
    // Web leadership tabi ham `organization_branch_id: null` yuboradi: rahbar
    // boshqa filial buyrug'iga imzolovchi bo'lishi mumkin. Ko'lamni backend
    // (`_apply_visibility`) belgilaydi, filtr esa uni noto'g'ri qisardi.
    const opts = ordersListQuery({ tab: 'all' });
    expect(opts.queryKey).toEqual(['order-acts', 'list', {}]);
    mock.onGet(ORDER_ACTS).reply(200, []);
    await (opts.queryFn as unknown as PageFn)({ pageParam: 1 });
    expect(mock.history.get[0].params).toEqual({ page: 1, size: 30 });
  });

  it('returns a bare array and unwraps an { items } envelope', async () => {
    mock.onGet(ORDER_ACTS).reply(200, [{ id: 1 }, { id: 2 }]);
    expect((await (ordersListQuery({ tab: 'all' }).queryFn as unknown as PageFn)({ pageParam: 1 })).items).toHaveLength(2);
    mock.resetHistory();
    mock.onGet(ORDER_ACTS).reply(200, { items: [{ id: 3 }], total: 1, page: 1, size: 30, pages: 1 });
    expect((await (ordersListQuery({ tab: 'all' }).queryFn as unknown as PageFn)({ pageParam: 1 })).items).toEqual([{ id: 3 }]);
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

// Izohlar va matn tarixi imzo zanjiriga kirmaydi — ular `always` bilan har bir
// montajda so'rov yubormasligi kerak (planshet split-view da bu har bir qator
// bosilishida 2 ta ortiqcha so'rov edi).
describe('orderCommentsQuery / orderHistoryQuery — keshlanadi', () => {
  it('always EMAS, staleTime bor', () => {
    for (const opts of [orderCommentsQuery(1), orderHistoryQuery(1)]) {
      expect(opts.refetchOnMount).toBeUndefined();
      expect(opts.staleTime).toBeGreaterThan(0);
    }
  });
});

describe('orderActNumberAvailabilityQuery', () => {
  it('sends the number as free TEXT plus the branch, and keys on all three inputs', async () => {
    const opts = orderActNumberAvailabilityQuery(5, '125/2026-QQ', undefined, true);
    expect(opts.queryKey).toEqual(['order-act-number-availability', 5, '125/2026-QQ', null]);

    mock.onGet(ORDER_ACT_NUMBER_AVAILABILITY).reply(200, { available: false, suggested: 126 });
    const data = await (opts.queryFn as () => Promise<{ available: boolean }>)();

    expect(mock.history.get[0].params).toEqual({
      organization_branch_id: 5,
      act_number: '125/2026-QQ',
    });
    expect(data.available).toBe(false);
  });

  it("tahrirda buyruq O'Z raqamini band ko'rmasin — exclude_id yuboriladi", async () => {
    const opts = orderActNumberAvailabilityQuery(5, '125', 42, true);
    mock.onGet(ORDER_ACT_NUMBER_AVAILABILITY).reply(200, { available: true });
    await (opts.queryFn as () => Promise<unknown>)();
    expect(mock.history.get[0].params).toEqual({
      organization_branch_id: 5,
      act_number: '125',
      exclude_id: 42,
    });
  });

  it('stays disabled without a branch, without a number, or when the caller says so', () => {
    // The field only exists for KADR on create, so `enabled` is what turns the
    // whole live check on — and a blank number must never hit the endpoint.
    expect(orderActNumberAvailabilityQuery(5, '125', null, false).enabled).toBe(false);
    expect(orderActNumberAvailabilityQuery(undefined, '125', null, true).enabled).toBe(false);
    expect(orderActNumberAvailabilityQuery(5, '   ', null, true).enabled).toBe(false);
    expect(orderActNumberAvailabilityQuery(5, '125', null, true).enabled).toBe(true);
  });
});
