// Guests list by role: the registrar sees add + families, the room keeper only a search that needs 2 characters.
import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import { SANATORIUM_GUESTS } from '@/api/urls';
import GuestsScreen from '../screens/GuestsScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));

const setUser = (roles: string[]) =>
  useAuthStore.setState({ user: { id: 1, type: 'employee', employee: { id: 1 }, sanatorium_roles: roles } as never, isAuthenticated: true } as never);

describe('GuestsScreen by role', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    mock.onGet(SANATORIUM_GUESTS).reply(200, {
      items: [{ id: 7, full_name: 'Karim Aliyev', phone: '+998901234567', age: 40, organization_name: 'Org', family_name: 'Aliyevlar', active_stay: { id: 3, status: 'checked_in', planned_from: '2026-11-20', planned_to: '2026-11-30', room: { id: 1, number: '12' } } }],
      total: 1, page: 1, size: 30,
    });
  });
  afterEach(() => mock.reset());

  it('registrar: add button, families segment, stay badge and organisation on the row', async () => {
    setUser(['registrar']);
    await renderWithProviders(<GuestsScreen />);
    expect(await screen.findByText('Karim Aliyev')).toBeTruthy();
    expect(screen.getByTestId('guest-add')).toBeTruthy();
    expect(screen.getByTestId('guests-seg')).toBeTruthy();
    expect(screen.getByTestId('guest-stay-7')).toBeTruthy();
    expect(screen.getByText(/Org/)).toBeTruthy();
  });

  it('room keeper: no add, no families, no list until two characters are typed', async () => {
    setUser(['room_keeper']);
    await renderWithProviders(<GuestsScreen />);
    expect(await screen.findByTestId('guests-type-hint')).toBeTruthy();
    expect(screen.queryByTestId('guest-add')).toBeNull();
    expect(screen.queryByTestId('guests-seg')).toBeNull();
    expect(screen.queryByText('Karim Aliyev')).toBeNull();
    expect(mock.history.get.filter((r) => r.url === SANATORIUM_GUESTS)).toHaveLength(0);
  });
});
