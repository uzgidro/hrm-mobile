import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { WORK_LEAVES_HR_LIST, WORK_LEAVES_HR_CREATE, WORK_LEAVE_DETAIL } from '@/api/urls';
import { tempOrderKeys, tempOrdersQuery } from '../queries';
import { createTempOrder, updateTempOrder, deleteTempOrder } from '../mutations';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('vaqtinchalik buyruqlar API (v2 useTempOrders)', () => {
  it('ro\u2019yxat: hr-list, filial, qidiruv, tur, sahifa', async () => {
    mock.onGet(WORK_LEAVES_HR_LIST).reply(200, { items: [{ id: 1 }], total: 1, pages: 1 });
    const r = await (tempOrdersQuery({ search: 'ali', type: 'kasal', page: 2, branchId: 3 }).queryFn as () => Promise<unknown>)();
    expect(r).toEqual({ items: [{ id: 1 }], total: 1, pages: 1 });
    expect(mock.history.get[0].params).toEqual({ page: 2, size: 50, organization_branch_id: 3, search: 'ali', type: 'kasal' });
  });
  it("bo'sh filtrlar yuborilmaydi", async () => {
    mock.onGet(WORK_LEAVES_HR_LIST).reply(200, []);
    const r = await (tempOrdersQuery({ search: '', type: null, page: 1, branchId: undefined }).queryFn as () => Promise<unknown>)();
    expect(r).toEqual({ items: [], total: 0, pages: 1 });
    expect(mock.history.get[0].params).toEqual({ page: 1, size: 50 });
  });
  it('kalitlar', () => expect(tempOrderKeys.all).toEqual(['temp-orders']));
  it('yaratish / tahrir / o\u2019chirish yo\u2019llari', async () => {
    mock.onPost(WORK_LEAVES_HR_CREATE).reply(201, {});
    mock.onPatch(WORK_LEAVE_DETAIL(5)).reply(200, {});
    mock.onDelete(WORK_LEAVE_DETAIL(5)).reply(204);
    await createTempOrder({ a: 1 });
    await updateTempOrder(5, { b: 2 });
    await deleteTempOrder(5);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ a: 1 });
    expect(JSON.parse(mock.history.patch[0].data)).toEqual({ b: 2 });
    expect(mock.history.delete).toHaveLength(1);
  });
});
