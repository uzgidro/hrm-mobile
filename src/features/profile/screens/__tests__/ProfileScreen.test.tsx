import React from 'react';
import Constants from 'expo-constants';
import { renderWithProviders, fireEvent, act, waitFor } from '@/test/renderWithProviders';
import { useLockStore } from '@/store/lockStore';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import ProfileScreen from '../ProfileScreen';

// The screen only uses `router.push` from expo-router; mock it so the test
// doesn't pull in expo-router's untranspiled ESM navigation internals.
// (jest.mock is hoisted above the imports by the Jest transform.)
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

describe('ProfileScreen', () => {
  // The catalog-parity suite switches i18n's language; reset to the default so
  // these assertions resolve against the uz-Latn source of truth regardless of
  // test order.
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
  });

  it('renders the security rows (native) and the dynamic version', async () => {
    // Seed the lock store so the biometrics row is shown. The screen handles a
    // null auth user via its own fallbacks, so no user seeding is needed.
    useLockStore.setState({ biometricsSupported: true, biometricsEnabled: false });

    const { getByText } = await renderWithProviders(<ProfileScreen />);

    // Labels now come through i18n; assert via t() so the test tracks the
    // catalog rather than a hard-coded Uzbek literal.
    expect(getByText(i18n.t('profile.changePin'))).toBeTruthy();
    expect(getByText(i18n.t('profile.biometrics'))).toBeTruthy();

    const version = Constants.expoConfig?.version ?? '1.0.0';
    expect(getByText(i18n.t('profile.version', { version }))).toBeTruthy();
  });

  it('confirms logout through the in-app sheet, not an OS Alert', async () => {
    const logout = jest.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ logout });

    const { getByText, getByTestId, queryByTestId } = await renderWithProviders(<ProfileScreen />);

    // No confirmation visible until the logout row is tapped.
    expect(queryByTestId('confirm-sheet-confirm')).toBeNull();

    await act(async () => {
      fireEvent.press(getByText(i18n.t('profile.logout')));
    });

    // The in-app confirm sheet shows (title + confirm/cancel buttons).
    await waitFor(() => expect(getByTestId('confirm-sheet-confirm')).toBeTruthy());
    expect(getByText(i18n.t('profile.logoutConfirm'))).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('confirm-sheet-confirm'));
    });

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('does not log out when the sheet is cancelled', async () => {
    const logout = jest.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ logout });

    const { getByText, getByTestId, queryByTestId } = await renderWithProviders(<ProfileScreen />);

    await act(async () => {
      fireEvent.press(getByText(i18n.t('profile.logout')));
    });
    await waitFor(() => expect(getByTestId('confirm-sheet-cancel')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByTestId('confirm-sheet-cancel'));
    });

    expect(logout).not.toHaveBeenCalled();
    await waitFor(() => expect(queryByTestId('confirm-sheet-confirm')).toBeNull());
  });
});
