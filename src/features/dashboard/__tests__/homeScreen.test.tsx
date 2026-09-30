import React from 'react';
import { Text } from 'react-native';
import MockAdapter from 'axios-mock-adapter';
import { router } from 'expo-router';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import HomeScreen from '../screens/HomeScreen';

jest.mock('expo-router', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  return {
    router: { push: jest.fn() },
    Redirect: ({ href }: { href: string }) => <RNText>{`redirect:${href}`}</RNText>,
  };
});

const setUser = (user: Record<string, unknown>) =>
  useAuthStore.setState({ user: user as never, isAuthenticated: true } as never);

describe('HomeScreen (v3)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    (router.push as jest.Mock).mockClear();
    mock.onGet().reply(200, { items: [], total: 0 });
  });
  afterEach(() => mock.reset());

  it('oddiy xodim — xodim paneli va ism bilan salomlashuv', async () => {
    setUser({ id: 1, type: 'employee', employee: { id: 7, legal_name: 'Nodirboyev Javoxir' } });
    await renderWithProviders(<HomeScreen />);
    expect(await screen.findByTestId('board-employee')).toBeTruthy();
    expect(screen.getByTestId('home-greeting')).toHaveTextContent(/Javoxir/);
  });

  it('HR — rahbar paneli', async () => {
    setUser({ id: 1, type: 'employee', employee: { id: 7, legal_name: 'Ali Vali', is_multi_org_user: true, multi_org_employee_role: 'hr' } });
    await renderWithProviders(<HomeScreen />);
    expect(await screen.findByTestId('board-leader')).toBeTruthy();
  });

  it('KPP kiosk — post tabiga yo\'naltiriladi', async () => {
    setUser({ id: 1, type: 'kpp' });
    await renderWithProviders(<HomeScreen />);
    expect(screen.getByText('redirect:/post')).toBeTruthy();
  });

  it.each<[string, Record<string, unknown>, string]>([
    ['devonxona → Buyruqlar', { id: 1, type: 'employee', employee: { id: 7, legal_name: 'A B', is_multi_org_user: true, multi_org_employee_role: 'chancellery' } }, 'redirect:/documents?seg=orders'],
    ['filial admin → Modullar', { id: 1, type: 'admin' }, 'redirect:/modules'],
    ['mehmon → Profil', { id: 1, type: 'guest' }, 'redirect:/profile'],
  ])('%s', async (_n, user, text) => {
    setUser(user);
    await renderWithProviders(<HomeScreen />);
    expect(screen.getByText(text)).toBeTruthy();
  });

  it("qo'ng'iroq bildirishnomalarni ochadi", async () => {
    setUser({ id: 1, type: 'employee', employee: { id: 7, legal_name: 'Ali Vali' } });
    await renderWithProviders(<HomeScreen />);
    await fireEvent.press(screen.getByLabelText(i18n.t('modules.labels.notifications')));
    expect(router.push).toHaveBeenCalledWith('/notifications');
  });
});
