// Doctor's QR scan screen. The camera cannot run on web / in jest, so the scanner is replaced by a button that
// delivers a code; the rest (resolve, guest card, errors, access) is the real screen.
import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import { fireEvent, renderWithProviders, waitFor } from '@/test/renderWithProviders';
import ScanScreen from '../screens/ScanScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({}),
}));
jest.mock('@/components/CodeScanner', () => {
  const R = require('react');
  const { Pressable: P, Text: T } = require('react-native');
  return {
    CodeScanner: ({ onCode, message }: { onCode: (c: string) => void; message?: string | null }) =>
      R.createElement(R.Fragment, null, R.createElement(P, { testID: 'fake-scan', onPress: () => onCode('77528724503944013730') }, R.createElement(T, null, 'scan')), message ? R.createElement(T, { testID: 'scan-message' }, message) : null),
  };
});

const setRoles = (roles: string[]) => useAuthStore.setState({ user: { type: 'employee', sanatorium_roles: roles } as never, isAuthenticated: true } as never);

describe('ScanScreen', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    mockPush.mockClear();
    await i18n.changeLanguage('uz-Latn');
    mock.onGet('sanatorium/me').reply(200, { features: {} });
  });
  afterEach(() => mock.reset());

  it('a scanned code opens the guest card, which opens the profile', async () => {
    setRoles(['doctor']);
    mock.onPost('sanatorium/qr/resolve').reply(200, {
      guest: { id: 7, full_name: 'Qodirova Gulnora', phone: '+998901234107', age: 59 },
      active_stay: { id: 7, status: 'checked_in', planned_from: '2026-11-23', planned_to: '2026-12-07', room: { number: '14', building: 'Asosiy korpus' } },
    });
    const { findByTestId } = await renderWithProviders(<ScanScreen />);
    fireEvent.press(await findByTestId('fake-scan'));
    expect(await findByTestId('resolved-guest')).toBeTruthy();
    expect((await findByTestId('rg-age')).props.children).toBe('59');
    expect(JSON.parse(mock.history.post.find((r) => /qr\/resolve/.test(r.url ?? ''))!.data)).toEqual({ code: '77528724503944013730' });
    fireEvent.press(await findByTestId('rg-open'));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/sanatorium-guest', params: { id: '7' } });
  });

  it('an unknown code shows the failure text and no card', async () => {
    setRoles(['doctor']);
    mock.onPost('sanatorium/qr/resolve').reply(404, { detail: { code: 'not_found' } });
    const { findByTestId, queryByTestId } = await renderWithProviders(<ScanScreen />);
    fireEvent.press(await findByTestId('fake-scan'));
    await waitFor(() => expect(queryByTestId('scan-message')).toBeTruthy());
    expect(queryByTestId('resolved-guest')).toBeNull();
  });

  it('other roles get the denied view and the scanner is not drawn', async () => {
    setRoles(['kitchen']);
    const { queryByTestId } = await renderWithProviders(<ScanScreen />);
    expect(queryByTestId('fake-scan')).toBeNull();
  });
});
