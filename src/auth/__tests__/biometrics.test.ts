// The expo-local-authentication module is globally stubbed in src/test/setup.ts
// (everything reports "unavailable" by default) — each test flips the stubs to
// its own scenario.
import * as LocalAuthentication from 'expo-local-authentication';
import { isBiometricAvailable, authenticateBiometric } from '../biometrics';

const mockHasHardware = jest.mocked(LocalAuthentication.hasHardwareAsync);
const mockIsEnrolled = jest.mocked(LocalAuthentication.isEnrolledAsync);
const mockAuthenticate = jest.mocked(LocalAuthentication.authenticateAsync);

describe('isBiometricAvailable', () => {
  it('is available with hardware and an enrolled biometric', async () => {
    mockHasHardware.mockResolvedValue(true);
    mockIsEnrolled.mockResolvedValue(true);
    expect(await isBiometricAvailable()).toBe(true);
  });

  it('is unavailable without hardware', async () => {
    mockHasHardware.mockResolvedValue(false);
    mockIsEnrolled.mockResolvedValue(true);
    expect(await isBiometricAvailable()).toBe(false);
  });

  it('is unavailable when nothing is enrolled', async () => {
    mockHasHardware.mockResolvedValue(true);
    mockIsEnrolled.mockResolvedValue(false);
    expect(await isBiometricAvailable()).toBe(false);
  });

  it('reports unavailable (not throw) when the native call rejects', async () => {
    mockHasHardware.mockRejectedValue(new Error('native error'));
    expect(await isBiometricAvailable()).toBe(false);
  });
});

describe('authenticateBiometric', () => {
  it('resolves true on successful authentication', async () => {
    mockAuthenticate.mockResolvedValue({ success: true });
    expect(await authenticateBiometric()).toBe(true);
  });

  it('resolves false when the user cancels / fails', async () => {
    mockAuthenticate.mockResolvedValue({ success: false, error: 'user_cancel' });
    expect(await authenticateBiometric()).toBe(false);
  });

  it('resolves false (not throw) when the native call rejects', async () => {
    mockAuthenticate.mockRejectedValue(new Error('native error'));
    expect(await authenticateBiometric()).toBe(false);
  });

  it('keeps the device-credential fallback disabled and the Uzbek prompt', async () => {
    mockAuthenticate.mockResolvedValue({ success: true });
    await authenticateBiometric();
    expect(mockAuthenticate).toHaveBeenCalledWith(
      expect.objectContaining({
        promptMessage: 'Ilovani ochish uchun tasdiqlang',
        cancelLabel: 'Bekor qilish',
        disableDeviceFallback: true,
      })
    );
  });
});
