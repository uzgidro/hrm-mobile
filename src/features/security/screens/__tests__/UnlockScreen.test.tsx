import React from 'react';
import { Alert } from 'react-native';
import { renderWithProviders, fireEvent, waitFor, act } from '@/test/renderWithProviders';
import { useLockStore } from '@/store/lockStore';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import type { User } from '@/types';
import UnlockScreen from '../UnlockScreen';

// expo-router@6 pulls untranspiled ESM; unlock navigation is declarative so the
// screen never calls the router, but importing it must not drag ESM in.
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const USER = {
  id: 1,
  type: 'employee',
  employee: { id: 10, legal_name: 'Ali Valiyev' },
} as User;

// Press each digit in its own act() so the pad re-renders with the updated
// value prop between presses — otherwise every press reads the stale empty
// value and the PIN never reaches full length.
async function enterPin(getByTestId: (id: string) => unknown, pin: string) {
  for (const d of pin) {
    await act(async () => {
      fireEvent.press(getByTestId(`pin-key-${d}`) as never);
    });
  }
}

describe('UnlockScreen', () => {
  beforeEach(() => {
    // Reset both singletons to a known shape and inject action spies. Selectors
    // pick up these merged values on render.
    useLockStore.setState({
      status: 'locked',
      biometricsEnabled: false,
      biometricsSupported: false,
      unlockWithPin: jest
        .fn()
        .mockResolvedValue({ ok: true, remaining: 5, forceLogout: false }),
      unlockWithBiometrics: jest.fn().mockResolvedValue(false),
      reset: jest.fn().mockResolvedValue(undefined),
    });
    useAuthStore.setState({ user: USER, logout: jest.fn().mockResolvedValue(undefined) });
  });

  it('does not reveal whose account this is (no name/photo on the lock screen)', async () => {
    const { queryByText, getByText } = await renderWithProviders(<UnlockScreen />);
    // Privacy: the lock screen must not show the signed-in user's identity to
    // whoever is holding the phone — only the PIN prompt.
    expect(queryByText('Ali Valiyev')).toBeNull();
    // Renders under the uz-Latn default; assert via t() so the expectation
    // tracks the catalog rather than a hard-coded literal.
    expect(getByText(i18n.t('security.unlockTitle'))).toBeTruthy();
  });

  it('calls unlockWithPin with the typed PIN once it reaches full length', async () => {
    const unlockWithPin = jest
      .fn()
      .mockResolvedValue({ ok: true, remaining: 5, forceLogout: false });
    useLockStore.setState({ unlockWithPin });

    const { getByTestId } = await renderWithProviders(<UnlockScreen />);
    await enterPin(getByTestId, '1234');

    await waitFor(() => expect(unlockWithPin).toHaveBeenCalledWith('1234'));
  });

  it('shows the remaining-attempts error on a wrong PIN', async () => {
    useLockStore.setState({
      unlockWithPin: jest
        .fn()
        .mockResolvedValue({ ok: false, remaining: 4, forceLogout: false }),
    });

    const { getByTestId } = await renderWithProviders(<UnlockScreen />);
    await enterPin(getByTestId, '1234');

    await waitFor(() =>
      expect(getByTestId('pin-error')).toHaveTextContent(
        i18n.t('security.attemptsLeft', { count: 4 })
      )
    );
  });

  it('shows the force-logout alert and runs reset + logout on OK', async () => {
    const reset = jest.fn().mockResolvedValue(undefined);
    const logout = jest.fn().mockResolvedValue(undefined);
    useLockStore.setState({
      unlockWithPin: jest
        .fn()
        .mockResolvedValue({ ok: false, remaining: 0, forceLogout: true }),
      reset,
    });
    useAuthStore.setState({ user: USER, logout });

    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { getByTestId } = await renderWithProviders(<UnlockScreen />);
    await enterPin(getByTestId, '1234');

    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    expect(alertSpy).toHaveBeenCalledWith(
      i18n.t('security.forceLogoutTitle'),
      i18n.t('security.forceLogoutMessage'),
      expect.arrayContaining([expect.objectContaining({ text: i18n.t('common.ok') })])
    );

    // Invoke the OK button's onPress and assert the wipe + logout run.
    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    const ok = buttons.find((b) => b.text === i18n.t('common.ok'))!;
    await ok.onPress!();

    expect(reset).toHaveBeenCalledTimes(1);
    expect(logout).toHaveBeenCalledTimes(1);

    alertSpy.mockRestore();
  });

  it('auto-triggers biometrics on mount when enabled and supported', async () => {
    const unlockWithBiometrics = jest.fn().mockResolvedValue(true);
    useLockStore.setState({
      biometricsEnabled: true,
      biometricsSupported: true,
      unlockWithBiometrics,
    });

    await renderWithProviders(<UnlockScreen />);

    await waitFor(() => expect(unlockWithBiometrics).toHaveBeenCalledTimes(1));
  });
});
