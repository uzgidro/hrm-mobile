// v3 Modullar tabi: v2 katalogidan (visibleCatalog → canAccessPage) quriladi.
import React from 'react';
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders';
import i18n from '@/i18n';
import { useAuthStore } from '@/store/authStore';
import ModulesScreen from '../../../../app/(tabs)/modules';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

describe('ModulesScreen (v3 katalog)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    useAuthStore.setState({ user: { id: 1, type: 'employee', employee: { id: 1 } } as never, isAuthenticated: true } as never);
  });

  it("v2 bo'limlari va ruxsat etilgan plitkalar", async () => {
    await renderWithProviders(<ModulesScreen />);
    expect(screen.getByText(i18n.t('modules.screenTitle'))).toBeTruthy();
    expect(screen.getByText(i18n.t('modules.sections.main'))).toBeTruthy();
    expect(screen.getByTestId('module-guests')).toBeTruthy();
    expect(screen.getByTestId('module-directory')).toBeTruthy();
    expect(screen.queryByTestId('module-employees')).toBeNull(); // oddiy xodimga yo'q (v2)
  });

  it("qidiruv plitkalarni filtrlaydi", async () => {
    await renderWithProviders(<ModulesScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText(i18n.t('modules.searchPlaceholder')), 'mehmon');
    expect(screen.getByTestId('module-guests')).toBeTruthy();
    expect(screen.queryByTestId('module-directory')).toBeNull();
  });

  it("topilmasa bo'sh holat", async () => {
    await renderWithProviders(<ModulesScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText(i18n.t('modules.searchPlaceholder')), 'zzzqqq');
    expect(screen.getByText(i18n.t('modules.searchEmpty'))).toBeTruthy();
  });
});
