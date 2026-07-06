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
