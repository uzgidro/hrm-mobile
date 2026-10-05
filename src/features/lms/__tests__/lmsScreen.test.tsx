import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import { confirm } from '@/lib/confirm';
import i18n from '@/i18n';
import { LMS_LOGS, LMS_SETTINGS, LMS_SYNC, LMS_TEST } from '@/api/urls';
import LmsScreen from '../screens/LmsScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));

const setUser = (u: Record<string, unknown>) =>
  useAuthStore.setState({ user: u as never, isAuthenticated: true } as never);
const master = { id: 2, type: 'master-admin', employee: { id: 6 } };
const hr = { id: 3, type: 'employee', employee: { id: 7, is_multi_org_user: true, multi_org_employee_role: 'hr' } };

const SETTINGS = {
  provider: 'moodle',
  base_url: 'https://ailm.uz',
  has_api_key: true,
  is_enabled: true,
  auto_sync: false,
  last_sync_at: '2026-10-05T04:00:00+00:00',
  last_sync_status: 'ok',
  last_sync_message: 'OK',
  last_sync_stats: { fetched: 12, created: 3, updated: 2, skipped: 7 },
  providers: ['generic', 'moodle'],
};
const LOGS = [
  {
    id: 1,
    status: 'error',
    message: 'Timeout',
    triggered_by: 'manual',
    started_at: '2026-10-04T19:30:00+00:00',
    created: 0,
    updated: 0,
  },
];

const puts = (m: MockAdapter) => m.history.put.filter((r) => r.url === LMS_SETTINGS);

describe('LmsScreen (v2 LmsPage)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    (confirm as jest.Mock).mockClear();
    mock.onGet(LMS_SETTINGS).reply(200, SETTINGS);
    mock.onGet(LMS_LOGS).reply(200, LOGS);
    mock.onPut(LMS_SETTINGS).reply(200, SETTINGS);
  });
  afterEach(() => mock.reset());

  it("forma serverdan; kalit ko'rsatilmaydi (faqat «saqlangan»); oxirgi sinxron va tarix Toshkent vaqtida", async () => {
    setUser(master);
    await renderWithProviders(<LmsScreen />);
    expect(await screen.findByDisplayValue('https://ailm.uz')).toBeTruthy();
    expect(screen.getByTestId('lms-api-key').props.value).toBe('');
    expect(screen.getByTestId('lms-api-key').props.secureTextEntry).toBe(true);
    expect(screen.getByTestId('lms-api-key-hint')).toHaveTextContent("Kalit saqlangan. Bo'sh qoldirilsa o'zgarmaydi.");
    expect(screen.getByTestId('lms-last-at')).toHaveTextContent('05.10.2026 09:00');
    expect(screen.getByTestId('lms-stat-fetched')).toHaveTextContent('12Olindi');
    expect(await screen.findByText('Timeout')).toBeTruthy();
    expect(screen.getByText('05.10.2026 00:30 · manual')).toBeTruthy();
    expect(screen.getByText('+0 / ~0')).toBeTruthy();
    expect(mock.history.get.find((r) => r.url === LMS_LOGS)!.params).toEqual({ limit: 10 });
  });

  it("saqlash: bo'sh kalit yuborilmaydi; kiritilsa yuboriladi va maydon tozalanadi", async () => {
    setUser(master);
    await renderWithProviders(<LmsScreen />);
    await screen.findByDisplayValue('https://ailm.uz');
    await fireEvent.press(screen.getByTestId('lms-provider-generic'));
    await fireEvent(screen.getByTestId('lms-auto-sync'), 'valueChange', true);
    await fireEvent.press(screen.getByTestId('lms-save'));
    await waitFor(() => expect(puts(mock)).toHaveLength(1));
    expect(JSON.parse(puts(mock)[0]!.data)).toEqual({
      provider: 'generic',
      base_url: 'https://ailm.uz',
      is_enabled: true,
      auto_sync: true,
    });

    await fireEvent.changeText(screen.getByTestId('lms-api-key'), ' secret-key ');
    await fireEvent.press(screen.getByTestId('lms-save'));
    await waitFor(() => expect(puts(mock)).toHaveLength(2));
    expect(JSON.parse(puts(mock)[1]!.data).api_key).toBe('secret-key');
    await waitFor(() => expect(screen.getByTestId('lms-api-key').props.value).toBe(''));
  });

  it("ulanishni tekshirish natijasi ko'rsatiladi; sinxron tasdiq bilan", async () => {
    setUser(master);
    mock.onPost(LMS_TEST).reply(200, { ok: false, message: 'HTTP 401' });
    mock.onPost(LMS_SYNC).reply(200, { status: 'ok', created: 4, updated: 1 });
    await renderWithProviders(<LmsScreen />);
    await screen.findByDisplayValue('https://ailm.uz');
    await fireEvent.press(screen.getByTestId('lms-test'));
    expect(await screen.findByTestId('lms-test-result')).toHaveTextContent('HTTP 401');

    await fireEvent.press(screen.getByTestId('lms-sync'));
    await waitFor(() => expect(mock.history.post.filter((r) => r.url === LMS_SYNC)).toHaveLength(1));
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it("sinxron tasdiqlanmasa so'rov yo'q", async () => {
    setUser(master);
    (confirm as jest.Mock).mockResolvedValueOnce(false);
    await renderWithProviders(<LmsScreen />);
    await screen.findByDisplayValue('https://ailm.uz');
    await fireEvent.press(screen.getByTestId('lms-sync'));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(mock.history.post).toHaveLength(0);
  });

  it("bosh admin bo'lmagan — so'rovsiz «ruxsat yo'q»; server 403 ham shunday", async () => {
    setUser(hr);
    const first = await renderWithProviders(<LmsScreen />);
    expect(await screen.findByText('LMS integratsiyasi faqat bosh administrator uchun ochiq.')).toBeTruthy();
    expect(mock.history.get).toHaveLength(0);
    first.unmount();

    setUser(master);
    mock.onGet(LMS_SETTINGS).reply(403, { detail: 'Only the site master-admin may manage the LMS integration' });
    await renderWithProviders(<LmsScreen />);
    expect(await screen.findByText('LMS integratsiyasi faqat bosh administrator uchun ochiq.')).toBeTruthy();
  });
});
