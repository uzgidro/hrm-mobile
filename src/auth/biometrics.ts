import { Platform } from 'react-native';

// Thin defensive wrapper over expo-local-authentication. The native module is
// loaded lazily and guarded: on web or when the module is unavailable (e.g. a
// build without it), biometrics simply report "unavailable"/"failed" instead of
// throwing — callers fall back to the app's own PIN pad.
type LocalAuthModule = typeof import('expo-local-authentication');
let cachedModule: LocalAuthModule | null | undefined;

function getLocalAuth(): LocalAuthModule | null {
  if (cachedModule === undefined) {
    try {
      cachedModule = require('expo-local-authentication') as LocalAuthModule;
    } catch {
      cachedModule = null;
    }
  }
  return cachedModule;
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const auth = getLocalAuth();
  if (!auth) return false;
  try {
    return (await auth.hasHardwareAsync()) && (await auth.isEnrolledAsync());
  } catch {
    return false;
  }
}

export async function authenticateBiometric(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const auth = getLocalAuth();
  if (!auth) return false;
  try {
    const result = await auth.authenticateAsync({
      promptMessage: 'Ilovani ochish uchun tasdiqlang',
      cancelLabel: 'Bekor qilish',
      // The app's own PIN pad is the fallback — don't offer the device
      // credential (system PIN/pattern) inside the biometric sheet.
      disableDeviceFallback: true,
    });
    return result.success;
  } catch {
    return false;
  }
}
