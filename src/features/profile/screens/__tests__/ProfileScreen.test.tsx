import React from 'react';
import Constants from 'expo-constants';
import { renderWithProviders, fireEvent, act, waitFor } from '@/test/renderWithProviders';
import { useLockStore } from '@/store/lockStore';
import { useAuthStore } from '@/store/authStore';
import { usePrefsStore } from '@/store/prefsStore';
import { getConfirm, answerConfirm, __resetConfirm } from '@/lib/confirm';
import i18n from '@/i18n';
import ProfileScreen from '../ProfileScreen';

// The screen only uses `router.push` from expo-router; mock it so the test
// doesn't pull in expo-router's untranspiled ESM navigation internals.
// (jest.mock is hoisted above the imports by the Jest transform.)
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

// expo-updates is native — default to an embedded (non-OTA) launch so
// getRunningOtaInfo() resolves without hitting the native module.
jest.mock('expo-updates', () => ({
  isEnabled: false,
  isEmbeddedLaunch: true,
  updateId: null,
  createdAt: null,
}));

describe('ProfileScreen', () => {
  // The catalog-parity suite switches i18n's language; reset to the default so
  // these assertions resolve against the uz-Latn source of truth regardless of
  // test order.
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    __resetConfirm();
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

  it('renders the running OTA build line under the app version', async () => {
    const { getByText } = await renderWithProviders(<ProfileScreen />);

    // Embedded build in the jest env (expo-updates mock defaults to embedded).
    expect(getByText(i18n.t('ota.embeddedBuild'))).toBeTruthy();
  });

  it('requests a logout confirmation via the global confirm store and logs out on confirm', async () => {
    const logout = jest.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ logout });

    const { getByText } = await renderWithProviders(<ProfileScreen />);

    // No confirmation pending until the logout row is tapped.
    expect(getConfirm()).toBeNull();

    await act(async () => {
      fireEvent.press(getByText(i18n.t('profile.logout')));
    });

    // The screen asked the global confirm store (rendered by <ConfirmHost/> in
    // the real app), not an OS Alert.
    await waitFor(() => expect(getConfirm()).not.toBeNull());
    expect(getConfirm()).toMatchObject({
      title: i18n.t('profile.logout'),
      destructive: true,
    });

    await act(async () => {
      answerConfirm(true);
    });

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
  });

  it('does not log out when the confirmation is cancelled', async () => {
    const logout = jest.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ logout });

    const { getByText } = await renderWithProviders(<ProfileScreen />);

    await act(async () => {
      fireEvent.press(getByText(i18n.t('profile.logout')));
    });
    await waitFor(() => expect(getConfirm()).not.toBeNull());

    await act(async () => {
      answerConfirm(false);
    });

    expect(logout).not.toHaveBeenCalled();
    expect(getConfirm()).toBeNull();
  });

  describe('hisob turi bo’yicha (real /auth/me shakllari)', () => {
    const setUser = (u: Record<string, unknown>) =>
      useAuthStore.setState({ user: u as never, isAuthenticated: true } as never);
    afterEach(() => useAuthStore.setState({ user: null } as never));

    it("master-admin (xodim kartasi yo'q): ism — login, «Ma'lumotnoma»/«O'zgartirish» yo'q, izoh bor (v2 MyProfilePage)", async () => {
      setUser({ id: 1, username: 'master', type: 'master-admin', employee: null, master_admin: { id: 1, email: 'm@x.uz' } });
      const { getByText, queryByText } = await renderWithProviders(<ProfileScreen />);
      expect(getByText('master')).toBeTruthy();
      expect(queryByText(i18n.t('profile.userFallback'))).toBeNull();
      expect(queryByText(i18n.t('profile.reference'))).toBeNull();
      expect(queryByText(i18n.t('common.edit'))).toBeNull();
      expect(getByText(i18n.t('profile.noEmployee'))).toBeTruthy();
      expect(getByText(i18n.t('profile.accountType.masterAdmin'))).toBeTruthy();
    });

    it('admin — `admin.legal_name` ko’rsatiladi', async () => {
      setUser({ id: 2, username: 'admin.fil', type: 'admin', employee: null, admin: { id: 3, legal_name: 'Filial Admin', organization_branch_id: 4 } });
      const { getByText } = await renderWithProviders(<ProfileScreen />);
      expect(getByText('Filial Admin')).toBeTruthy();
      expect(getByText(i18n.t('profile.accountType.admin'))).toBeTruthy();
    });

    it("oddiy xodim (bo'ysunuvchisi yo'q) — «Faqat bo'ysunuvchilar» yo'q; yoqilib qolgan bo'lsa o'chadi", async () => {
      usePrefsStore.setState({ onlySubordinates: true });
      setUser({ id: 3, type: 'employee', is_line_manager: false, employee: { id: 7, legal_name: 'Aliyev Vali' } });
      const { getByText, queryByText } = await renderWithProviders(<ProfileScreen />);
      expect(getByText('Aliyev Vali')).toBeTruthy();
      expect(getByText(i18n.t('profile.reference'))).toBeTruthy();
      expect(queryByText(i18n.t('profile.onlySubordinates'))).toBeNull();
      await waitFor(() => expect(usePrefsStore.getState().onlySubordinates).toBe(false));
    });

    it("rahbar (is_line_manager) — «Faqat bo'ysunuvchilar» bor", async () => {
      setUser({ id: 4, type: 'employee', is_line_manager: true, employee: { id: 8, legal_name: 'Rahbar' } });
      const { getByText } = await renderWithProviders(<ProfileScreen />);
      expect(getByText(i18n.t('profile.onlySubordinates'))).toBeTruthy();
    });
  });
});
