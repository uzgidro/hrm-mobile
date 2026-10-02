import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { ORDER_ACT_CATEGORIES } from '@/api/urls';
import { orderTypeKeys, orderTypesQuery, validateOrderType } from '../queries';
import { saveOrderType, deleteOrderType } from '../mutations';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('buyruq turlari API (v2 useOrderTypes)', () => {
  it("qidiruv va oqim filtri; bo'shlari yuborilmaydi", async () => {
    mock.onGet(ORDER_ACT_CATEGORIES).reply(200, { items: [{ id: 1, name: 'Ta\u2019til', creator_role: 'hr' }] });
    expect(await (orderTypesQuery({ search: 'ta', creatorRole: 'hr' }).queryFn as () => Promise<unknown>)()).toEqual([{ id: 1, name: 'Ta\u2019til', creator_role: 'hr' }]);
    expect(mock.history.get[0].params).toEqual({ search: 'ta', creator_role: 'hr' });
    await (orderTypesQuery({ search: '', creatorRole: '' }).queryFn as () => Promise<unknown>)();
    expect(mock.history.get[1].params).toEqual({});
  });
  it('kalit — orders feature bilan bir xil ildiz (kategoriya keshi umumiy)', () => expect(orderTypeKeys.all).toEqual(['order-act-categories']));
  it('saqlash: yangi — POST, mavjud — PATCH; o\u2019chirish — DELETE', async () => {
    mock.onPost(ORDER_ACT_CATEGORIES).reply(201, {});
    mock.onPatch(`${ORDER_ACT_CATEGORIES}/4`).reply(200, {});
    mock.onDelete(`${ORDER_ACT_CATEGORIES}/4`).reply(204);
    await saveOrderType(null, { name: 'A', creator_role: 'employee' });
    await saveOrderType(4, { name: 'B', creator_role: 'hr' });
    await deleteOrderType(4);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ name: 'A', creator_role: 'employee' });
    expect(JSON.parse(mock.history.patch[0].data)).toEqual({ name: 'B', creator_role: 'hr' });
    expect(mock.history.delete).toHaveLength(1);
  });
});

describe('validateOrderType', () => {
  it.each([
    ['  ', 'hr', 'nameRequired'],
    ['Ta\u2019til', '', 'flowRequired'],
    ['Ta\u2019til', 'employee', null],
  ])('%j %j → %j', (name, flow, expected) => expect(validateOrderType(name, flow)).toBe(expected));
});
