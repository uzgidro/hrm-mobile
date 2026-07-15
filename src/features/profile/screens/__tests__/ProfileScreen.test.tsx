import React from 'react';
import Constants from 'expo-constants';
import { renderWithProviders, fireEvent, act, waitFor } from '@/test/renderWithProviders';
import { useLockStore } from '@/store/lockStore';
import { useAuthStore } from '@/store/authStore';
import { getConfirm, answerConfirm, __resetConfirm } from '@/lib/confirm';
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
    __resetConfirm();
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

  it('requests a logout confirmation via the global confirm store and logs out on confirm', async () => {
    const logout = jest.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ logout });

    const { getByText } = await renderWithProviders(<ProfileScreen />);

    // No confirmation pending until the logout row is tapped.
    expect(getConfirm()).toBeNull();

    await act(async () => {
      fireEvent.press(getByText(i18n.t('profile.logout')));
    });

    // The screen asked the global confirm store (rendered by <ConfirmHost/> in
    // the real app), not an OS Alert.
    await waitFor(() => expect(getConfirm()).not.toBeNull());
    expect(getConfirm()).toMatchObject({
      title: i18n.t('profile.logout'),
      destructive: true,
    });

    await act(async () => {
      answerConfirm(true);
    });

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
  });

  it('does not log out when the confirmation is cancelled', async () => {
    const logout = jest.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ logout });

    const { getByText } = await renderWithProviders(<ProfileScreen />);

    await act(async () => {
      fireEvent.press(getByText(i18n.t('profile.logout')));
    });
    await waitFor(() => expect(getConfirm()).not.toBeNull());

    await act(async () => {
      answerConfirm(false);
    });

    expect(logout).not.toHaveBeenCalled();
    expect(getConfirm()).toBeNull();
  });
});
