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
  // Jest'ning standart 5s chegarasi SOVUQ kesh (birinchi ishga tushirish /
  // CI) uchun yetmaydi: og'ir RN/Expo modullari o'sha payt Babel bilan
  // transpilyatsiya qilinadi va bu vaqt BIRINCHI testning byudjetidan
  // yeyiladi. Kesh isigach xuddi shu suite 22s o'rniga 4s da o'tadi — ya'ni
  // testlar sekin emas, MUHIT sekin.
  //
  // 2026-08-20 da o'lchandi: `jest --clearCache` dan keyin HAR SAFAR 5 ta
  // test "Exceeded timeout of 5000 ms" bilan yiqildi (assert xatosi EMAS —
  // 5 tasi ham timeout), issiq keshda esa 115/115 suite yashil edi. Sekin
  // suite'lar sovuq keshda 14-23s oralig'ida, shuning uchun 30s — barqaror
  // zaxira. Sinaldi: 3 ta ketma-ket sovuq prognoz 115/115 yashil.
  testTimeout: 30000,
};
