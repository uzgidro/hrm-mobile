import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { router } from 'expo-router';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor, within } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import {
  DASHBOARD_CARDS_SUMMARY,
  DASHBOARD_DEPARTMENTS_EMPLOYEE_COUNT,
  DASHBOARD_JOB_POSITION_STATS,
  DASHBOARD_KPI_MONTHLY_AVERAGE,
  DASHBOARD_MAIN,
  DASHBOARD_TASK_EXECUTION_ATTENDANCE,
  REPORTS_CATALOG,
  SERVICE_REQUEST_STATISTICS,
} from '@/api/urls';
import ReportsScreen from '../screens/ReportsScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));

const setUser = (u: Record<string, unknown> | null) =>
  useAuthStore.setState({ user: u as never, isAuthenticated: !!u } as never);
const manager = { id: 1, type: 'employee', employee: { id: 5 }, is_line_manager: true };
const hr = {
  id: 2,
  type: 'employee',
  employee: { id: 6, is_multi_org_user: true, multi_org_employee_role: ['hr'] },
};

const P = (name: string, kind: string, extra: Record<string, unknown> = {}) => ({
  name,
  kind,
  label_key: `p.${name}`,
  required: false,
  default: null,
  options_source: null,
  depends_on: [],
  multiple: false,
  choices: [],
  ...extra,
});
const item = (code: string, category: string, params: unknown[] = [], extra: Record<string, unknown> = {}) => ({
  code,
  title_key: `r.${code}`,
  category,
  params,
  prefs: [],
  formats: ['json', 'xlsx', 'csv'],
  supports_templates: false,
  drills: [],
  hidden: false,
  ...extra,
});
const CATALOG = {
  items: [
    item('staffing', 'hr', [P('date', 'date', { required: true, default: 'today' })]),
    item('timesheet', 'attendance', [P('period', 'date_range', { required: true, default: 'current_month' })]),
    item('kpi_report', 'kpi', [P('month', 'month', { required: true, default: 'current_month' })]),
    // Server yangi turdagi majburiy parametr qo'shgan — mobil uni chiza olmaydi.
    item('geo_report', 'hr', [P('area', 'map_area', { required: true })], { title_key: 'r.geo_report' }),
    item('general_summary_detail', 'hr', [], { hidden: true }),
  ],
  roles: ['supervisor'],
};

describe('ReportsScreen (v2 ReportsPage)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    (router.push as jest.Mock).mockClear();
    mock.onGet(REPORTS_CATALOG).reply(200, CATALOG);
    mock.onGet(DASHBOARD_MAIN).reply(200, { total_employees_count: 412, absent_employees_count: 7, late_employees_count: 3 });
    mock.onGet(DASHBOARD_KPI_MONTHLY_AVERAGE).reply(200, [
      { month: '2026-08', kpi_percentage: 70 },
      { month: '2026-09', kpi_percentage: 81.6 },
    ]);
    mock.onGet(DASHBOARD_CARDS_SUMMARY).reply(200, { completed_tasks_count: 37 });
    mock.onGet(DASHBOARD_TASK_EXECUTION_ATTENDANCE).reply(200, {
      absent_employee_count: 9,
      late_employee_count: 14,
      kpi_below_50_employee_count: 3,
    });
    mock.onGet(DASHBOARD_DEPARTMENTS_EMPLOYEE_COUNT).reply(200, [
      { department_id: 1, department_name: 'Kadrlar bo‘limi', total_count: 12 },
      { department_id: 2, department_name: 'Buxgalteriya', total_count: 30 },
    ]);
    mock.onGet(DASHBOARD_JOB_POSITION_STATS).reply(200, [{ job_position_name: 'Muhandis', count: 55 }]);
    mock.onGet(SERVICE_REQUEST_STATISTICS).reply(200, {
      rows: [
        {
          date: '2026-09-02',
          service_type: 'work_certificate',
          service_label: 'X',
          status: 'issued',
          status_label: 'B',
          count: 3,
        },
        {
          date: '2026-09-01',
          service_type: 'mystery',
          service_label: 'Sirli tur',
          status: 'in_review',
          status_label: 'K',
          count: 2,
        },
        {
          date: '2026-09-02',
          service_type: 'work_certificate',
          service_label: 'X',
          status: 'rejected',
          status_label: 'R',
          count: 1,
        },
      ],
      service_types: [
        { value: 'work_certificate', label: 'X' },
        { value: 'mystery', label: 'Sirli tur' },
      ],
      statuses: [{ value: 'issued', label: 'B' }],
    });
  });
  afterEach(() => mock.reset());

  it("katalog — standart tab: toifa tartibi (davomat → kadrlar → KPI), hidden yo'q, izoh, nomlar lug'atdan", async () => {
    setUser(manager);
    await renderWithProviders(<ReportsScreen />);
    expect(await screen.findByText('Tabel (davomat jadvali)')).toBeTruthy();
    const order = screen.getAllByTestId(/^report-item-/).map((n) => n.props.testID);
    expect(order).toEqual([
      'report-item-timesheet',
      'report-item-staffing',
      'report-item-geo_report',
      'report-item-kpi_report',
    ]);
    expect(screen.queryByTestId('report-item-general_summary_detail')).toBeNull();
    expect(screen.getByText(i18n.t('reports.desc.timesheet'))).toBeTruthy();
    // Lug'atda yo'q kalit — xom yo'l emas, oxirgi bo'lak.
    expect(screen.getByText('geo_report')).toBeTruthy();
    // Rahbar — murojaatlar statistikasi tabi yo'q (canManageStructure emas).
    expect(screen.queryByText(i18n.t('reports.tabRequests'))).toBeNull();
    expect(screen.getByText(i18n.t('reports.tabStaff'))).toBeTruthy();
  });

  it("majburiy parametri qo'llanmagan hisobot — «Web versiyada» belgisi", async () => {
    setUser(manager);
    await renderWithProviders(<ReportsScreen />);
    const row = await screen.findByTestId('report-item-geo_report');
    expect(within(row).getByText(i18n.t('reports.webOnly'))).toBeTruthy();
    expect(within(screen.getByTestId('report-item-timesheet')).queryByText(i18n.t('reports.webOnly'))).toBeNull();
  });

  it("qidiruv nom/izoh/kod bo'yicha; bosish — /hisobot?code=", async () => {
    setUser(manager);
    await renderWithProviders(<ReportsScreen />);
    await screen.findByText('Tabel (davomat jadvali)');
    await fireEvent.changeText(screen.getByPlaceholderText(i18n.t('reports.searchPlaceholder')), 'kpi');
    expect(screen.queryByTestId('report-item-timesheet')).toBeNull();
    await fireEvent.press(screen.getByTestId('report-item-kpi_report'));
    expect(router.push).toHaveBeenCalledWith('/hisobot?code=kpi_report');
  });

  it("ruscha: hisobot nomi va guruh v2 ruscha lug'atidan", async () => {
    setUser(manager);
    await i18n.changeLanguage('ru');
    await renderWithProviders(<ReportsScreen />);
    expect(await screen.findByText('Табель')).toBeTruthy();
    expect(screen.getByText('Посещаемость · 1')).toBeTruthy();
  });

  it("katalog bo'sh va kadr emas — yagona tab «Kadrlar tarkibi»: yig'malar va taqsimot", async () => {
    setUser(manager);
    mock.onGet(REPORTS_CATALOG).reply(200, { items: [], roles: [] });
    await renderWithProviders(<ReportsScreen />);
    await waitFor(() => expect(screen.getByTestId('staff-tile-total')).toBeTruthy());
    expect(screen.queryByTestId('reports-tabs')).toBeNull();
    await waitFor(() => expect(within(screen.getByTestId('staff-tile-total')).getByText('412')).toBeTruthy());
    // O'rtacha KPI — oxirgi oy, butun songa.
    expect(within(screen.getByTestId('staff-tile-kpi')).getByText('82%')).toBeTruthy();
    expect(within(screen.getByTestId('staff-tile-done')).getByText('37')).toBeTruthy();
    // Bugungi sonlar — `dashboard/main` dan (jami bilan bir asos), task-exec'ning eski hisobidan emas.
    expect(within(screen.getByTestId('staff-tile-absent')).getByText('7')).toBeTruthy();
    expect(within(screen.getByTestId('staff-tile-late')).getByText('3')).toBeTruthy();
    expect(within(screen.getByTestId('staff-tile-low')).getByText('3')).toBeTruthy();
    // Taqsimot: kattasi birinchi.
    const dept = screen.getByTestId('staff-by-dept');
    const names = within(dept)
      .getAllByText(/Buxgalteriya|Kadrlar/)
      .map((n) => n.props.children);
    expect(names).toEqual(['Buxgalteriya', 'Kadrlar bo‘limi']);
    // Vazifa oynasi — o'tgan oy → bugun.
    const call = mock.history.get.find((r) => r.url === DASHBOARD_CARDS_SUMMARY);
    expect(call?.params).toEqual({ date_from: expect.any(String), date_to: expect.any(String) });
  });

  it("kadr: murojaatlar statistikasi — yig'ma, tur nomi lug'atdan (noma'lumida server matni), filtr so'rovga", async () => {
    setUser(hr);
    await renderWithProviders(<ReportsScreen />);
    await screen.findByText('Tabel (davomat jadvali)');
    await fireEvent.press(screen.getByText(i18n.t('reports.tabRequests')));
    await waitFor(() => expect(within(screen.getByTestId('requests-tile-total')).getByText('6')).toBeTruthy());
    expect(within(screen.getByTestId('requests-tile-open')).getByText('2')).toBeTruthy();
    expect(within(screen.getByTestId('requests-tile-done')).getByText('3')).toBeTruthy();
    expect(within(screen.getByTestId('requests-tile-rejected')).getByText('1')).toBeTruthy();
    expect(screen.getAllByText(i18n.t('services.type_work_certificate')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sirli tur').length).toBeGreaterThan(0);
    // Saralash: soni bo'yicha o'sish.
    await fireEvent.press(screen.getByTestId('requests-sort-count'));
    expect(within(screen.getByTestId('requests-row-0')).getByText('1')).toBeTruthy();
    // Tur filtri — server so'roviga.
    await fireEvent.press(screen.getByTestId('requests-type'));
    await fireEvent.press(await screen.findByTestId('report-option-mystery'));
    await waitFor(() =>
      expect(
        mock.history.get.some((r) => r.url === SERVICE_REQUEST_STATISTICS && r.params?.service_type === 'mystery'),
      ).toBe(true),
    );
  });

  it("murojaatlar: ro'yxat 50 talab (yana ko'rsatish), 31 kundan ko'p davr — oylar bo'yicha diagramma", async () => {
    setUser(hr);
    mock.onGet(REPORTS_CATALOG).reply(200, { items: [], roles: [] });
    const d0 = Date.parse('2026-08-01T00:00:00Z');
    const many = Array.from({ length: 60 }, (_, i) => ({
      date: new Date(d0 + i * 86_400_000).toISOString().slice(0, 10),
      service_type: 'work_certificate',
      service_label: 'X',
      status: 'issued',
      status_label: 'B',
      count: 1,
    }));
    mock.onGet(SERVICE_REQUEST_STATISTICS).reply(200, { rows: many, service_types: [], statuses: [] });
    await renderWithProviders(<ReportsScreen />);
    await waitFor(() => expect(within(screen.getByTestId('requests-tile-total')).getByText('60')).toBeTruthy());
    // 60 kun → 2 oy (08.2026: 31, 09.2026: 29).
    const chart = screen.getByTestId('requests-chart');
    expect(within(chart).getByText('08.2026')).toBeTruthy();
    expect(within(chart).getByText('09.2026')).toBeTruthy();
    expect(within(chart).queryByText('01.08.2026')).toBeNull();
    expect(screen.getByTestId('requests-row-49')).toBeTruthy();
    expect(screen.queryByTestId('requests-row-50')).toBeNull();
    await fireEvent.press(screen.getByTestId('requests-more'));
    expect(screen.getByTestId('requests-row-59')).toBeTruthy();
    expect(screen.queryByTestId('requests-more')).toBeNull();
  });

  it('murojaatlar xatosi — plitkalarda «—» (0 emas)', async () => {
    setUser(hr);
    mock.onGet(REPORTS_CATALOG).reply(200, { items: [], roles: [] });
    mock.onGet(SERVICE_REQUEST_STATISTICS).reply(500, {});
    await renderWithProviders(<ReportsScreen />);
    expect(await screen.findByText(i18n.t('common.retry'))).toBeTruthy();
    expect(within(screen.getByTestId('requests-tile-total')).getByText('—')).toBeTruthy();
    expect(within(screen.getByTestId('requests-tile-done')).queryByText('0')).toBeNull();
  });

  it("kadrlar tarkibi: taqsimot xatosi — «Ma'lumot yo'q» emas, qayta urinish", async () => {
    setUser(manager);
    mock.onGet(REPORTS_CATALOG).reply(200, { items: [], roles: [] });
    mock.onGet(DASHBOARD_DEPARTMENTS_EMPLOYEE_COUNT).reply(500, {});
    await renderWithProviders(<ReportsScreen />);
    expect(await screen.findByText(i18n.t('common.retry'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('reports.noData'))).toBeNull();
    // Lavozim taqsimoti — o'z ma'lumoti bilan.
    expect(await screen.findByTestId('staff-by-pos')).toBeTruthy();
    mock
      .onGet(DASHBOARD_DEPARTMENTS_EMPLOYEE_COUNT)
      .reply(200, [{ department_id: 1, department_name: 'Kadrlar bo‘limi', total_count: 12 }]);
    await fireEvent.press(screen.getByText(i18n.t('common.retry')));
    expect(await screen.findByTestId('staff-by-dept')).toBeTruthy();
  });

  it("murojaatlar 403 — «ruxsat yo'q», bo'sh diagramma emas", async () => {
    setUser(hr);
    mock.onGet(REPORTS_CATALOG).reply(200, { items: [], roles: [] });
    mock.onGet(SERVICE_REQUEST_STATISTICS).reply(403, { detail: 'forbidden' });
    await renderWithProviders(<ReportsScreen />);
    // Katalog bo'sh — kadr uchun standart tab murojaatlar.
    expect(await screen.findByText(i18n.t('reports.noAccessHint'))).toBeTruthy();
  });
});
