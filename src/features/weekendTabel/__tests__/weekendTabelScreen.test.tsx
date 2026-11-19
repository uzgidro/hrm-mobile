import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import * as DocumentPicker from 'expo-document-picker';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { downloadAndSave } from '@/lib/saveFile';
import { setWeekendTabelSupported, weekendTabelSupported } from '@/lib/serverCaps';
import i18n from '@/i18n';
import {
  DEPARTMENTS_LIST,
  ORGANIZATION_BRANCHES,
  WEEKEND_TABEL,
  WEEKEND_TABEL_ASSIGN,
  WEEKEND_TABEL_ENTRY,
  WEEKEND_TABEL_EXPORT,
  WEEKEND_TABEL_IMPORT,
  WEEKEND_TABEL_ORDERS,
} from '@/api/urls';
import WeekendTabelScreen from '../screens/WeekendTabelScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));
jest.mock('@/lib/toast', () => ({ ...jest.requireActual('@/lib/toast'), toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@/lib/saveFile', () => ({ ...jest.requireActual('@/lib/saveFile'), downloadAndSave: jest.fn(() => Promise.resolve('saved')) }));
jest.mock('@/lib/useActiveBranch', () => ({ ...jest.requireActual('@/lib/useActiveBranch'), useActiveBranchId: () => 5 }));

const hr = { id: 2, type: 'employee', employee: { id: 20, is_multi_org_user: true, multi_org_employee_role: 'hr' } };
const deputy = { id: 3, type: 'employee', employee: { id: 30, is_multi_org_user: true, multi_org_employee_role: 'deputy' } };
const plain = { id: 4, type: 'employee', employee: { id: 40 } };

const DAYS = [
  { date: '2026-11-01', day: 1, weekday: 6, rest: 'weekend' },
  { date: '2026-11-02', day: 2, weekday: 0, rest: null },
  { date: '2026-11-07', day: 7, weekday: 5, rest: 'weekend' },
  { date: '2026-11-08', day: 8, weekday: 6, rest: 'weekend' },
];
const GRID = {
  year: 2026,
  month: 11,
  days: DAYS,
  rows: [
    {
      employee_id: 11,
      name: 'Aliyev Anvar',
      position: 'Muhandis',
      department: 'Moliya',
      tabel_number: '101',
      cells: {
        '2026-11-01': { hours: 6, source: 'turnstile', ref: null },
        '2026-11-08': { hours: 8, source: 'order', ref: '№45, 18.09.2026' },
      },
      manual_zero: ['2026-11-07'],
      days: 2,
      hours: 14,
    },
    {
      employee_id: 12,
      name: 'Valiyev Bobur',
      position: 'Iqtisodchi',
      department: 'Moliya',
      cells: { '2026-11-01': { hours: 4, source: 'manual', ref: null } },
      manual_zero: [],
      days: 1,
      hours: 4,
    },
    {
      employee_id: 13,
      name: 'Karimov Sardor',
      department: 'IT',
      cells: { '2026-11-07': { hours: 3.5, source: 'import', ref: null } },
      manual_zero: [],
      days: 1,
      hours: 3.5,
    },
  ],
  totals: { employees: 3, days: 4, hours: 21.5 },
};
const ORDERS = [
  { order_act_id: 77, ref: '№45, 18.09.2026', employee_id: 11, employee_name: 'Aliyev Anvar', date_from: '2026-11-07', date_to: '2026-11-08', rest_days: ['2026-11-07', '2026-11-08'] },
];

describe('WeekendTabelScreen (v2 WeekendTabelPage)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    jest.clearAllMocks();
    setWeekendTabelSupported(undefined);
    useAuthStore.setState({ user: hr as never, isAuthenticated: true } as never);
    mock.onGet(WEEKEND_TABEL).reply(200, GRID);
    mock.onGet(WEEKEND_TABEL_ORDERS).reply(200, ORDERS);
    mock.onGet(DEPARTMENTS_LIST).reply(200, [{ id: 1, name: 'Moliya' }, { id: 2, name: 'IT' }]);
    mock.onGet(ORGANIZATION_BRANCHES).reply(200, []);
  });
  afterEach(() => mock.reset());

  it('grid: groups by department, per-employee rest-day cells with hours, totals, orders panel', async () => {
    await renderWithProviders(<WeekendTabelScreen />);
    expect(await screen.findByText('Aliyev Anvar')).toBeTruthy();
    expect(screen.getByText('Karimov Sardor')).toBeTruthy();
    expect(screen.getByTestId('weekend-cell-11-2026-11-01')).toHaveTextContent('01.11 · 6');
    expect(screen.getByTestId('weekend-cell-11-2026-11-08')).toHaveTextContent('08.11 · 8');
    // HR's explicit zero shows as a cell too.
    expect(screen.getByTestId('weekend-cell-11-2026-11-07')).toHaveTextContent('07.11 · 0');
    expect(screen.getByTestId('weekend-cell-13-2026-11-07')).toHaveTextContent('07.11 · 3.5');
    expect(screen.getByTestId('weekend-total-11')).toHaveTextContent('2 kun · 14 soat');
    expect(screen.getByTestId('weekend-orders')).toBeTruthy();
    expect(screen.getByTestId('weekend-order-77')).toBeTruthy();
    // The grid query carries the active branch and the month.
    const req = mock.history.get.find((r) => r.url === WEEKEND_TABEL)!;
    expect(req.params).toMatchObject({ organization_branch_id: 5 });
    expect(weekendTabelSupported()).toBe(true);
  });

  it('edit a cell: PUT /weekend-tabel/entry with hours + note; revert sends hours null', async () => {
    mock.onPut(WEEKEND_TABEL_ENTRY).reply(200, {});
    await renderWithProviders(<WeekendTabelScreen />);
    await fireEvent.press(await screen.findByTestId('weekend-edit-11-2026-11-08'));
    expect(await screen.findByTestId('weekend-cell-sheet')).toBeTruthy();
    expect(screen.getByTestId('weekend-cell-ref')).toHaveTextContent('№45, 18.09.2026');
    expect(screen.getByTestId('weekend-hours').props.value).toBe('8');
    await fireEvent.changeText(screen.getByTestId('weekend-hours'), '6,5');
    await fireEvent.changeText(screen.getByTestId('weekend-note'), ' kechgacha ');
    await fireEvent.press(screen.getByTestId('weekend-save'));
    await waitFor(() => expect(mock.history.put).toHaveLength(1));
    expect(JSON.parse(mock.history.put[0]!.data)).toEqual({
      employee_id: 11,
      date: '2026-11-08',
      hours: 6.5,
      note: 'kechgacha',
    });
    expect(toast.success).toHaveBeenCalledWith('Saqlandi');

    await fireEvent.press(await screen.findByTestId('weekend-edit-12-2026-11-01'));
    await fireEvent.press(await screen.findByTestId('weekend-revert'));
    await waitFor(() => expect(mock.history.put).toHaveLength(2));
    expect(JSON.parse(mock.history.put[1]!.data)).toEqual({ employee_id: 12, date: '2026-11-01', hours: null });
  });

  it('rejects out-of-range hours without calling the server', async () => {
    await renderWithProviders(<WeekendTabelScreen />);
    await fireEvent.press(await screen.findByTestId('weekend-edit-11-2026-11-01'));
    await fireEvent.changeText(await screen.findByTestId('weekend-hours'), '30');
    await fireEvent.press(screen.getByTestId('weekend-save'));
    expect(await screen.findByText('0 dan 24 gacha qiymat kiriting')).toBeTruthy();
    expect(mock.history.put).toHaveLength(0);
  });

  it('assign by order: department shortcut + all rest days + order reference -> POST /weekend-tabel/assign', async () => {
    mock.onPost(WEEKEND_TABEL_ASSIGN).reply(200, { changed: 4, employees: 2, days: 3, not_rest_days: ['2026-11-02'] });
    await renderWithProviders(<WeekendTabelScreen />);
    await screen.findByText('Aliyev Anvar');
    await fireEvent.press(await screen.findByTestId('weekend-assign'));
    expect(await screen.findByTestId('weekend-assign-sheet')).toBeTruthy();
    // Validation first: nothing picked yet.
    await fireEvent.press(screen.getByTestId('weekend-assign-submit'));
    expect(await screen.findByText('Kamida bitta xodim va bitta kunni tanlang')).toBeTruthy();
    expect(mock.history.post).toHaveLength(0);

    await fireEvent.press(await screen.findByText('Moliya · 2'));
    await fireEvent.press(screen.getByTestId('weekend-all-rest'));
    await fireEvent.changeText(screen.getByTestId('weekend-assign-ref'), '№45, 18.09.2026');
    await fireEvent.press(screen.getByTestId('weekend-assign-submit'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({
      employee_ids: [11, 12],
      dates: ['2026-11-01', '2026-11-07', '2026-11-08'],
      hours: 8,
      order_ref: '№45, 18.09.2026',
    });
    expect(toast.success).toHaveBeenCalledWith('4 ta belgilandi');
    // Days that are not rest days are reported, not hidden.
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('02.11.2026'));
  });

  it('assign from an approved order fills employee, rest days, reference and order_act_id', async () => {
    mock.onPost(WEEKEND_TABEL_ASSIGN).reply(200, { changed: 2, employees: 1, days: 2, not_rest_days: [] });
    await renderWithProviders(<WeekendTabelScreen />);
    await screen.findByText('Aliyev Anvar');
    await fireEvent.press(await screen.findByTestId('weekend-assign'));
    await fireEvent.press(await screen.findByTestId('weekend-assign-order-pick'));
    await fireEvent.press(await screen.findByText('№45, 18.09.2026 · Aliyev Anvar'));
    await fireEvent.changeText(screen.getByTestId('weekend-assign-hours'), '7,5');
    await fireEvent.press(screen.getByTestId('weekend-assign-submit'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({
      employee_ids: [11],
      dates: ['2026-11-07', '2026-11-08'],
      hours: 7.5,
      order_ref: '№45, 18.09.2026',
      order_act_id: 77,
    });
  });

  it('removing a designation asks to confirm, then sends hours null', async () => {
    mock.onPost(WEEKEND_TABEL_ASSIGN).reply(200, { changed: 1, employees: 1, days: 1, not_rest_days: [] });
    await renderWithProviders(<WeekendTabelScreen />);
    await screen.findByText('Aliyev Anvar');
    await fireEvent.press(await screen.findByTestId('weekend-assign'));
    await fireEvent.press(await screen.findByText('IT · 1'));
    await fireEvent.press(screen.getByTestId('weekend-day-2026-11-07'));
    await fireEvent.press(screen.getByTestId('weekend-assign-remove'));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({ employee_ids: [13], dates: ['2026-11-07'], hours: null });
  });

  it('import: dry run preview first (dry_run=true), then confirm (dry_run=false)', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///tmp/dam.xlsx', name: 'dam.xlsx', mimeType: 'application/vnd.ms-excel' }],
    });
    mock.onPost(WEEKEND_TABEL_IMPORT).reply((cfg) => [
      200,
      {
        sheet: 'Dam olish',
        dry_run: cfg.params.dry_run,
        employees: 2,
        entries: 5,
        weekday_entries: 1,
        unmatched: [{ row: 9, name: 'Nomalum Kishi', days: 2 }],
        ambiguous: [],
      },
    ]);
    await renderWithProviders(<WeekendTabelScreen />);
    await fireEvent.press(await screen.findByTestId('weekend-import'));
    await fireEvent.press(await screen.findByTestId('weekend-import-pick'));
    expect(await screen.findByTestId('weekend-import-preview')).toBeTruthy();
    expect(screen.getByText(/Nomalum Kishi/)).toBeTruthy();
    expect(mock.history.post[0]!.params).toMatchObject({ dry_run: true, organization_branch_id: 5 });
    await fireEvent.press(screen.getByTestId('weekend-import-confirm'));
    await waitFor(() => expect(mock.history.post).toHaveLength(2));
    expect(mock.history.post[1]!.params.dry_run).toBe(false);
    expect(toast.success).toHaveBeenCalledWith('Import qilindi: 5 ta yozuv');
  });

  it('export and blank form go through the saver with the right query', async () => {
    await renderWithProviders(<WeekendTabelScreen />);
    await fireEvent.press(await screen.findByTestId('weekend-export-blank'));
    await waitFor(() => expect(downloadAndSave).toHaveBeenCalledTimes(1));
    const [req, name] = (downloadAndSave as jest.Mock).mock.calls[0]!;
    expect(req.url).toBe(WEEKEND_TABEL_EXPORT);
    expect(req.params).toMatchObject({ organization_branch_id: 5, blank: true });
    expect(name).toMatch(/^dam-olish-tabeli-\d{4}-\d{2}-blank\.xlsx$/);
    await fireEvent.press(screen.getByTestId('weekend-export'));
    await waitFor(() => expect(downloadAndSave).toHaveBeenCalledTimes(2));
    expect((downloadAndSave as jest.Mock).mock.calls[1]![0].params.blank).toBeUndefined();
  });

  it('a leadership viewer (deputy) reads only: no edit, import or assign', async () => {
    useAuthStore.setState({ user: deputy as never } as never);
    await renderWithProviders(<WeekendTabelScreen />);
    expect(await screen.findByText('Aliyev Anvar')).toBeTruthy();
    expect(screen.getByTestId('weekend-read-only')).toBeTruthy();
    expect(screen.queryByTestId('weekend-assign')).toBeNull();
    expect(screen.queryByTestId('weekend-import')).toBeNull();
    expect(screen.queryByTestId('weekend-add-11')).toBeNull();
    await fireEvent.press(screen.getByTestId('weekend-edit-11-2026-11-08'));
    expect(screen.queryByTestId('weekend-cell-sheet')).toBeNull();
    expect(screen.getByTestId('weekend-export')).toBeTruthy();
  });

  it('an ordinary employee gets no access and no request is made', async () => {
    useAuthStore.setState({ user: plain as never } as never);
    await renderWithProviders(<WeekendTabelScreen />);
    expect(screen.queryByTestId('weekend-screen')).toBeNull();
    expect(mock.history.get.filter((r) => r.url === WEEKEND_TABEL)).toHaveLength(0);
  });

  it('old server (404): shows the "not updated yet" state, no crash, and marks the module unsupported', async () => {
    mock.onGet(WEEKEND_TABEL).reply(404, { detail: 'Not Found' });
    await renderWithProviders(<WeekendTabelScreen />);
    expect(await screen.findByText('Server hali yangilanmagan')).toBeTruthy();
    expect(screen.queryByTestId('weekend-assign')).toBeNull();
    expect(screen.queryByTestId('weekend-export')).toBeNull();
    await waitFor(() => expect(weekendTabelSupported()).toBe(false));
  });

  it('a real server error is an error state with retry, not the "not updated" one', async () => {
    mock.onGet(WEEKEND_TABEL).reply(500, {});
    await renderWithProviders(<WeekendTabelScreen />);
    expect(await screen.findByText("Tabelni yuklab bo'lmadi")).toBeTruthy();
    expect(screen.queryByText('Server hali yangilanmagan')).toBeNull();
  });
});
