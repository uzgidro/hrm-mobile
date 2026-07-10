import React from 'react';
import { renderWithProviders, fireEvent, waitFor, act } from '@/test/renderWithProviders';
import { useLockStore } from '@/store/lockStore';
import * as biometrics from '@/auth/biometrics';
import i18n from '@/i18n';
import PinSetupScreen from '../PinSetupScreen';

// expo-router@6 pulls ESM navigation internals that aren't transpiled; the
// screen never navigates (routing is declarative) but importing it must not
// drag those in.
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

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

describe('PinSetupScreen', () => {
  beforeEach(() => {
    // The zustand singleton bleeds between tests — inject fresh action spies and
    // a known status. Selectors read these merged values on the next render.
    useLockStore.setState({
      status: 'setup-required',
      setupPin: jest.fn().mockResolvedValue(undefined),
      setBiometricsEnabled: jest.fn().mockResolvedValue(undefined),
    });
    // Default: no biometrics offered after setup unless a case opts in.
    jest.spyOn(biometrics, 'isBiometricAvailable').mockResolvedValue(false);
  });

  it('advances from the enter step to the confirm step after 4 digits', async () => {
    const { getByTestId, getByText, queryByText } = await renderWithProviders(<PinSetupScreen />);

    expect(getByText(i18n.t('security.setupTitle'))).toBeTruthy();

    await enterPin(getByTestId, '1234');

    await waitFor(() => expect(getByText(i18n.t('security.setupConfirmTitle'))).toBeTruthy());
    expect(queryByText(i18n.t('security.setupTitle'))).toBeNull();
  });

  it('calls setupPin when the confirm PIN matches', async () => {
    const setupPin = jest.fn().mockResolvedValue(undefined);
    useLockStore.setState({ setupPin });

    const { getByTestId, getByText } = await renderWithProviders(<PinSetupScreen />);

    await enterPin(getByTestId, '1234');
    await waitFor(() => expect(getByText(i18n.t('security.setupConfirmTitle'))).toBeTruthy());

    await enterPin(getByTestId, '1234');
    await waitFor(() => expect(setupPin).toHaveBeenCalledWith('1234'));
  });

  it('shows the mismatch error and returns to the enter step on a wrong confirm', async () => {
    const setupPin = jest.fn().mockResolvedValue(undefined);
    useLockStore.setState({ setupPin });

    const { getByTestId, getByText } = await renderWithProviders(<PinSetupScreen />);

    await enterPin(getByTestId, '1234');
    await waitFor(() => expect(getByText(i18n.t('security.setupConfirmTitle'))).toBeTruthy());

    await enterPin(getByTestId, '9999');

    await waitFor(() =>
      expect(getByTestId('pin-error')).toHaveTextContent(
        i18n.t('security.mismatch')
      )
    );
    // Back on the enter step.
    expect(getByText(i18n.t('security.setupTitle'))).toBeTruthy();
    expect(setupPin).not.toHaveBeenCalled();
  });
});
