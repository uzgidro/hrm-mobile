import React from 'react';
import { useWindowDimensions } from 'react-native';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import { LETTERS_LIST, LETTER_DETAIL } from '@/api/urls';
import LettersListScreen from '../screens/LettersListScreen';

// The view uses `router.push` from expo-router; mock it so the test doesn't
// pull in expo-router's untranspiled ESM navigation internals (same pattern
// as letterDetailView.test.tsx / OrderDetailView.test.tsx).
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

// Force tablet-landscape so useBreakpoint() resolves split=true. Mirrors the
// shortest-side>=600 + width>height rule in src/utils/responsive.ts.
jest.mock('react-native/Libraries/Utilities/useWindowDimensions');

const TABLET_LANDSCAPE = { width: 1194, height: 834, scale: 2, fontScale: 1 };
const PHONE_PORTRAIT = { width: 390, height: 844, scale: 3, fontScale: 1 };

describe('LettersListScreen (tablet-landscape split)', () => {
  const mock = new MockAdapter(apiClient);

  beforeEach(() => {
    useAuthStore.setState({
      user: { type: 'employee', employee: { id: 1, legal_name: 'Test User' } } as any,
      isAuthenticated: true,
    } as any);
  });

  afterEach(() => mock.reset());

  it('renders master + auto-selected detail pane in split mode', async () => {
    (useWindowDimensions as jest.Mock).mockReturnValue(TABLET_LANDSCAPE);
    mock.onGet(new RegExp('letters/1/trip-movements')).reply(200, []);
    mock.onGet(new RegExp('letters/1$')).reply(200, {
      id: 1, status: 'draft', letter_type: 'business_trip',
    });
    mock.onGet(new RegExp('letters/?(\\?|$)')).reply(200, [
      { id: 1, status: 'draft', letter_type: 'business_trip', created_at: '2026-01-01' },
    ]);

    const { findByText } = await renderWithProviders(<LettersListScreen />);

    // Master list header still renders.
    expect(await findByText("Xatlar")).toBeTruthy();
    // Detail pane auto-selected the first (only) letter and rendered its body
    // (the stable "Ma'lumot" info-section header, as in letterDetailView.test.tsx).
    expect(await findByText("Ma'lumot")).toBeTruthy();
  }, 15000);

  it('shows the placeholder empty state when the list is empty in split mode', async () => {
    (useWindowDimensions as jest.Mock).mockReturnValue(TABLET_LANDSCAPE);
    mock.onGet(new RegExp('letters/?(\\?|$)')).reply(200, []);

    const { findByText, queryByText } = await renderWithProviders(<LettersListScreen />);

    await findByText("Xatlar");
    // No letters → selectedId stays null → SplitLayout falls back to `placeholder`.
    expect(queryByText("Ma'lumot")).toBeNull();
  }, 15000);

  it('phone/portrait renders the plain list (no split, unaffected by injectable onPress)', async () => {
    (useWindowDimensions as jest.Mock).mockReturnValue(PHONE_PORTRAIT);
    mock.onGet(new RegExp('letters/?(\\?|$)')).reply(200, [
      { id: 1, status: 'draft', letter_type: 'business_trip', created_at: '2026-01-01' },
    ]);

    const { findByText, queryByText } = await renderWithProviders(<LettersListScreen />);

    expect(await findByText("Xatlar")).toBeTruthy();
    // No split → LetterDetailView never mounts embedded in this screen.
    expect(queryByText("Ma'lumot")).toBeNull();
  }, 15000);

  it('re-anchors selectedId when the selected letter falls out of `sorted` (e.g. switching tabs)', async () => {
    (useWindowDimensions as jest.Mock).mockReturnValue(TABLET_LANDSCAPE);
    // "action" tab (assigned_signer=true): a single business_trip letter (id 1)
    // -> auto-selected, distinguishable from the "mine" tab's letter by type
    // label ("Xizmat safari" vs "Ariza").
    mock.onGet(LETTERS_LIST, { params: { assigned_signer: true } }).reply(200, [
      { id: 1, status: 'draft', letter_type: 'business_trip', created_at: '2026-01-02' },
    ]);
    // "mine" tab (signer=true): a different single letter (id 2), so the
    // previously-selected id 1 is no longer in `sorted` after the switch.
    mock.onGet(LETTERS_LIST, { params: { signer: true } }).reply(200, [
      { id: 2, status: 'confirmed', letter_type: 'application', created_at: '2026-01-01' },
    ]);
    mock.onGet(new RegExp('letters/1/trip-movements')).reply(200, []);
    mock.onGet(LETTER_DETAIL(1)).reply(200, { id: 1, status: 'draft', letter_type: 'business_trip' });
    mock.onGet(LETTER_DETAIL(2)).reply(200, { id: 2, status: 'confirmed', letter_type: 'application' });

    const { findByText, findAllByText, queryByText } = await renderWithProviders(<LettersListScreen />);

    // Auto-selects letter 1 under the default "action" tab: its type label
    // appears twice (master row + detail pane bigTitle).
    await waitFor(async () => {
      const matches = await findAllByText('Xizmat safari');
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });

    // Switch to "mine" — letter 1 (still selected) is no longer in the new
    // `sorted` list; without the stale-guard the detail pane would keep
    // showing letter 1 ("Xizmat safari") even though only letter 2 is listed.
    fireEvent.press(await findByText('Mening'));

    await waitFor(async () => {
      const matches = await findAllByText('Ariza');
      expect(matches.length).toBeGreaterThanOrEqual(2); // master row + re-anchored detail pane
    });
    expect(queryByText('Xizmat safari')).toBeNull();
  }, 15000);
});
