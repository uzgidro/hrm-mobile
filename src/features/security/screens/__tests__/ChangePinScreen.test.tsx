import React from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { renderWithProviders, fireEvent, waitFor, act } from '@/test/renderWithProviders';
import { useLockStore } from '@/store/lockStore';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/lib/toast';
import ChangePinScreen from '../ChangePinScreen';

// The screen only uses `router.back` from expo-router; mock it so the test
// doesn't pull in expo-router's untranspiled ESM navigation internals.
// (jest.mock is hoisted above the imports, so `router` above is the mock.)
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
jest.mock('@/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

// Typed views of the mocked singletons for assertions.
const mockRouterBack = router.back as jest.Mock;
const mockToastSuccess = toast.success as jest.Mock;

// Enter a 4-digit PIN by pressing each digit key in turn. PinPad is controlled,
// so the parent's value only reaches the pad on the next commit — flush after
// every press so the following key builds on the accumulated value (and the
// final digit's async submit settles) instead of the stale render.
async function enterPin(getByTestId: (id: string) => unknown, pin: string) {
  for (const d of pin) {
    await act(async () => {
      fireEvent.press(getByTestId(`pin-key-${d}`) as Parameters<typeof fireEvent.press>[0]);
    });
  }
}

describe('ChangePinScreen', () => {
  let verifyCurrentPin: jest.Mock;
  let setupPin: jest.Mock;
  let reset: jest.Mock;
  let logout: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    verifyCurrentPin = jest.fn().mockResolvedValue({ ok: true, remaining: 5, forceLogout: false });
    setupPin = jest.fn().mockResolvedValue(undefined);
    reset = jest.fn().mockResolvedValue(undefined);
    logout = jest.fn().mockResolvedValue(undefined);
    // zustand merges the partial state, so this swaps only the actions.
    useLockStore.setState({ verifyCurrentPin, setupPin, reset });
    useAuthStore.setState({ logout });
  });

  it('advances to the "new" step after the correct current PIN', async () => {
    const { getByTestId, getByText } = await renderWithProviders(<ChangePinScreen />);

    await enterPin(getByTestId, '9999');

    await waitFor(() => expect(getByText('Yangi PIN kod kiriting')).toBeTruthy());
    expect(verifyCurrentPin).toHaveBeenCalledWith('9999');
  });

  it('shows an error with the remaining count and stays on "current" for a wrong PIN', async () => {
    verifyCurrentPin.mockResolvedValue({ ok: false, remaining: 3, forceLogout: false });
    const { getByTestId, getByText } = await renderWithProviders(<ChangePinScreen />);

    await enterPin(getByTestId, '0000');

    await waitFor(() =>
      expect(getByText("Noto'g'ri PIN kod. 3 ta urinish qoldi.")).toBeTruthy()
    );
    // Still on the current step.
    expect(getByText('Joriy PIN kodni kiriting')).toBeTruthy();
  });

  it('walks the full happy path: current → new → confirm → setupPin + toast + back', async () => {
    const { getByTestId, getByText } = await renderWithProviders(<ChangePinScreen />);

    // current
    await enterPin(getByTestId, '1111');
    await waitFor(() => expect(getByText('Yangi PIN kod kiriting')).toBeTruthy());

    // new
    await enterPin(getByTestId, '1234');
    await waitFor(() => expect(getByText('Yangi PIN kodni tasdiqlang')).toBeTruthy());

    // confirm (matching)
    await enterPin(getByTestId, '1234');

    await waitFor(() => expect(setupPin).toHaveBeenCalledWith('1234'));
    expect(mockToastSuccess).toHaveBeenCalledWith("PIN kod o'zgartirildi");
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it('shows a mismatch error and returns to the "new" step when confirmation differs', async () => {
    const { getByTestId, getByText } = await renderWithProviders(<ChangePinScreen />);

    await enterPin(getByTestId, '1111');
    await waitFor(() => expect(getByText('Yangi PIN kod kiriting')).toBeTruthy());

    await enterPin(getByTestId, '1234');
    await waitFor(() => expect(getByText('Yangi PIN kodni tasdiqlang')).toBeTruthy());

    // confirm with a different PIN
    await enterPin(getByTestId, '5678');

    await waitFor(() =>
      expect(getByText("PIN kodlar mos kelmadi. Qaytadan urinib ko'ring.")).toBeTruthy()
    );
    // Back on the "new" step.
    expect(getByText('Yangi PIN kod kiriting')).toBeTruthy();
    expect(setupPin).not.toHaveBeenCalled();
  });

  it('alerts on force-logout and runs reset + logout when OK is pressed', async () => {
    verifyCurrentPin.mockResolvedValue({ ok: false, remaining: 0, forceLogout: true });
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByTestId } = await renderWithProviders(<ChangePinScreen />);

    await enterPin(getByTestId, '0000');

    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    const [title, message, buttons] = alertSpy.mock.calls[0];
    expect(title).toBe('Urinishlar soni tugadi');
    expect(message).toBe('Xavfsizlik maqsadida tizimdan chiqarildingiz. Qaytadan kiring.');

    // Invoke the OK button's handler and assert the wipe-then-logout sequence.
    const okButton = (buttons as { text: string; onPress?: () => void }[])[0];
    okButton.onPress?.();

    await waitFor(() => expect(reset).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));

    alertSpy.mockRestore();
  });
});
