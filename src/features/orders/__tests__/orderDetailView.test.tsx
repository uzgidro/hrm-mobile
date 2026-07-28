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
});
