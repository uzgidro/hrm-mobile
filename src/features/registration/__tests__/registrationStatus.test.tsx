import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen } from '@/test/renderWithProviders';
import i18n from '@/i18n';
import { REGISTRATION_ME } from '@/api/urls';
import RegistrationStatusScreen from '../screens/RegistrationStatusScreen';
import { fetchMyRegistration } from '../api/queries';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

describe('RegistrationStatusScreen (v2 RegistrationStatusPage)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
  });
  afterEach(() => mock.reset());

  it("404 — ariza yo'q: xato emas, null", async () => {
    mock.onGet(REGISTRATION_ME).reply(404, { detail: 'not found' });
    await expect(fetchMyRegistration()).resolves.toBeNull();
  });

  it('500 — xato tashlanadi', async () => {
    mock.onGet(REGISTRATION_ME).reply(500);
    await expect(fetchMyRegistration()).rejects.toBeTruthy();
  });

  it("ariza yo'q — bo'sh holat", async () => {
    mock.onGet(REGISTRATION_ME).reply(404);
    await renderWithProviders(<RegistrationStatusScreen />);
    expect(await screen.findByText(i18n.t('regStatus.none'))).toBeTruthy();
  });

  it('rad etilgan — badge, izoh va sabab', async () => {
    mock.onGet(REGISTRATION_ME).reply(200, {
      id: 1, status: 'rejected', full_name: 'Aliyev Vali', reject_reason: 'Pasport rasmi xira',
      is_uge_employee: false, username: 'vali', reviewed_at: '2026-09-20T10:00:00', reviewed_by_name: 'Kadr bo\'limi',
    });
    await renderWithProviders(<RegistrationStatusScreen />);
    expect(await screen.findByText('Aliyev Vali')).toBeTruthy();
    expect(screen.getByText(i18n.t('regStatus.status_rejected'))).toBeTruthy();
    expect(screen.getByText(i18n.t('regStatus.hint_rejected'))).toBeTruthy();
    expect(screen.getByText('Pasport rasmi xira')).toBeTruthy();
    expect(screen.getByText(i18n.t('regStatus.guest'))).toBeTruthy(); // da'vo — mehmon
    expect(screen.getByText(/20\.09\.2026 · Kadr bo'limi/)).toBeTruthy();
  });

  it("tasdiqlangan xodim — da'vo filial · bo'lim · lavozim", async () => {
    mock.onGet(REGISTRATION_ME).reply(200, {
      id: 2, status: 'approved', full_name: 'Karimova Nodira', is_uge_employee: true,
      claimed_branch_name: 'Ijro apparati', claimed_department_name: 'Kadrlar', claimed_job_position_name: 'Mutaxassis',
    });
    await renderWithProviders(<RegistrationStatusScreen />);
    expect(await screen.findByText(i18n.t('regStatus.status_approved'))).toBeTruthy();
    expect(screen.getByText('Ijro apparati · Kadrlar · Mutaxassis')).toBeTruthy();
  });

  it('500 — ErrorState', async () => {
    mock.onGet(REGISTRATION_ME).reply(500);
    await renderWithProviders(<RegistrationStatusScreen />);
    expect(await screen.findByText(i18n.t('errors.generic'))).toBeTruthy();
  });
});
