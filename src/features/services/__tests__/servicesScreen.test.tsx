import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import { SERVICE_REQUESTS, SERVICE_REQUESTS_CATALOG, SERVICE_REQUESTS_MY } from '@/api/urls';
import { confirm } from '@/lib/confirm';
import ServicesScreen from '../screens/ServicesScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));

const setUser = (u: Record<string, unknown>) =>
  useAuthStore.setState({ user: u as never, isAuthenticated: true } as never);
const emp = { id: 1, type: 'employee', employee: { id: 7 } };
const hr = { id: 2, type: 'employee', employee: { id: 9, is_multi_org_user: true, multi_org_employee_role: 'hr' } };

const MINE = {
  id: 5,
  number: 'SR-2026-0005',
  service_type: 'work_certificate',
  status: 'accepted',
  employee_id: 7,
  has_document: false,
  submitted_at: '2026-10-01T09:00:00',
};
const lastGet = (m: MockAdapter, url: string) => m.history.get.filter((r) => r.url === url).at(-1)?.params;

describe('ServicesScreen (v2 ServicesPage)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    mock.onGet(SERVICE_REQUESTS_CATALOG).reply(200, [
      { type: 'work_certificate', label: "Ish joyidan ma'lumotnoma", available: true },
      { type: 'reference_letter', label: 'Tavsifnoma', available: true },
      { type: 'job_application', label: 'Nomzodlik arizasi', available: false, reason: 'Faqat mehmonlar uchun' },
    ]);
    mock.onGet(SERVICE_REQUESTS_MY).reply(200, { items: [MINE], total: 1, pages: 1 });
    mock.onGet(SERVICE_REQUESTS).reply(200, {
      items: [
        { ...MINE, id: 6, number: 'SR-2026-0006', employee_id: 8, applicant_name: 'Karimov Vali', status: 'in_review' },
      ],
      total: 1,
      pages: 1,
    });
    mock
      .onGet(`${SERVICE_REQUESTS}/5`)
      .reply(200, { ...MINE, events: [{ id: 1, to_status: 'accepted', created_at: '2026-10-01T09:00:00' }] });
    mock.onGet(`${SERVICE_REQUESTS}/6`).reply(200, { ...MINE, id: 6, status: 'in_review', employee_id: 8, events: [] });
    mock.onPost(SERVICE_REQUESTS).reply(200, { id: 10 });
    mock.onPost(`${SERVICE_REQUESTS}/5/cancel`).reply(200, {});
    mock.onPost(`${SERVICE_REQUESTS}/6/status`).reply(200, {});
  });
  afterEach(() => mock.reset());

  it("oddiy xodim: o'z so'rovlari; Ko'rib chiqish tabi yo'q; mavjud bo'lmagan xizmat sababi bilan", async () => {
    setUser(emp);
    await renderWithProviders(<ServicesScreen />);
    expect(await screen.findByText('SR-2026-0005')).toBeTruthy();
    expect(screen.queryByText(i18n.t('services.tab_inbox'))).toBeNull();
    expect(await screen.findByText('Faqat mehmonlar uchun')).toBeTruthy();
    expect(mock.history.get.filter((r) => r.url === SERVICE_REQUESTS)).toHaveLength(0);
  });

  it("yangi so'rov: plitka → yuborish → POST (ma'lumotnoma — payload yo'q)", async () => {
    setUser(emp);
    await renderWithProviders(<ServicesScreen />);
    await fireEvent.press(await screen.findByTestId('service-tile-work_certificate'));
    await fireEvent.changeText(await screen.findByTestId('service-purpose'), 'Bankka');
    await fireEvent.press(screen.getByTestId('service-send'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      service_type: 'work_certificate',
      purpose: 'Bankka',
      organization_branch_id: null,
      payload: null,
    });
  });

  it("o'z so'rovi «qabul qilindi» — bekor qilish → tasdiq → POST cancel", async () => {
    setUser(emp);
    await renderWithProviders(<ServicesScreen />);
    await fireEvent.press(await screen.findByText('SR-2026-0005'));
    await fireEvent.press(await screen.findByTestId('service-cancel'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(mock.history.post[0].url).toBe(`${SERVICE_REQUESTS}/5/cancel`);
  });

  it("HR: Ko'rib chiqish tabi; holat o'zgartirish; rad etish sababsiz — so'rov yo'q", async () => {
    setUser(hr);
    await renderWithProviders(<ServicesScreen />);
    await fireEvent.press(await screen.findByText(i18n.t('services.tab_inbox')));
    await fireEvent.press(await screen.findByText('SR-2026-0006'));
    expect(await screen.findByTestId('service-to-in_progress')).toBeTruthy();
    expect(screen.queryByTestId('service-to-in_review')).toBeNull(); // orqaga yo'q
    await fireEvent.press(screen.getByTestId('service-to-rejected'));
    expect(await screen.findByText(i18n.t('services.rejectReasonRequired'))).toBeTruthy();
    expect(mock.history.post).toHaveLength(0);
    await fireEvent.changeText(screen.getByTestId('service-comment'), 'Hujjat yetarli emas');
    await fireEvent.press(screen.getByTestId('service-to-rejected'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ to_status: 'rejected', comment: 'Hujjat yetarli emas' });
    expect(lastGet(mock, SERVICE_REQUESTS)).toMatchObject({ page: 1 });
  });

  it("ro'yxat xatosi — ErrorState", async () => {
    setUser(emp);
    mock.onGet(SERVICE_REQUESTS_MY).reply(500);
    await renderWithProviders(<ServicesScreen />);
    expect(await screen.findByText(i18n.t('errors.generic'))).toBeTruthy();
  });

  it("tafsilot so'rovi xato (404/403) — cheksiz skelet emas, ErrorState", async () => {
    setUser(emp);
    mock.onGet(`${SERVICE_REQUESTS}/5`).reply(404);
    await renderWithProviders(<ServicesScreen />);
    await fireEvent.press(await screen.findByText('SR-2026-0005'));
    expect(await screen.findByText(i18n.t('errors.generic'))).toBeTruthy();
  });

  it("holat o'zgartirish tasdiq so'raydi (orqaga yo'l yo'q); rad etilsa POST yo'q", async () => {
    setUser(hr);
    (confirm as jest.Mock).mockResolvedValueOnce(false);
    await renderWithProviders(<ServicesScreen />);
    await fireEvent.press(await screen.findByText(i18n.t('services.tab_inbox')));
    await fireEvent.press(await screen.findByText('SR-2026-0006'));
    await fireEvent.press(await screen.findByTestId('service-to-in_progress'));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(mock.history.post).toHaveLength(0);
    await fireEvent.press(screen.getByTestId('service-to-in_progress'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
  });

  it("nomzodlik arizasi: reviewer ariza beruvchi ma'lumotlarini (payload) ko'radi", async () => {
    setUser(hr);
    mock.onGet(`${SERVICE_REQUESTS}/6`).reply(200, {
      ...MINE,
      id: 6,
      service_type: 'job_application',
      status: 'in_review',
      employee_id: 8,
      submitted_at: '2026-10-01T09:00:00',
      assignee_name: 'Kadrlar',
      payload: { last_name: 'Nomzodov', first_name: 'Sardor', position: 'Muhandis', phone: '+998901234567', note: '' },
      events: [],
    });
    await renderWithProviders(<ServicesScreen />);
    await fireEvent.press(await screen.findByText(i18n.t('services.tab_inbox')));
    await fireEvent.press(await screen.findByText('SR-2026-0006'));
    expect(await screen.findByText('Nomzodov')).toBeTruthy();
    expect(screen.getByText('Muhandis')).toBeTruthy();
    expect(screen.getByText('+998901234567')).toBeTruthy();
    expect(screen.getByText(i18n.t('services.field_last_name'))).toBeTruthy();
    expect(screen.getByTestId('payload-last_name')).toBeTruthy();
    expect(screen.queryByTestId('payload-note')).toBeNull(); // bo'sh maydon chizilmaydi
    expect(screen.getByText(/Kadrlar/)).toBeTruthy();
  });
});
