import React from 'react';
import { Alert } from 'react-native';
import { renderWithProviders, fireEvent, waitFor, act } from '@/test/renderWithProviders';
import { useLockStore } from '@/store/lockStore';
import { useAuthStore } from '@/store/authStore';
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

  it('renders the signed-in user name', async () => {
    const { getByText } = await renderWithProviders(<UnlockScreen />);
    expect(getByText('Ali Valiyev')).toBeTruthy();
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
        "Noto'g'ri PIN kod. 4 ta urinish qoldi."
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
      'Urinishlar soni tugadi',
      'Xavfsizlik maqsadida tizimdan chiqarildingiz. Qaytadan kiring.',
      expect.arrayContaining([expect.objectContaining({ text: 'OK' })])
    );

    // Invoke the OK button's onPress and assert the wipe + logout run.
    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    const ok = buttons.find((b) => b.text === 'OK')!;
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
