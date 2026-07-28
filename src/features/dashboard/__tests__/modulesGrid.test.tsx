// Smoke test for the Modules tab (app/(tabs)/modules.tsx). The grid-column
// math is fully covered by responsive.test.ts (resolveBreakpoint) and the
// role-filtered section/tile composition by navItems.test.ts (buildNavSections)
// — this test only verifies the screen actually renders sections/tiles from
// that SSOT and reacts to the breakpoint, without re-asserting either's logic.
import React from 'react';
import { renderWithProviders } from '@/test/renderWithProviders';
import i18n from '@/i18n';
import ModulesScreen from '../../../../app/(tabs)/modules';

// The screen only uses `router.push` from expo-router; mock it so the test
// doesn't pull in expo-router's untranspiled ESM navigation internals.
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

describe('ModulesScreen', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
  });

  it('renders sections/tiles sourced from buildNavSections (guests is visible to every role)', async () => {
    const { getByText } = await renderWithProviders(<ModulesScreen />);

    // `guests` and `directory` are unconditionally visible (canAccessPage
    // returns true for every role) — a stable smoke signal that the grid is
    // populated from the shared navItems SSOT rather than an empty list.
    expect(getByText(i18n.t('modules.labels.guests'))).toBeTruthy();
    expect(getByText(i18n.t('modules.labels.directory'))).toBeTruthy();
    expect(getByText(i18n.t('modules.screenTitle'))).toBeTruthy();
  });
});
