import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import { confirm } from '@/lib/confirm';
import { DEPARTMENTS_LIST, MODULE_RESPONSIBLES } from '@/api/urls';
import ResponsiblesScreen from '../screens/ResponsiblesScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));

const setUser = (u: Record<string, unknown>) => useAuthStore.setState({ user: u as never, isAuthenticated: true } as never);
const hr = { id: 1, type: 'employee', employee: { id: 1, is_multi_org_user: true, multi_org_employee_role: 'hr' } };

describe("ResponsiblesScreen (v2 ResponsiblesPage — Ijro mas'ullari)", () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    (confirm as jest.Mock).mockClear();
    mock.onGet(MODULE_RESPONSIBLES).reply(200, [
      { id: 9, module: 'ijro', scope_type: 'department', scope_id: 4, label: 'Kadrlar bo\'limi', sub_label: 'Ijro apparati' },
    ]);
    mock.onGet(DEPARTMENTS_LIST).reply(200, { items: [{ id: 5, name: 'Moliya bo\'limi' }], total: 1 });
    mock.onPost(MODULE_RESPONSIBLES).reply(200, { id: 10 });
    mock.onDelete(`${MODULE_RESPONSIBLES}/9`).reply(200, {});
  });
  afterEach(() => mock.reset());

  it("ruxsatsiz (oddiy xodim) — so'rov yuborilmaydi, ruxsat yo'q holati", async () => {
    setUser({ id: 2, type: 'employee', employee: { id: 2 } });
    await renderWithProviders(<ResponsiblesScreen />);
    expect(await screen.findByText(i18n.t('responsibles.noAccess'))).toBeTruthy();
    expect(mock.history.get.filter((r) => r.url === MODULE_RESPONSIBLES)).toHaveLength(0);
  });

  it("ro'yxat: qamrov badge, nom va filial", async () => {
    setUser(hr);
    await renderWithProviders(<ResponsiblesScreen />);
    expect(await screen.findByText("Kadrlar bo'limi")).toBeTruthy();
    expect(screen.getByText('Ijro apparati')).toBeTruthy();
    expect(mock.history.get.find((r) => r.url === MODULE_RESPONSIBLES)?.params).toEqual({ module: 'ijro' });
  });

  it("bo'lim qo'shish: tanlash → tasdiq → POST {module, scope_type, scope_id}", async () => {
    setUser(hr);
    await renderWithProviders(<ResponsiblesScreen />);
    await screen.findByText("Kadrlar bo'limi");
    await fireEvent.press(screen.getByTestId('responsible-add'));
    await fireEvent.press(await screen.findByText("Moliya bo'limi"));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(confirm).toHaveBeenCalled();
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ module: 'ijro', scope_type: 'department', scope_id: 5 });
  });

  it("o'chirish: tasdiq → DELETE", async () => {
    setUser(hr);
    await renderWithProviders(<ResponsiblesScreen />);
    await fireEvent.press(await screen.findByTestId('responsible-remove-9'));
    await waitFor(() => expect(mock.history.delete).toHaveLength(1));
    expect(mock.history.delete[0].url).toBe(`${MODULE_RESPONSIBLES}/9`);
  });
});
