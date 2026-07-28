import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { router } from 'expo-router';
import { apiClient } from '@/api/client';
import { renderWithProviders, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import { NOTIFICATIONS_LIST, NOTIFICATION_READ, ORDER_ACT_DETAIL } from '@/api/urls';
import { useBreakpoint } from '@/utils/responsive';
import NotificationsScreen from '../NotificationsScreen';

// The screen uses `router.back`/`router.push` from expo-router; mock it so the
// test doesn't pull in expo-router's untranspiled ESM navigation internals
// (same pattern as lettersListScreen.split.test.tsx / OrderDetailView test).
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
const routerPush = router.push as jest.Mock;

// Force tablet-landscape / phone-portrait by mocking the breakpoint hook
// directly (per the brief), rather than useWindowDimensions — this screen's
// only responsive dependency is `useBreakpoint()`.
jest.mock('@/utils/responsive');

const TABLET_LANDSCAPE = { width: 1194, height: 834, isTablet: true, isLandscape: true, contentMaxWidth: 760, gridColumns: 6 };
const PHONE_PORTRAIT = { width: 390, height: 844, isTablet: false, isLandscape: false, contentMaxWidth: 390, gridColumns: 3 };

describe('NotificationsScreen (tablet-landscape split)', () => {
  const mock = new MockAdapter(apiClient);

  beforeEach(() => {
    useAuthStore.setState({
      user: { type: 'employee', employee: { id: 1, legal_name: 'Test User' } } as any,
      isAuthenticated: true,
    } as any);
  });

  afterEach(() => {
    mock.reset();
    routerPush.mockClear();
  });

  it('renders master + auto-selected order detail pane in split mode', async () => {
    (useBreakpoint as jest.Mock).mockReturnValue(TABLET_LANDSCAPE);
    mock.onPost(NOTIFICATION_READ(1)).reply(200);
    mock.onGet(NOTIFICATIONS_LIST).reply(200, [
      {
        id: 1, notification_type: 'order_act_created', description: 'desc',
        order_act_id: 3, is_read: false, created_at: '2026-01-01T00:00:00Z',
      },
    ]);
    mock.onGet(ORDER_ACT_DETAIL(3)).reply(200, {
      id: 3, status: 'draft', category_rel: { name: 'Test decree' },
    });
    mock.onGet(new RegExp('employees')).reply(200, { items: [], total: 0 });

    const { findByText } = await renderWithProviders(<NotificationsScreen />);

    // Master list header still renders.
    expect(await findByText('Bildirishnomalar')).toBeTruthy();
    // Tap the notification row (not auto-selected — user drives selection).
    fireEvent.press(await findByText('Yangi buyruq'));

    // Detail pane renders the embedded OrderDetailView for the tapped target.
    expect(await findByText('Test decree')).toBeTruthy();
    // markRead still fires on tap in split mode.
    await waitFor(() => {
      expect(mock.history.post.some((r) => r.url === NOTIFICATION_READ(1))).toBe(true);
    });
    // Split mode never pushes a route for an order target.
    expect(routerPush).not.toHaveBeenCalled();
  }, 15000);

  it('shows the placeholder empty state when nothing is selected in split mode', async () => {
    (useBreakpoint as jest.Mock).mockReturnValue(TABLET_LANDSCAPE);
    mock.onGet(NOTIFICATIONS_LIST).reply(200, []);

    const { findByText, queryByText } = await renderWithProviders(<NotificationsScreen />);

    await findByText('Bildirishnomalar');
    expect(queryByText('Test decree')).toBeNull();
  }, 15000);

  it('falls back to router.push in split mode for a target without an embeddable detail view (news)', async () => {
    (useBreakpoint as jest.Mock).mockReturnValue(TABLET_LANDSCAPE);
    mock.onPost(NOTIFICATION_READ(2)).reply(200);
    mock.onGet(NOTIFICATIONS_LIST).reply(200, [
      {
        id: 2, notification_type: 'news_post_created', description: 'desc',
        news_post_id: 9, is_read: false, created_at: '2026-01-01T00:00:00Z',
      },
    ]);

    const { findByText } = await renderWithProviders(<NotificationsScreen />);
    fireEvent.press(await findByText('Yangilik'));

    await waitFor(() => expect(routerPush).toHaveBeenCalledWith('/news'));
    await waitFor(() => {
      expect(mock.history.post.some((r) => r.url === NOTIFICATION_READ(2))).toBe(true);
    });
  }, 15000);

  it('re-anchors the split selection when the selected notification disappears from the list (stale-guard)', async () => {
    (useBreakpoint as jest.Mock).mockReturnValue(TABLET_LANDSCAPE);
    mock.onPost(NOTIFICATION_READ(1)).reply(200);
    mock.onGet(ORDER_ACT_DETAIL(3)).reply(200, {
      id: 3, status: 'draft', category_rel: { name: 'Test decree' },
    });
    mock.onGet(new RegExp('employees')).reply(200, { items: [], total: 0 });

    let listResponse = [
      {
        id: 1, notification_type: 'order_act_created', description: 'desc',
        order_act_id: 3, is_read: false, created_at: '2026-01-01T00:00:00Z',
      },
    ];
    mock.onGet(NOTIFICATIONS_LIST).reply(() => [200, listResponse]);

    const { findByText, queryByText, queryClient } = await renderWithProviders(<NotificationsScreen />);

    fireEvent.press(await findByText('Yangi buyruq'));
    expect(await findByText('Test decree')).toBeTruthy();

    // The notification vanishes from the list (e.g. a refetch after an
    // external change, same trigger as pull-to-refresh) — without a
    // stale-guard the detail pane would keep showing the now-gone order.
    listResponse = [];
    await queryClient.invalidateQueries({ queryKey: ['notifications'] });

    await waitFor(() => expect(queryByText('Test decree')).toBeNull());
  }, 15000);

  it('phone/portrait renders the plain list (no split, tap still marks read and pushes)', async () => {
    (useBreakpoint as jest.Mock).mockReturnValue(PHONE_PORTRAIT);
    mock.onPost(NOTIFICATION_READ(1)).reply(200);
    mock.onGet(NOTIFICATIONS_LIST).reply(200, [
      {
        id: 1, notification_type: 'order_act_created', description: 'desc',
        order_act_id: 3, is_read: false, created_at: '2026-01-01T00:00:00Z',
      },
    ]);

    const { findByText, queryByText } = await renderWithProviders(<NotificationsScreen />);

    expect(await findByText('Bildirishnomalar')).toBeTruthy();
    fireEvent.press(await findByText('Yangi buyruq'));

    await waitFor(() => expect(routerPush).toHaveBeenCalledWith('/order-detail?id=3'));
    await waitFor(() => {
      expect(mock.history.post.some((r) => r.url === NOTIFICATION_READ(1))).toBe(true);
    });
    // No split → OrderDetailView never mounts embedded in this screen.
    expect(queryByText('Test decree')).toBeNull();
  }, 15000);
});
