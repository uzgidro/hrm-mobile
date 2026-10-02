import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import { EMPLOYEES_QUALITY } from '@/api/urls';
import HrQualityScreen from '../screens/HrQualityScreen';
import { groupByPerson, type QualityRow } from '../utils/groupByPerson';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));

const setUser = (u: Record<string, unknown>) => useAuthStore.setState({ user: u as never, isAuthenticated: true } as never);
const hr = { id: 1, type: 'employee', employee: { id: 1, is_multi_org_user: true, multi_org_employee_role: 'hr' } };

const row = (id: number, name: string, severity: string, rule = 'no_pinfl'): QualityRow => ({
  employee_id: id,
  employee_name: name,
  severity,
  rule,
  rule_title: rule === 'no_pinfl' ? "JSHSHIR yo'q" : "Lavozim yo'q",
});

describe('groupByPerson (v2 HrQualityPage)', () => {
  it("shaxs bo'yicha guruh: xatolar ko'p → birinchi, keyin ogohlantirish, keyin ism", () => {
    const out = groupByPerson([
      row(1, 'Bobur', 'warning'),
      row(2, 'Anvar', 'error'),
      row(2, 'Anvar', 'error', 'no_position'),
      row(3, 'Aziz', 'warning'),
      row(1, 'Bobur', 'warning', 'no_position'),
    ]);
    expect(out.map((p) => [p.name, p.errors, p.warnings])).toEqual([
      ['Anvar', 2, 0],
      ['Bobur', 0, 2],
      ['Aziz', 0, 1],
    ]);
    expect(out[0].issues).toHaveLength(2);
  });
  it("noma'lum daraja — ogohlantirish hisoblanadi", () => {
    expect(groupByPerson([row(1, 'X', 'info')])[0].warnings).toBe(1);
  });
});

describe('HrQualityScreen', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
  });
  afterEach(() => mock.reset());

  it("ruxsatsiz — so'rov yo'q", async () => {
    setUser({ id: 2, type: 'employee', employee: { id: 2 } });
    await renderWithProviders(<HrQualityScreen />);
    expect(await screen.findByText(i18n.t('hrQuality.noAccess'))).toBeTruthy();
    expect(mock.history.get).toHaveLength(0);
  });

  it("so'rov xatosi — ErrorState, «muammo yo'q» va 0 hisoblagichlar EMAS", async () => {
    setUser(hr);
    mock.onGet(EMPLOYEES_QUALITY).reply(500);
    await renderWithProviders(<HrQualityScreen />);
    expect(await screen.findByText(i18n.t('errors.generic'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('hrQuality.noIssues'))).toBeNull();
    expect(screen.queryByText('0')).toBeNull();
  });

  it("protokol: hisoblagichlar, shaxs qatori; qoida chipi → rule filtri", async () => {
    setUser(hr);
    mock.onGet(EMPLOYEES_QUALITY).reply(200, {
      checked: 120,
      issues: 3,
      errors: 2,
      warnings: 1,
      clean: 117,
      by_rule: [{ rule: 'no_pinfl', rule_title: "JSHSHIR yo'q", severity: 'error', count: 2 }],
      items: [row(7, 'Karimov Vali', 'error'), row(7, 'Karimov Vali', 'error', 'no_position'), row(8, 'Aliyeva Nodira', 'warning')],
    });
    await renderWithProviders(<HrQualityScreen />);
    expect(await screen.findByText('Karimov Vali')).toBeTruthy();
    expect(screen.getByText('117')).toBeTruthy();
    expect(screen.getByText(i18n.t('hrQuality.nErrors', { count: 2 }))).toBeTruthy();
    await fireEvent.press(screen.getByTestId('rule-no_pinfl'));
    await waitFor(() =>
      expect(mock.history.get.filter((r) => r.url === EMPLOYEES_QUALITY).at(-1)?.params).toEqual({ rule: 'no_pinfl' }),
    );
  });

  it("muammo yo'q — yashil bo'sh holat", async () => {
    setUser(hr);
    mock.onGet(EMPLOYEES_QUALITY).reply(200, { checked: 5, issues: 0, errors: 0, warnings: 0, clean: 5, by_rule: [], items: [] });
    await renderWithProviders(<HrQualityScreen />);
    expect(await screen.findByText(i18n.t('hrQuality.noIssues'))).toBeTruthy();
  });
});
