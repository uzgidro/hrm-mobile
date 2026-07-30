// Covers Task 15: the orders list stays a plain push-navigated list on phone/
// portrait (unchanged), and switches to a SplitLayout master/detail view when
// `isTablet && isLandscape` — tapping a row then sets `selectedId` instead of
// pushing `/order-detail`, and the right pane renders the embedded
// OrderDetailView for that id. Rather than mocking react-native's
// `useWindowDimensions` (which breaks jest-expo's own native-module setup —
// it needs the real react-native module), this mocks `useBreakpoint` at its
// own module boundary: `resolveBreakpoint`'s tablet/landscape math is already
// fully covered by responsive.test.ts, so the screen only needs to be told
// "phone portrait" vs "tablet landscape" and react to it.
import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import { ORDER_ACTS, ORDER_ACT_DETAIL } from '@/api/urls';
import OrdersListScreen from '../OrdersListScreen';

// The screen (and the embedded OrderDetailView it renders in split mode) only
// use `router.push` from expo-router; mock it so the test doesn't pull in
// expo-router's untranspiled ESM navigation internals (same pattern as
// orderDetailView.test.tsx / homeBento.test.tsx).
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const PHONE_PORTRAIT = { width: 390, height: 844 };
const TABLET_LANDSCAPE = { width: 1024, height: 768 };

let mockWindowDimensions = PHONE_PORTRAIT;
jest.mock('@/utils/responsive', () => {
  const actual = jest.requireActual('@/utils/responsive');
  return {
    ...actual,
    useBreakpoint: () => actual.resolveBreakpoint(mockWindowDimensions.width, mockWindowDimensions.height),
  };
});

// status 'changes_requested' + created_by_id === the test employee satisfies
// needsMyAction's "creator must resubmit" branch, so both rows show up under
// the default "action" tab without needing signer/familiarizer fixtures.
const ORDERS = [
  {
    id: 1,
    status: 'changes_requested',
    created_by_id: 99,
    category_rel: { name: 'First decree' },
    created_at: '2026-01-02T00:00:00Z',
  },
  {
    id: 2,
    status: 'changes_requested',
    created_by_id: 99,
    category_rel: { name: 'Second decree' },
    created_at: '2026-01-01T00:00:00Z',
  },
];

describe('OrdersListScreen', () => {
  const mock = new MockAdapter(apiClient);

  beforeEach(() => {
    mockWindowDimensions = PHONE_PORTRAIT;
    useAuthStore.setState({
      user: { type: 'employee', employee: { id: 99, legal_name: 'Test User' } } as any,
      isAuthenticated: true,
    } as any);
  });

  afterEach(() => mock.reset());

  it('phone/portrait: renders the plain list (no split, both cards visible)', async () => {
    mock.onGet(ORDER_ACTS).reply(200, ORDERS);

    const { findAllByText, queryByText } = await renderWithProviders(<OrdersListScreen />);

    // Each category name appears twice: as a filter chip AND as the card title,
    // so the card is present iff there are >= 2 matches (chip alone would be 1).
    expect((await findAllByText('First decree')).length).toBeGreaterThanOrEqual(2);
    expect((await findAllByText('Second decree')).length).toBeGreaterThanOrEqual(2);
    // No detail pane / placeholder text rendered outside split mode.
    expect(queryByText('First decree, №')).toBeNull();
  });

  it('tablet landscape: renders SplitLayout with the first order auto-selected in the detail pane', async () => {
    mockWindowDimensions = TABLET_LANDSCAPE;
    mock.onGet(ORDER_ACTS).reply(200, ORDERS);
    mock.onGet(new RegExp('order-acts/1')).reply(200, {
      id: 1,
      status: 'confirmed',
      category_rel: { name: 'First decree' },
    });
    mock.onGet(new RegExp('employees')).reply(200, { items: [], total: 0 });

    const { findAllByText } = await renderWithProviders(<OrdersListScreen />);

    // "First decree" appears twice: once in the master list row, once as the
    // embedded detail pane's big title — auto-selected because selectedId
    // starts null and the first row in `filtered` is order id 1. A generous
    // timeout keeps this from flaking under a loaded CI/parallel-worker run
    // (matches orderDetailView.test.tsx's pattern for the same query hop).
    await waitFor(
      async () => {
        const matches = await findAllByText('First decree');
        expect(matches.length).toBeGreaterThanOrEqual(2);
      },
      { timeout: 10000 }
    );
  }, 15000);

  it('tablet landscape: tapping a different row updates the detail pane instead of navigating', async () => {
    mockWindowDimensions = TABLET_LANDSCAPE;
    mock.onGet(ORDER_ACTS).reply(200, ORDERS);
    mock.onGet(ORDER_ACT_DETAIL(1)).reply(200, {
      id: 1,
      status: 'confirmed',
      category_rel: { name: 'First decree' },
    });
    mock.onGet(ORDER_ACT_DETAIL(2)).reply(200, {
      id: 2,
      status: 'confirmed',
      category_rel: { name: 'Second decree' },
    });
    mock.onGet(new RegExp('employees')).reply(200, { items: [], total: 0 });

    const { findAllByText, findByText } = await renderWithProviders(<OrdersListScreen />);

    // Wait for the first auto-selection to settle, then tap the "Second
    // decree" row's master card.
    await findAllByText('First decree');
    const secondRow = (await findAllByText('Second decree'))[0];
    fireEvent.press(secondRow);

    await waitFor(
      async () => {
        const matches = await findAllByText('Second decree');
        expect(matches.length).toBeGreaterThanOrEqual(2);
      },
      { timeout: 10000 }
    );
    // The router was never used to push a detail route in split mode.
    const { router } = jest.requireMock('expo-router');
    expect(router.push).not.toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/order-detail' })
    );
    expect(await findByText('First decree')).toBeTruthy(); // master row still listed

    // Let the newly-mounted detail pane's background queries (employees list
    // for the familiarizer picker) settle before the test tears down, so their
    // resolution doesn't land as an unwrapped state update after this test ends.
    await waitFor(
      () => expect(mock.history.get.some((r) => /employees/.test(r.url ?? ''))).toBe(true),
      { timeout: 10000 }
    );
  }, 15000);

  it('tablet landscape: re-anchors selectedId when the selected order falls out of `filtered` (e.g. switching tabs)', async () => {
    mockWindowDimensions = TABLET_LANDSCAPE;
    // Order 1: pending_approval with the test employee (99) as the assigned
    // approver signer -> needsMyAction true (shows under "action"), but NOT
    // created by 99 -> excluded from "mine". Order 2: created by 99 but
    // already confirmed (no action needed) -> excluded from "action", shows
    // under "mine".
    mock.onGet(ORDER_ACTS).reply(200, [
      {
        id: 1,
        status: 'pending_approval',
        created_by_id: 5,
        assigned_signers: [{ signer_type: 'approver', employee_id: 99 }],
        category_rel: { name: 'First decree' },
        created_at: '2026-01-02T00:00:00Z',
      },
      {
        id: 2,
        status: 'confirmed',
        created_by_id: 99,
        category_rel: { name: 'Second decree' },
        created_at: '2026-01-01T00:00:00Z',
      },
    ]);
    mock.onGet(ORDER_ACT_DETAIL(1)).reply(200, {
      id: 1,
      status: 'pending_approval',
      category_rel: { name: 'First decree' },
    });
    mock.onGet(ORDER_ACT_DETAIL(2)).reply(200, {
      id: 2,
      status: 'confirmed',
      category_rel: { name: 'Second decree' },
    });
    mock.onGet(new RegExp('employees')).reply(200, { items: [], total: 0 });

    const { findAllByText, findByText, queryByText } = await renderWithProviders(<OrdersListScreen />);

    // Auto-selects order 1 (only row under the default "action" tab).
    await waitFor(async () => {
      const matches = await findAllByText('First decree');
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });

    // Switch to the "mine" tab — order 1 (still selected) falls out of
    // `filtered` because it wasn't created by the test employee; order 2
    // (created by the test employee) is the only row left. Without the
    // stale-guard, selectedId would still point at order 1 and the detail
    // pane would keep rendering it even though its row is no longer visible.
    fireEvent.press(await findByText('Mening'));

    await waitFor(async () => {
      const matches = await findAllByText('Second decree');
      expect(matches.length).toBeGreaterThanOrEqual(2); // master row + re-anchored detail pane
    });
    expect(queryByText('First decree')).toBeNull(); // no longer in the list, and no longer the stale detail
  }, 15000);
});
