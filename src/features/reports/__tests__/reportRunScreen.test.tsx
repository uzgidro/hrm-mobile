import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import dayjs from 'dayjs';
import { apiClient } from '@/api/client';
import { act, renderWithProviders, screen, fireEvent, waitFor, within } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import { __resetToasts, getToasts } from '@/lib/toast';
import i18n from '@/i18n';
import { REPORT_OPTIONS, REPORT_RUN, REPORTS_CATALOG } from '@/api/urls';
import ReportRunScreen from '../screens/ReportRunScreen';

let mockCode = 'timesheet';
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ code: mockCode }),
}));

const setUser = (u: Record<string, unknown> | null) =>
  useAuthStore.setState({ user: u as never, isAuthenticated: !!u } as never);
const manager = {
  id: 1,
  type: 'employee',
  employee: { id: 5, primary_organization_branch_id: 30 },
  is_line_manager: true,
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
const item = (code: string, params: unknown[], extra: Record<string, unknown> = {}) => ({
  code,
  title_key: `r.${code}`,
  category: 'attendance',
  params,
  prefs: [],
  formats: ['json', 'xlsx', 'csv'],
  supports_templates: true,
  drills: [],
  hidden: false,
  ...extra,
});
const CATALOG = {
  items: [
    item(
      'timesheet',
      [
        P('period', 'date_range', { required: true, default: 'current_month' }),
        P('branch_ids', 'branch_multi', { options_source: 'branches' }),
        P('job_groups', 'enum', {
          multiple: true,
          choices: [
            { value: 'rahbar', label_key: 'p.job_group_rahbar' },
            { value: 'ishchi', label_key: 'p.job_group_ishchi' },
          ],
        }),
      ],
      { drills: ['timesheet_employee_detail'] },
    ),
    item(
      'kpi_report',
      [
        P('month', 'month', { required: true, default: 'current_month' }),
        P('branch_id', 'int', { options_source: 'branches' }),
        P('division_ids', 'division_tree', { options_source: 'divisions', depends_on: ['branch_id'] }),
        P('employee_ids', 'employee_multi', { options_source: 'employees', depends_on: ['branch_id'] }),
      ],
      { category: 'kpi' },
    ),
    item('dismissal_reason', [
      P('reason', 'enum', {
        required: true,
        choices: [
          { value: 'own', label_key: 'p.reason' },
          { value: 'other', label_key: 'p.status' },
        ],
      }),
    ]),
    item('geo_report', [P('area', 'map_area', { required: true })]),
  ],
  roles: ['supervisor'],
};

const TABLE = {
  title: 'Tabel',
  title_key: 'r.timesheet',
  info: [{ k: 'period', v: '01.09.2026 — 30.09.2026' }],
  generated_at: '2026-10-05T14:07:31.5',
  qr_png_b64: null,
  signature: null,
  sheets: [
    {
      name: 'Tabel',
      name_key: null,
      ncols: 4,
      widths: [4, 30, 10, 10],
      header: [
        [
          { v: '№', k: 'no', rs: 2 },
          { v: 'F.I.Sh.', k: 'name', rs: 2 },
          { v: 'Fakt', k: 'fact', cs: 2 },
        ],
        [
          { v: 'Soat', k: 'hours' },
          { v: '%', k: 'percent' },
        ],
      ],
      rows: [
        { kind: 'section', c: [{ v: 'Kadrlar bo‘limi', s: 'section', cs: 4 }] },
        {
          kind: 'body',
          c: [
            { v: 1, f: 'int' },
            { v: 'Aliyev Vali', p: { report: 'timesheet_employee_detail', params: { employee_id: 11 } } },
            { v: '8.30', f: 'hhmm' },
            { v: 87.456, f: 'pct', s: 'warning' },
          ],
        },
      ],
      footer: [
        {
          kind: 'footer',
          c: [
            { v: 'Jami', k: 'total', cs: 2 },
            { v: '8.30', f: 'hhmm' },
            { v: 90, f: 'pct' },
          ],
        },
      ],
      freeze_rows: 2,
      freeze_cols: 2,
      legend: [{ s: 'warning', k: 'legend_warning', v: 'server matni' }],
    },
  ],
  body_rows: 1,
};
const DETAIL = {
  ...TABLE,
  title: 'Detail',
  title_key: 'r.timesheet_employee_detail',
  info: [],
  sheets: [
    {
      ...TABLE.sheets[0],
      ncols: 2,
      widths: [12, 12],
      header: [
        [
          { v: 'Sana', k: 'date' },
          { v: 'Holat', k: 'status' },
        ],
      ],
      rows: [{ kind: 'body', c: [{ v: '2026-09-01', f: 'date' }, { v: 'Keldi' }] }],
      footer: [],
      legend: [],
    },
  ],
};

const runs = (m: MockAdapter, code = 'timesheet') =>
  m.history.post.filter((r) => r.url === REPORT_RUN(code)).map((r) => JSON.parse(r.data));

describe('ReportRunScreen (v2 ReportRunPage)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    __resetToasts();
    mockCode = 'timesheet';
    setUser(manager);
    mock.onGet(REPORTS_CATALOG).reply(200, CATALOG);
    mock.onPost(REPORT_RUN('timesheet')).reply((cfg) => [200, JSON.parse(cfg.data).drill ? DETAIL : TABLE]);
    mock.onPost(REPORT_RUN('kpi_report')).reply(200, TABLE);
    mock.onGet(REPORT_OPTIONS('kpi_report', 'branch_id')).reply(200, [
      { value: 30, label: 'Sihatgoh' },
      { value: 7, label: 'Chorvoq GES' },
    ]);
    mock.onGet(REPORT_OPTIONS('kpi_report', 'division_ids')).reply(200, [
      { value: 'b30', label: 'Sihatgoh', is_branch: true, parent: null, branch_id: 30 },
      { value: 101, label: 'Kadrlar', parent: 'b30', branch_id: 30 },
      { value: 102, label: 'Buxgalteriya', parent: 'b30', branch_id: 30 },
    ]);
    mock.onGet(REPORT_OPTIONS('kpi_report', 'employee_ids')).reply((cfg) => [
      200,
      cfg.params?.q === 'Ali' || cfg.params?.ids
        ? [{ value: 11, label: 'Aliyev Vali', sub: 'Kadrlar · Mutaxassis' }]
        : [
            { value: 11, label: 'Aliyev Vali' },
            { value: 12, label: 'Karimov Ali' },
          ],
    ]);
  });
  afterEach(() => {
    mock.reset();
    __resetToasts();
  });

  it("defaultlar: joriy oy oralig'i; tana — json, prefs null (saqlangan sozlamalar), lang uz", async () => {
    await renderWithProviders(<ReportRunScreen />);
    expect(await screen.findByText('Tabel (davomat jadvali)')).toBeTruthy();
    expect(screen.getByText(dayjs().startOf('month').format('DD.MM.YYYY'))).toBeTruthy();
    await fireEvent.press(screen.getByTestId('report-param-job_groups-ishchi'));
    await fireEvent.press(screen.getByTestId('report-generate'));
    await waitFor(() => expect(runs(mock)).toHaveLength(1));
    expect(runs(mock)[0]).toEqual({
      params: {
        period: {
          from: dayjs().startOf('month').format('YYYY-MM-DD'),
          to: dayjs().endOf('month').format('YYYY-MM-DD'),
        },
        job_groups: ['ishchi'],
      },
      prefs: null,
      format: 'json',
      drill: null,
      lang: 'uz',
    });
  });

  it("jadval: sarlavha kalitlari tarjimada, bo'lim qatori, format, jami qatori, izoh, qatorlar soni", async () => {
    await renderWithProviders(<ReportRunScreen />);
    await fireEvent.press(await screen.findByTestId('report-generate'));
    const table = await screen.findByTestId('report-table');
    expect(within(table).getByText('F.I.Sh.')).toBeTruthy();
    expect(within(table).getByText('Fakt')).toBeTruthy();
    expect(within(table).getByText('Soat')).toBeTruthy();
    expect(within(table).getByText('Kadrlar bo‘limi')).toBeTruthy();
    expect(within(table).getByText('87,46%')).toBeTruthy();
    // Jami qatori yorliq kalitidan.
    expect(within(table).getByText('Jami')).toBeTruthy();
    expect(within(table).getByText('90%')).toBeTruthy();
    // Rang izohi lug'atdan (server matni emas).
    expect(within(table).getByText(i18n.t('reports.h.legend_warning'))).toBeTruthy();
    expect(within(table).getByText(`${i18n.t('reports.h.generated_at')}: 05.10.2026 14:07 · 1 qator`)).toBeTruthy();
  });

  it("drill: katak — drill so'rovi va breadcrumb; orqaga — saqlangan jadval, QAYTA SO'ROVSIZ", async () => {
    await renderWithProviders(<ReportRunScreen />);
    await fireEvent.press(await screen.findByTestId('report-generate'));
    await fireEvent.press(await screen.findByTestId('report-drill-timesheet_employee_detail'));
    await waitFor(() => expect(runs(mock)).toHaveLength(2));
    expect(runs(mock)[1].drill).toEqual({ report: 'timesheet_employee_detail', params: { employee_id: 11 } });
    // Drill ham ota hisobotning parametrlari bilan (server ustiga drill parametrlarini qo'yadi).
    expect(runs(mock)[1].params).toEqual(runs(mock)[0].params);
    expect(await screen.findByText('01.09.2026')).toBeTruthy();
    expect(within(screen.getByTestId('report-crumb-1')).getByText('Aliyev Vali')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('report-crumb-0'));
    expect(await screen.findByText('Aliyev Vali')).toBeTruthy();
    expect(screen.queryByTestId('report-crumbs')).toBeNull();
    expect(runs(mock)).toHaveLength(2);
  });

  it('til: ru — ru, en va kirill — uz (server faqat uz/ru biladi)', async () => {
    await i18n.changeLanguage('ru');
    await renderWithProviders(<ReportRunScreen />);
    await fireEvent.press(await screen.findByTestId('report-generate'));
    await waitFor(() => expect(runs(mock)[0]?.lang).toBe('ru'));
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    await fireEvent.press(await screen.findByText('Parameters'));
    await fireEvent.press(await screen.findByTestId('report-generate'));
    await waitFor(() => expect(runs(mock)[1]?.lang).toBe('uz'));
  });

  it("KPI: branch_id — o'z filiali; bo'limlar daraxti (filial tuguni = barcha bo'limlar); xodim — server qidiruvi", async () => {
    mockCode = 'kpi_report';
    await renderWithProviders(<ReportRunScreen />);
    // O'z filiali oldindan tanlangan — nomi options'dan.
    await waitFor(() =>
      expect(within(screen.getByTestId('report-param-branch_id')).getByText('Sihatgoh')).toBeTruthy(),
    );

    await fireEvent.press(screen.getByTestId('report-param-division_ids'));
    await fireEvent.press(await screen.findByTestId('report-option-b30'));
    await fireEvent.press(screen.getByTestId('report-options-done'));
    expect(within(screen.getByTestId('report-param-division_ids')).getByText('Kadrlar, Buxgalteriya')).toBeTruthy();
    const divCall = mock.history.get.find((r) => r.url === REPORT_OPTIONS('kpi_report', 'division_ids'));
    expect(divCall?.params?.branch_ids).toBe('30');

    await fireEvent.press(screen.getByTestId('report-param-employee_ids'));
    await fireEvent.changeText(await screen.findByPlaceholderText(i18n.t('common.search')), 'Ali');
    await waitFor(() =>
      expect(
        mock.history.get.some(
          (r) =>
            r.url === REPORT_OPTIONS('kpi_report', 'employee_ids') && r.params?.q === 'Ali' && r.params?.limit === 50,
        ),
      ).toBe(true),
    );
    await fireEvent.press(await screen.findByText('Kadrlar · Mutaxassis'));
    await fireEvent.press(screen.getByTestId('report-options-done'));
    await waitFor(() =>
      expect(within(screen.getByTestId('report-param-employee_ids')).getByText('Aliyev Vali')).toBeTruthy(),
    );

    await fireEvent.press(screen.getByTestId('report-generate'));
    await waitFor(() => expect(runs(mock, 'kpi_report')).toHaveLength(1));
    expect(runs(mock, 'kpi_report')[0].params).toEqual({
      month: dayjs().format('YYYY-MM'),
      branch_id: 30,
      division_ids: [101, 102],
      employee_ids: [11],
    });
  });

  it("majburiy parametr bo'sh — shakllantirilmaydi; tanlangach yuboriladi", async () => {
    mockCode = 'dismissal_reason';
    await renderWithProviders(<ReportRunScreen />);
    await screen.findByText(i18n.t('reports.fillRequired'));
    await fireEvent.press(screen.getByTestId('report-generate'));
    expect(runs(mock, 'dismissal_reason')).toHaveLength(0);
    mock.onPost(REPORT_RUN('dismissal_reason')).reply(200, TABLE);
    await fireEvent.press(screen.getByTestId('report-param-reason-other'));
    expect(screen.queryByText(i18n.t('reports.fillRequired'))).toBeNull();
    await fireEvent.press(screen.getByTestId('report-generate'));
    await waitFor(() => expect(runs(mock, 'dismissal_reason')[0]?.params).toEqual({ reason: 'other' }));
  });

  it("qo'llanmagan majburiy tur — «faqat web», forma va tugma yo'q", async () => {
    mockCode = 'geo_report';
    await renderWithProviders(<ReportRunScreen />);
    expect(await screen.findByText(i18n.t('reports.webOnlyReportTitle'))).toBeTruthy();
    expect(screen.queryByTestId('report-generate')).toBeNull();
  });

  it("katalogda yo'q kod — «topilmadi yoki ruxsat yo'q»", async () => {
    mockCode = 'secret_report';
    await renderWithProviders(<ReportRunScreen />);
    expect(await screen.findByText(i18n.t('reports.notAllowedTitle'))).toBeTruthy();
    expect(mock.history.post).toHaveLength(0);
  });

  it("server xatosi kodi tarjimada toast bo'ladi", async () => {
    mock.onPost(REPORT_RUN('timesheet')).reply(400, { code: 'report_too_large', detail: 'Hisobot juda katta' });
    await renderWithProviders(<ReportRunScreen />);
    await fireEvent.press(await screen.findByTestId('report-generate'));
    await waitFor(() => expect(getToasts().map((x) => x.message)).toContain(i18n.t('errors.report_too_large')));
    expect(screen.queryByTestId('report-table')).toBeNull();
  });
});
