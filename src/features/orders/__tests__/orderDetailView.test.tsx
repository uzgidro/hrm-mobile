import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders } from '@/test/renderWithProviders';
import { OrderDetailView } from '../components/OrderDetailView';

// The view uses `router.back`/`router.push` from expo-router; mock it so the
// test doesn't pull in expo-router's untranspiled ESM navigation internals
// (same pattern as ProfileScreen.test.tsx).
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

describe('OrderDetailView (embedded)', () => {
  const mock = new MockAdapter(apiClient);
  afterEach(() => mock.reset());

  it('renders the order title from the detail query without crashing when embedded', async () => {
    mock.onGet(new RegExp('order-acts/1')).reply(200, {
      id: 1,
      status: 'draft',
      category_rel: { name: 'Test decree' },
    });
    // The view also loads the familiarizer-picker's employee list in the
    // background (orderEmployeesQuery); mock it so the test isn't waiting on
    // (or making) a real unmocked network call.
    mock.onGet(new RegExp('employees')).reply(200, { items: [], total: 0 });

    const { findByText } = await renderWithProviders(<OrderDetailView id={1} embedded />);
    expect(await findByText('Test decree')).toBeTruthy();
  }, 15000);

  // QA 2026-10-06: o'chirilgan buyruqning eski bildirishnomasi bosilsa server 404
  // `order_act_not_found` beradi — «Xatolik yuz berdi + Qayta urinish» o'rniga
  // xat kabi tushunarli bo'sh holat, qayta so'rovsiz.
  it('404 order_act_not_found: friendly empty state, no retry', async () => {
    mock.onGet(new RegExp('order-acts/9')).reply(404, {
      code: 'order_act_not_found', i18n_key: 'errors.order_act_not_found', params: {}, message: 'Order act not found',
    });
    mock.onGet(new RegExp('employees')).reply(200, { items: [], total: 0 });
    const { findByText, queryByText } = await renderWithProviders(<OrderDetailView id={9} embedded />);
    expect(await findByText('Buyruq akti topilmadi')).toBeTruthy();
    expect(queryByText(/ko'rinmasligi mumkin/)).toBeTruthy();
    expect(queryByText('Qayta urinish')).toBeNull();
    expect(mock.history.get.filter((r) => /order-acts\/9$/.test(r.url ?? ''))).toHaveLength(1);
  }, 15000);
});
