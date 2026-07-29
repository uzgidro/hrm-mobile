import React from 'react';
import { useWindowDimensions } from 'react-native';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import { VISITORS_LIST } from '@/api/urls';
import VisitorsListScreen from '../screens/VisitorsListScreen';

// The screen uses `router.push`/`router.back`/`router.canGoBack` from
// expo-router; mock it so the test doesn't pull in expo-router's
// untranspiled ESM navigation internals (same pattern as
// lettersListScreen.split.test.tsx / OrdersListScreen.test.tsx).
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), replace: jest.fn() },
}));

// Force tablet-landscape so useBreakpoint() resolves split=true. Mirrors the
// shortest-side>=600 + width>height rule in src/utils/responsive.ts.
jest.mock('react-native/Libraries/Utilities/useWindowDimensions');

const TABLET_LANDSCAPE = { width: 1194, height: 834, scale: 2, fontScale: 1 };
const PHONE_PORTRAIT = { width: 390, height: 844, scale: 3, fontScale: 1 };

const VISITORS = [
  { id: 1, legal_name: 'First Visitor', is_active: true },
  { id: 2, legal_name: 'Second Visitor', is_active: true },
];

describe('VisitorsListScreen (tablet-landscape split)', () => {
  const mock = new MockAdapter(apiClient);

  beforeEach(() => {
    useAuthStore.setState({
      user: { type: 'employee', employee: { id: 1, legal_name: 'Test User' } } as any,
      isAuthenticated: true,
    } as any);
  });

  afterEach(() => mock.reset());

  it('phone/portrait: renders the plain list (no split, both cards visible)', async () => {
    (useWindowDimensions as jest.Mock).mockReturnValue(PHONE_PORTRAIT);
    mock.onGet(VISITORS_LIST).reply(200, VISITORS);

    const { findByText, queryByText } = await renderWithProviders(<VisitorsListScreen />);

    expect(await findByText('First Visitor')).toBeTruthy();
    expect(await findByText('Second Visitor')).toBeTruthy();
    // Detail-pane-only content (visitors.permitActive badge) never renders
    // outside split — the plain list card only shows statusActive/statusInactive.
    expect(queryByText('Aktiv ruxsat')).toBeNull();
  }, 15000);

  it('tablet landscape: renders SplitLayout with the first visitor auto-selected in the detail pane', async () => {
    (useWindowDimensions as jest.Mock).mockReturnValue(TABLET_LANDSCAPE);
    mock.onGet(VISITORS_LIST).reply(200, VISITORS);
    mock.onGet(new RegExp('visitors/1')).reply(200, { id: 1, legal_name: 'First Visitor', is_active: true });

    const { findAllByText } = await renderWithProviders(<VisitorsListScreen />);

    // "First Visitor" appears twice: once in the master list row, once as the
    // embedded detail pane's hero name — auto-selected because selectedId
    // starts null and the first row in `filtered` is visitor id 1.
    await waitFor(
      async () => {
        const matches = await findAllByText('First Visitor');
        expect(matches.length).toBeGreaterThanOrEqual(2);
      },
      { timeout: 10000 }
    );
  }, 15000);

  it('tablet landscape: tapping a different row updates the detail pane instead of navigating', async () => {
    (useWindowDimensions as jest.Mock).mockReturnValue(TABLET_LANDSCAPE);
    mock.onGet(VISITORS_LIST).reply(200, VISITORS);
    mock.onGet(new RegExp('visitors/1')).reply(200, { id: 1, legal_name: 'First Visitor', is_active: true });
    mock.onGet(new RegExp('visitors/2')).reply(200, { id: 2, legal_name: 'Second Visitor', is_active: true });

    const { findAllByText, findByText } = await renderWithProviders(<VisitorsListScreen />);

    await findAllByText('First Visitor');
    const secondRow = (await findAllByText('Second Visitor'))[0];
    fireEvent.press(secondRow);

    await waitFor(
      async () => {
        const matches = await findAllByText('Second Visitor');
        expect(matches.length).toBeGreaterThanOrEqual(2);
      },
      { timeout: 10000 }
    );
    // The router was never used to push a detail route in split mode.
    const { router } = jest.requireMock('expo-router');
    expect(router.push).not.toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/mehmon-detail' })
    );
    expect(await findByText('First Visitor')).toBeTruthy(); // master row still listed
  }, 15000);

  it('tablet landscape: re-anchors selectedId when the selected visitor falls out of `filtered` (e.g. search)', async () => {
    (useWindowDimensions as jest.Mock).mockReturnValue(TABLET_LANDSCAPE);
    mock.onGet(VISITORS_LIST).reply(200, VISITORS);
    mock.onGet(new RegExp('visitors/1')).reply(200, { id: 1, legal_name: 'First Visitor', is_active: true });
    mock.onGet(new RegExp('visitors/2')).reply(200, { id: 2, legal_name: 'Second Visitor', is_active: true });

    const { findAllByText, findByPlaceholderText, queryByText } = await renderWithProviders(<VisitorsListScreen />);

    // Auto-selects visitor 1 (first in the unfiltered list).
    await waitFor(async () => {
      const matches = await findAllByText('First Visitor');
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });

    // Search narrows the list to only "Second Visitor" — visitor 1 (still
    // selected) falls out of `filtered`. Without the stale-guard, selectedId
    // would still point at visitor 1 and the detail pane would keep
    // rendering it even though its row is no longer visible.
    const searchInput = await findByPlaceholderText('Ism, tashkilot yoki qabul qiluvchi...');
    fireEvent.changeText(searchInput, 'Second');

    await waitFor(async () => {
      const matches = await findAllByText('Second Visitor');
      expect(matches.length).toBeGreaterThanOrEqual(2); // master row + re-anchored detail pane
    });
    expect(queryByText('First Visitor')).toBeNull();
  }, 15000);
});
