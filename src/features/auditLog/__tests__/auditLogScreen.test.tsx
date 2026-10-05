import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import { AUDIT_LOGS, AUDIT_LOGS_ONLINE, AUDIT_LOGS_ONLINE_HISTORY, AUDIT_LOGS_STATS, EMPLOYEES_LIST } from '@/api/urls';
import AuditLogScreen from '../screens/AuditLogScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));

const master = { id: 2, type: 'master-admin', employee: { id: 6 } };

const ROWS = [
  {
    id: 11,
    action: 'UPDATE',
    method: 'PUT',
    endpoint: '/work-leaves/7',
    resource_type: 'work_leave',
    resource_id: '7',
    user_id: 5,
    employee_name: 'Aliyev Vali',
    organization_branch_name: 'Chorvoq GES',
    actor_branch_name: 'Bosh ofis',
    ip_address: '10.0.0.5',
    user_agent: 'okhttp/4.12.0 Android',
    // Server timestamptz (UTC) — Toshkentda 14:05.
    created_at: '2026-10-05T09:05:00+00:00',
    details: {
      status: 'approved',
      password: '***',
      target: { id: '7', label: 'vacation', status: 'pending' },
    },
  },
  {
    id: 12,
    action: 'backup_created',
    method: 'POST',
    endpoint: '/system/backups',
    resource_type: 'something_new',
    employee_name: null,
    created_at: '2026-10-05T08:00:00+00:00',
    details: null,
  },
];

const listCalls = (m: MockAdapter) => m.history.get.filter((r) => r.url === AUDIT_LOGS);
const lastList = (m: MockAdapter) => listCalls(m)[listCalls(m).length - 1]!.params;

describe('AuditLogScreen (v2 AuditLogPage)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    useAuthStore.setState({ user: master as never, isAuthenticated: true } as never);
    mock.onGet(AUDIT_LOGS).reply(200, { items: ROWS, total: 60, page: 1, size: 25, pages: 3 });
    mock.onGet(AUDIT_LOGS_STATS).reply(200, { total: 60, by_category: { changes: 40, errors: 15, other: 5 } });
    mock
      .onGet(AUDIT_LOGS_ONLINE)
      .reply(200, { count: 7, users: [{ user_id: 5, name: 'Aliyev Vali', devices: [{}, {}] }] });
    mock.onGet(AUDIT_LOGS_ONLINE_HISTORY).reply(200, [
      { day: '2026-10-04', peak_count: 31 },
      { day: '2026-10-05', peak_count: 9 },
    ]);
    mock.onGet(EMPLOYEES_LIST).reply(200, {
      items: [
        { id: 1, user_id: 77, legal_name: 'Karimova Dilnoza' },
        { id: 2, user_id: null, legal_name: 'Loginsiz Xodim' },
      ],
    });
  });
  afterEach(() => mock.reset());

  it("ro'yxat: amal yorlig'i, resurs, Toshkent vaqti; noma'lum kod/slug xom kalitsiz; server sahifalash", async () => {
    await renderWithProviders(<AuditLogScreen />);
    expect(await screen.findByText('Aliyev Vali', { exact: false })).toBeTruthy();
    expect(lastList(mock)).toEqual({ page: 1, size: 25 });
    expect(screen.getByTestId('audit-action-11')).toHaveTextContent('Tahrirlash');
    expect(screen.getByText("05.10.2026 14:05 · Ruxsat so'rovi #7 · Chorvoq GES")).toBeTruthy();
    expect(screen.getByTestId('audit-action-12')).toHaveTextContent('Zaxira nusxa');
    expect(screen.getByText('05.10.2026 13:00 · something_new')).toBeTruthy();
    expect(screen.getByText("Noma'lum")).toBeTruthy();
    expect(screen.getByTestId('audit-total')).toHaveTextContent('Jami: 60 ta yozuv');
    await fireEvent.press(screen.getByTestId('pager-next'));
    await waitFor(() => expect(lastList(mock)).toEqual({ page: 2, size: 25 }));
  });

  it('onlayn: son, bugungi va rekord; toifa plitkasi bosilsa — filtr (stats toifasiz)', async () => {
    await renderWithProviders(<AuditLogScreen />);
    expect(await screen.findByTestId('audit-online-peaks')).toHaveTextContent('Bugungi eng yuqori: 9 · Rekord: 31');
    await waitFor(() => expect(screen.getByTestId('audit-online-count')).toHaveTextContent('7'));
    await fireEvent.press(await screen.findByTestId('audit-cat-errors'));
    await waitFor(() => expect(lastList(mock)).toEqual({ category: 'errors', page: 1, size: 25 }));
    const statsCalls = mock.history.get.filter((r) => r.url === AUDIT_LOGS_STATS);
    expect(statsCalls.every((r) => !('category' in (r.params ?? {})))).toBe(true);
  });

  it("qidiruv va filtrlar serverga: foydalanuvchi (user_id, loginsizlar yo'q), xato guruhi, sana", async () => {
    await renderWithProviders(<AuditLogScreen />);
    await screen.findByTestId('audit-row-11');
    await fireEvent.changeText(screen.getByPlaceholderText(i18n.t('auditLog.searchPlaceholder')), 'work');
    await waitFor(() => expect(lastList(mock)).toEqual({ search: 'work', page: 1, size: 25 }));

    await fireEvent.press(screen.getByTestId('audit-filters-toggle'));
    await fireEvent.press(screen.getByTestId('audit-filter-user'));
    expect(await screen.findByText('Karimova Dilnoza')).toBeTruthy();
    expect(screen.queryByText('Loginsiz Xodim')).toBeNull();
    await fireEvent.press(screen.getByText('Karimova Dilnoza'));
    await waitFor(() => expect(lastList(mock)).toMatchObject({ user_id: 77 }));

    await fireEvent.press(screen.getByTestId('audit-filter-cat-errors'));
    await fireEvent.press(screen.getByTestId('audit-filter-status-5xx'));
    await waitFor(() => expect(lastList(mock)).toMatchObject({ category: 'errors', status_group: '5xx' }));
  });

  it("tafsilot: endpoint, qurilma, o'zgarish «eski → yangi», maskalangan maydon, to'liq tana", async () => {
    await renderWithProviders(<AuditLogScreen />);
    await fireEvent.press(await screen.findByTestId('audit-row-11'));
    expect(await screen.findByTestId('audit-endpoint')).toHaveTextContent('PUT /work-leaves/7');
    expect(screen.getByText('Mobil ilova · Android')).toBeTruthy();
    expect(screen.getByTestId('audit-snapshot')).toHaveTextContent('Tahrirlangan yozuv: vacation');
    expect(screen.getByTestId('audit-change-status')).toHaveTextContent('status: pending → approved');
    expect(screen.getByTestId('audit-field-password')).toHaveTextContent('password: ***');
    expect(screen.getByTestId('audit-raw')).toHaveTextContent(/"target"/);
  });

  it("tanasiz yozuv — «so'rov tanasi yo'q»", async () => {
    await renderWithProviders(<AuditLogScreen />);
    await fireEvent.press(await screen.findByTestId('audit-row-12'));
    expect(await screen.findByText("So'rov tanasi yo'q (o'qish yoki yuklab olish amali).")).toBeTruthy();
  });

  it("server 403 — «Ruxsat yo'q» (statistika so'ralmaydi qayta)", async () => {
    mock.onGet(AUDIT_LOGS).reply(403, { detail: "Ruxsat yo'q" });
    await renderWithProviders(<AuditLogScreen />);
    expect(await screen.findByText('Audit jurnali faqat asosiy administrator uchun ochiq.')).toBeTruthy();
  });
});
