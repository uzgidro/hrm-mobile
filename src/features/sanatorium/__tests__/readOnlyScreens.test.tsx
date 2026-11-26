// The chairman (sanatorium_read_only) reads the registrar's screens but sees no write control.
import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import { SANATORIUM_STAFF } from '@/api/urls';
import SettingsScreen from '../screens/SettingsScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true }, useLocalSearchParams: () => ({}) }));

const setUser = (u: Record<string, unknown>) =>
  useAuthStore.setState({ user: u as never, isAuthenticated: true } as never);
const registrar = { id: 1, type: 'employee', employee: { id: 1 }, sanatorium_roles: ['registrar'] };

describe('SettingsScreen — view-only account', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    mock.onGet(SANATORIUM_STAFF).reply(200, [{ id: 5, full_name: 'Ali Valiyev', is_registrar: true, is_active: true }]);
  });
  afterEach(() => mock.reset());

  it('registrar sees the add button', async () => {
    setUser(registrar);
    await renderWithProviders(<SettingsScreen />);
    expect(await screen.findByText('Ali Valiyev')).toBeTruthy();
    expect(screen.getByTestId('staff-add')).toBeTruthy();
  });

  it('the chairman sees the staff list but no add control', async () => {
    setUser({ ...registrar, sanatorium_read_only: true });
    await renderWithProviders(<SettingsScreen />);
    expect(await screen.findByText('Ali Valiyev')).toBeTruthy();
    expect(screen.queryByTestId('staff-add')).toBeNull();
  });
});
