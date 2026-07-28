import React from 'react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { NavRail } from '../NavRail';
import { useAuthStore } from '../../store/authStore';

describe('NavRail', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { type: 'employee', employee: { id: 1, is_multi_org_user: false } } as any,
      isAuthenticated: true,
    } as any);
  });

  it('renders the Home destination label for an authenticated user', async () => {
    const { getByText } = await renderWithProviders(<NavRail />);
    expect(getByText('Asosiy')).toBeTruthy(); // modules.labels.home uz-Latn
  });

  it('hides items the role cannot access (web-parity)', async () => {
    useAuthStore.setState({
      user: { type: 'employee', employee: { id: 2, is_multi_org_user: true, multi_org_employee_role: 'kpp' } } as any,
      isAuthenticated: true,
    } as any);
    const { queryByText } = await renderWithProviders(<NavRail />);
    expect(queryByText('Hujjatlar')).toBeNull(); // KPP has no documents nav
  });
});
