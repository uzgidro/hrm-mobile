import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import { INSPECTIONS } from '@/api/urls';
import InspectionsScreen from '../screens/InspectionsScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));

const setUser = (u: Record<string, unknown>) =>
  useAuthStore.setState({ user: u as never, isAuthenticated: true } as never);
const hr = { id: 1, type: 'employee', employee: { id: 5, is_multi_org_user: true, multi_org_employee_role: 'hr' } };
const lastParams = (m: MockAdapter) => m.history.get.filter((r) => r.url === INSPECTIONS).at(-1)?.params;

const ROW = {
  id: 4,
  title: 'Davomat auditi',
  object_type: 'department',
  object_label: 'Kotibiyat',
  status: 'planned',
  can_manage: true,
  can_add_finding: true,
  findings_open: 1,
  findings_total: 2,
};
const DETAIL = {
  ...ROW,
  purpose: 'Kechikishlar tekshiruvi',
  members: [{ id: 1, employee_id: 9, employee_name: 'Karimov Vali', role: 'lead' }],
  findings: [
    {
      id: 11,
      description: 'Jurnal yuritilmagan',
      severity: 'high',
      status: 'open',
      due_date: '2026-09-01',
      is_overdue: true,
    },
    { id: 12, description: 'Eski xato', severity: 'low', status: 'resolved' },
  ],
};

describe('InspectionsScreen (v2 InspectionsPage)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    mock.onGet(INSPECTIONS).reply(200, { items: [ROW], total: 1, pages: 1 });
    mock.onGet(`${INSPECTIONS}/4`).reply(200, DETAIL);
    mock.onPost(`${INSPECTIONS}/4/start`).reply(200, {});
    mock.onPost(`${INSPECTIONS}/4/complete`).reply(200, {});
    mock.onPost(`${INSPECTIONS}/4/cancel`).reply(200, {});
    mock.onPost(`${INSPECTIONS}/4/findings`).reply(200, {});
    mock.onPatch(`${INSPECTIONS}/4/findings/11`).reply(200, {});
  });
  afterEach(() => mock.reset());

  it("ro'yxat: sarlavha, obyekt, holat, ochiq topilmalar; holat filtri serverga", async () => {
    setUser(hr);
    await renderWithProviders(<InspectionsScreen />);
    expect(await screen.findByText('Davomat auditi')).toBeTruthy();
    expect(screen.getByText(/Kotibiyat/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('inspection-status-in_progress'));
    await waitFor(() => expect(lastParams(mock)).toEqual({ page: 1, size: 20, status: 'in_progress' }));
  });

  it("tafsilot: auditorlar va topilmalar; muddati o'tgan topilma belgilanadi; boshlash → tasdiq → POST start", async () => {
    setUser(hr);
    await renderWithProviders(<InspectionsScreen />);
    await fireEvent.press(await screen.findByText('Davomat auditi'));
    expect(await screen.findByText('Jurnal yuritilmagan')).toBeTruthy();
    expect(screen.getByText('Karimov Vali')).toBeTruthy();
    expect(screen.getByTestId('finding-overdue-11')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('inspection-start'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(mock.history.post[0].url).toBe(`${INSPECTIONS}/4/start`);
  });

  it("bekor qilish sababsiz — so'rov yo'q; sabab bilan POST {reason}", async () => {
    setUser(hr);
    await renderWithProviders(<InspectionsScreen />);
    await fireEvent.press(await screen.findByText('Davomat auditi'));
    await fireEvent.press(await screen.findByTestId('inspection-cancel'));
    await fireEvent.press(screen.getByTestId('inspection-cancel-confirm'));
    expect(await screen.findByText(i18n.t('inspections.cancelReasonRequired'))).toBeTruthy();
    expect(mock.history.post).toHaveLength(0);
    await fireEvent.changeText(screen.getByTestId('inspection-cancel-reason'), "Reja o'zgardi");
    await fireEvent.press(screen.getByTestId('inspection-cancel-confirm'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ reason: "Reja o'zgardi" });
  });

  it('yakunlash xulosa bilan → POST {conclusion}', async () => {
    setUser(hr);
    await renderWithProviders(<InspectionsScreen />);
    await fireEvent.press(await screen.findByText('Davomat auditi'));
    await fireEvent.press(await screen.findByTestId('inspection-complete'));
    await fireEvent.changeText(screen.getByTestId('inspection-conclusion'), 'Kamchiliklar bartaraf etilsin');
    await fireEvent.press(screen.getByTestId('inspection-complete-confirm'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ conclusion: 'Kamchiliklar bartaraf etilsin' });
  });

  it("ochiq topilmani tuzatish → PATCH {status:'resolved'}; tuzatilganida tugma yo'q", async () => {
    setUser(hr);
    await renderWithProviders(<InspectionsScreen />);
    await fireEvent.press(await screen.findByText('Davomat auditi'));
    expect(await screen.findByTestId('finding-resolve-11')).toBeTruthy();
    expect(screen.queryByTestId('finding-resolve-12')).toBeNull();
    await fireEvent.press(screen.getByTestId('finding-resolve-11'));
    await fireEvent.press(await screen.findByTestId('finding-resolve-confirm'));
    await waitFor(() => expect(mock.history.patch).toHaveLength(1));
    expect(JSON.parse(mock.history.patch[0].data)).toEqual({ status: 'resolved', resolution_note: null });
  });

  it("huquqsiz (can_manage yo'q): yaratish tugmasi va amallar yo'q; yakunlangan auditda topilma qo'shib bo'lmaydi", async () => {
    setUser({ id: 2, type: 'employee', employee: { id: 6 } });
    mock.onGet(INSPECTIONS).reply(200, {
      items: [{ ...ROW, can_manage: false, can_add_finding: false, status: 'completed' }],
      total: 1,
      pages: 1,
    });
    mock
      .onGet(`${INSPECTIONS}/4`)
      .reply(200, { ...DETAIL, can_manage: false, can_add_finding: false, status: 'completed' });
    await renderWithProviders(<InspectionsScreen />);
    await fireEvent.press(await screen.findByText('Davomat auditi'));
    await screen.findByText('Jurnal yuritilmagan');
    expect(screen.queryByTestId('inspection-add')).toBeNull();
    expect(screen.queryByTestId('inspection-start')).toBeNull();
    expect(screen.queryByTestId('inspection-complete')).toBeNull();
    expect(screen.queryByTestId('finding-add')).toBeNull();
  });

  it("yangi audit: sarlavhasiz — so'rov yo'q", async () => {
    setUser(hr);
    await renderWithProviders(<InspectionsScreen />);
    await screen.findByText('Davomat auditi');
    await fireEvent.press(screen.getByTestId('inspection-add'));
    await fireEvent.press(screen.getByTestId('inspection-save'));
    expect(await screen.findByText(i18n.t('inspections.titleRequired'))).toBeTruthy();
    expect(mock.history.post).toHaveLength(0);
  });

  it("ro'yxat xatosi — ErrorState", async () => {
    setUser(hr);
    mock.onGet(INSPECTIONS).reply(500);
    await renderWithProviders(<InspectionsScreen />);
    expect(await screen.findByText(i18n.t('errors.generic'))).toBeTruthy();
  });
});
