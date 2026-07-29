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

    const { findByText } = await renderWithProviders(<VisitorDetailView id={1} embedded />);
    expect(await findByText('Test Visitor')).toBeTruthy();
  }, 15000);
});
