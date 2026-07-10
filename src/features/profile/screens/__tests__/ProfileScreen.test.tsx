import React from 'react';
import Constants from 'expo-constants';
import { renderWithProviders } from '@/test/renderWithProviders';
import { useLockStore } from '@/store/lockStore';
import ProfileScreen from '../ProfileScreen';

// The screen only uses `router.push` from expo-router; mock it so the test
// doesn't pull in expo-router's untranspiled ESM navigation internals.
// (jest.mock is hoisted above the imports by the Jest transform.)
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

describe('ProfileScreen', () => {
  it('renders the security rows (native) and the dynamic version', async () => {
    // Seed the lock store so the biometrics row is shown. The screen handles a
    // null auth user via its own fallbacks, so no user seeding is needed.
    useLockStore.setState({ biometricsSupported: true, biometricsEnabled: false });

    const { getByText } = await renderWithProviders(<ProfileScreen />);

    expect(getByText("PIN kodni o'zgartirish")).toBeTruthy();
    expect(getByText('Biometrik kirish')).toBeTruthy();

    const version = Constants.expoConfig?.version ?? '1.0.0';
    expect(getByText(`Dastur versiyasi ${version}`)).toBeTruthy();
  });
});
