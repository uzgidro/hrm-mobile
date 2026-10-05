// QA 2026-10-05 (real data):
//  1. A line manager's incoming list asked `assigned_signer=true&status=pending&
//     signer=false` — empty, while the badge said 3 (the requests were routed to
//     them with `assigned_signers: []`). v2 lists by scope: mine (server default)
//     / team (`supervised=true`) / branch.
//  2. An employee WITHOUT a supervisor had no create button; v2 always offers it.
import React from 'react';
import { useWindowDimensions } from 'react-native';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import WorkLeavesScreen from '../WorkLeavesScreen';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() } }));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions');

const ME = 50;
const leaveRows = (url: string | undefined) => mock.history.get.filter((g) => g.url === url);
const mock = new MockAdapter(apiClient);

function setUser(extra: Record<string, unknown> = {}) {
  useAuthStore.setState({
    user: { id: 1, type: 'employee', employee: { id: ME, legal_name: 'Rahbar', ...extra } } as never,
    isAuthenticated: true,
  } as never);
}

describe('WorkLeavesScreen (web v2 RequestPermissionPage scopes)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useWindowDimensions as jest.Mock).mockReturnValue({ width: 390, height: 844, scale: 3, fontScale: 1 });
    mock.onGet('notifications/menu-badges').reply(200, { leaves: 3 });
    mock.onGet('work-leaves').reply(200, { items: [], total: 0, page: 1, size: 30, pages: 1 });
  });
  afterEach(() => mock.reset());

  it('default «Menga tegishli» sends no assigned_signer / employee_id; a manager also gets «Mening jamoam» = supervised', async () => {
    setUser();
    mock.onGet('employees').reply(200, { items: [{ id: 77 }], total: 1 });
    const r = await renderWithProviders(<WorkLeavesScreen />);

    await waitFor(() => expect(leaveRows('work-leaves').length).toBeGreaterThan(0));
    const first = leaveRows('work-leaves')[0].params;
    expect(first).not.toHaveProperty('assigned_signer');
    expect(first).not.toHaveProperty('employee_id');
    expect(first).not.toHaveProperty('supervised');

    fireEvent.press(await r.findByText('Mening jamoam'));
    await waitFor(() => expect(leaveRows('work-leaves').some((g) => g.params?.supervised === true)).toBe(true));
  });

  it('an employee without a supervisor still gets the create button; no team scope without subordinates', async () => {
    setUser({ supervisor_id: undefined });
    mock.onGet('employees').reply(200, { items: [], total: 0 });
    const r = await renderWithProviders(<WorkLeavesScreen />);

    expect(await r.findByTestId('leaves-create')).toBeTruthy();
    await waitFor(() => expect(leaveRows('employees').length).toBeGreaterThan(0));
    expect(r.queryByText('Mening jamoam')).toBeNull();
  });
});
