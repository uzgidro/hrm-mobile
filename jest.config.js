/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  // jest-expo ships a sensible transformIgnorePatterns; extend it so our RN /
  // Expo / TanStack deps are transpiled instead of choking on ESM.
  transformIgnorePatterns: [
    // standard-navigation is an ESM-only dep of expo-router's usePathname/
    // useSegments (NavRail, Task 17) — must be transpiled like the rest.
    'node_modules/(?!(?:.pnpm/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-webview|@tanstack/.*|zustand|standard-navigation))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!src/test/**',
    '!**/*.d.ts',
  ],
  clearMocks: true,
};
