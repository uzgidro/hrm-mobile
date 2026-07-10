import React from 'react';
import Constants from 'expo-constants';
import { renderWithProviders } from '@/test/renderWithProviders';
import { useLockStore } from '@/store/lockStore';
import i18n from '@/i18n';
import ProfileScreen from '../ProfileScreen';

// The screen only uses `router.push` from expo-router; mock it so the test
// doesn't pull in expo-router's untranspiled ESM navigation internals.
// (jest.mock is hoisted above the imports by the Jest transform.)
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

describe('ProfileScreen', () => {
  // The catalog-parity suite switches i18n's language; reset to the default so
  // these assertions resolve against the uz-Latn source of truth regardless of
  // test order.
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
  });

  it('renders the security rows (native) and the dynamic version', async () => {
    // Seed the lock store so the biometrics row is shown. The screen handles a
    // null auth user via its own fallbacks, so no user seeding is needed.
    useLockStore.setState({ biometricsSupported: true, biometricsEnabled: false });

    const { getByText } = await renderWithProviders(<ProfileScreen />);

    // Labels now come through i18n; assert via t() so the test tracks the
    // catalog rather than a hard-coded Uzbek literal.
    expect(getByText(i18n.t('profile.changePin'))).toBeTruthy();
    expect(getByText(i18n.t('profile.biometrics'))).toBeTruthy();

    const version = Constants.expoConfig?.version ?? '1.0.0';
    expect(getByText(i18n.t('profile.version', { version }))).toBeTruthy();
  });
});
