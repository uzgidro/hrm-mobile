import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders } from '@/test/renderWithProviders';
import { LetterDetailView } from '../components/LetterDetailView';

// The view uses `router.back`/`router.push` from expo-router; mock it so the
// test doesn't pull in expo-router's untranspiled ESM navigation internals
// (same pattern as OrderDetailView.test.tsx).
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

describe('LetterDetailView (embedded)', () => {
  const mock = new MockAdapter(apiClient);
  afterEach(() => mock.reset());

  it('mounts and renders letter info when embedded', async () => {
    // Match the exact URL from src/features/letters/api/queries.ts.
    mock.onGet(new RegExp('letters/1/trip-movements')).reply(200, []);
    mock.onGet(new RegExp('letters/1')).reply(200, {
      id: 1, status: 'draft', letter_type: 'business_trip',
    });

    const { findByText } = await renderWithProviders(<LetterDetailView id={1} embedded />);
    // letterTypeLabel('business_trip') resolves via i18n — assert the stable
    // "Ma'lumot" info section header (t('letters.sectionInfo')) instead of
    // coupling to the type label text.
    expect(await findByText("Ma'lumot")).toBeTruthy();
  }, 15000);
});
