// Smoke test for the Home tab's tablet bento layout (Task 8). The layout
// branching itself (`bp.isTablet` toggling `styles.bento`/`styles.bentoTile`)
// is trivial JSX conditionals with no independent pure function to unit-test
// in isolation — resolveBreakpoint's tablet/phone math is already covered by
// responsive.test.ts. This test only locks that the screen still renders its
// content (phone path) after introducing the bento wrapper + notifications
// tile, so a future refactor can't silently break the vertical stack.
import React from 'react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import HomeScreen from '../screens/HomeScreen';

// The screen only uses `router.push` from expo-router; mock it so the test
// doesn't pull in expo-router's untranspiled ESM navigation internals.
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

describe('HomeScreen (bento tiles present)', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { type: 'employee', employee: { id: 1, legal_name: 'Test User', supervisor: null } } as any,
      isAuthenticated: true,
    } as any);
  });

  it('renders the schedule card title', async () => {
    const { getByText } = await renderWithProviders(<HomeScreen />);
    // dashboard.scheduleTitle resolves through i18n; uz-Latn value is the app default.
    expect(getByText('Bugungi jadval')).toBeTruthy();
  });

  it('renders the requests card (phone stack unaffected by the bento wrapper)', async () => {
    const { getByText } = await renderWithProviders(<HomeScreen />);
    // isSupervisor is true here (employee.supervisor is null) → incomingRequests title.
    expect(getByText("Kiruvchi so'rovlar")).toBeTruthy();
  });

  it('renders the Davomat (attendance) module tile before the requests card', async () => {
    const { getByText } = await renderWithProviders(<HomeScreen />);
    // Same label as the Modules grid (modules.labels.attendance, uz-Latn "Davomat").
    // A plain employee is not KPP/chancellery, so canAccessPage('attendance') is true.
    expect(getByText('Davomat')).toBeTruthy();
  });
});
