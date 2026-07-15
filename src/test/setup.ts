// Jest setup — runs before every test file (setupFilesAfterEnv).
// RNTL auto-registers its matchers and cleanup on import. Data-layer tests mock
// the axios adapter with axios-mock-adapter (the app talks to the backend
// exclusively through the axios `apiClient`), so no network server is needed.

import '@testing-library/react-native';

// expo-image → a plain View that forwards props, so avatar tests can render
// without the native image layer.
jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Image: (props: Record<string, unknown>) =>
      React.createElement(View, { ...props, testID: props.testID ?? 'expo-image' }),
  };
});

// expo-secure-store → in-memory map so storage.ts works without the native layer.
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => (store.has(k) ? store.get(k)! : null)),
    setItemAsync: jest.fn(async (k: string, v: string) => void store.set(k, v)),
    deleteItemAsync: jest.fn(async (k: string) => void store.delete(k)),
  };
});

// expo-crypto → node:crypto, so PIN hashing is real (deterministic) in tests.
jest.mock('expo-crypto', () => {
  const { createHash } = require('crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    digestStringAsync: jest.fn(async (_alg: string, data: string) =>
      createHash('sha256').update(data, 'utf8').digest('hex')
    ),
    getRandomBytesAsync: jest.fn(async (n: number) =>
      Uint8Array.from({ length: n }, (_, i) => (i * 31 + 7) % 256)
    ),
  };
});

// expo-local-authentication → configurable stub; tests flip the mocks per case.
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(async () => false),
  isEnrolledAsync: jest.fn(async () => false),
  authenticateAsync: jest.fn(async () => ({ success: false })),
}));

// expo-localization → deterministic device locale (Uzbek Latin) so language
// detection is stable in tests; individual tests can override getLocales.
jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageTag: 'uz-UZ', languageCode: 'uz', textDirection: 'ltr' }]),
}));
