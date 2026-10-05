import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders } from '@/test/renderWithProviders';
import { VisitorDetailView } from '../components/VisitorDetailView';

// The view uses `router.back`/`router.push` from expo-router; mock it so the
// test doesn't pull in expo-router's untranspiled ESM navigation internals
// (same pattern as orderDetailView.test.tsx / letterDetailView.test.tsx).
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

describe('VisitorDetailView (embedded)', () => {
  const mock = new MockAdapter(apiClient);
  afterEach(() => mock.reset());

  it('mounts and renders visitor info when embedded', async () => {
    // Match the exact URL from src/features/visitors/api/queries.ts (VISITOR_DETAIL).
    mock.onGet(new RegExp('visitors/1')).reply(200, {
      id: 1,
      legal_name: 'Test Visitor',
      is_active: true,
    });

    const { findByText, getByTestId } = await renderWithProviders(<VisitorDetailView id={1} embedded />);
    expect(await findByText('Test Visitor')).toBeTruthy();
    expect(getByTestId('visitor-edit')).toBeTruthy();
    expect(getByTestId('visitor-delete')).toBeTruthy();
  }, 15000);

  it('404: «Mehmon topilmadi» holati, tahrir/o\'chirish tugmalari yo\'q (QA: ro\'yxat qatori GET da 404)', async () => {
    mock.onGet(new RegExp('visitors/7')).reply(404, {
      code: 'visitor_not_found',
      i18n_key: 'errors.visitor_not_found',
      params: {},
      message: 'Visitor not found',
    });
    const { findByText, queryByTestId, queryByText } = await renderWithProviders(<VisitorDetailView id={7} embedded />);
    expect(await findByText('Mehmon topilmadi')).toBeTruthy();
    expect(queryByText('Visitor not found')).toBeNull();
    expect(queryByTestId('visitor-edit')).toBeNull();
    expect(queryByTestId('visitor-delete')).toBeNull();
    // 404 qayta so'ralmaydi.
    expect(mock.history.get.filter((r) => /visitors\/7/.test(r.url ?? ''))).toHaveLength(1);
  }, 15000);

  it('boshqa xatoda ErrorState (qayta urinish bilan), amallar yo\'q', async () => {
    mock.onGet(new RegExp('visitors/8')).reply(500, { detail: 'boom' });
    const { findByText, queryByTestId } = await renderWithProviders(<VisitorDetailView id={8} embedded />);
    // 500 standart 2 marta qayta so'raladi (retryUnlessMissing) — backoff kutiladi.
    expect(await findByText('boom', {}, { timeout: 8000 })).toBeTruthy();
    expect(queryByTestId('visitor-edit')).toBeNull();
  }, 15000);
});
