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

  // Web parity (LetterDetailModal.jsx): when the backend reports the DB text
  // did not reach the (anchorless / stale) docx, show an amber warning so the
  // user knows form edits are missing from the document before opening it.
  it('shows the out-of-sync warning banner when document_out_of_sync is true', async () => {
    mock.onGet(new RegExp('letters/1/trip-movements')).reply(200, []);
    mock.onGet(new RegExp('letters/1')).reply(200, {
      id: 1, status: 'draft', letter_type: 'business_trip', document_out_of_sync: true,
    });

    const { findByTestId } = await renderWithProviders(<LetterDetailView id={1} embedded />);
    expect(await findByTestId('letter-out-of-sync-warning')).toBeTruthy();
  }, 15000);

  it('hides the out-of-sync warning banner when document_out_of_sync is falsy', async () => {
    mock.onGet(new RegExp('letters/1/trip-movements')).reply(200, []);
    mock.onGet(new RegExp('letters/1')).reply(200, {
      id: 1, status: 'draft', letter_type: 'business_trip',
    });

    const { findByText, queryByTestId } = await renderWithProviders(<LetterDetailView id={1} embedded />);
    // Wait for the view to settle (info header present), then assert absence.
    await findByText("Ma'lumot");
    expect(queryByTestId('letter-out-of-sync-warning')).toBeNull();
  }, 15000);
});
