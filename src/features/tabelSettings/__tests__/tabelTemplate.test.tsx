import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import * as DocumentPicker from 'expo-document-picker';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { downloadAndSave } from '@/lib/saveFile';
import i18n from '@/i18n';
import {
  LETTER_NEXT_REG_NUMBER,
  ORGANIZATION_BRANCHES,
  ORGANIZATION_BRANCH_TABEL_TEMPLATE,
  ORGANIZATION_BRANCH_TABEL_TEMPLATE_BUILD,
  ORGANIZATION_BRANCH_TABEL_TEMPLATE_COLUMNS,
  ORGANIZATION_BRANCH_TABEL_TEMPLATE_SAMPLE,
} from '@/api/urls';
import TabelSettingsScreen from '../screens/TabelSettingsScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));
jest.mock('@/lib/toast', () => ({ ...jest.requireActual('@/lib/toast'), toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@/lib/saveFile', () => ({ ...jest.requireActual('@/lib/saveFile'), downloadAndSave: jest.fn(() => Promise.resolve('saved')) }));

const master = { id: 1, type: 'master-admin' };

const CATALOG = {
  summary: [
    { key: 'n_leave', label: 'Mehnat ta’tili kunlari' },
    { key: 'n_present', label: 'Jami ish kunlari' },
    { key: 'hours', label: 'Jami soat' },
  ],
  identity: [
    { key: 'tabel_number', label: 'Tabel №' },
    { key: 'position', label: 'Lavozimi' },
    { key: 'name', label: 'F.I.SH.' },
  ],
  codes: [
    { key: 'annual_leave', code: 'OT', label: 'Mehnat ta’tili' },
    { key: 'holiday', code: '', label: 'Bayram kuni' },
  ],
  defaults: {
    identity: ['tabel_number', 'position'],
    summary: ['n_leave', 'n_present'],
    group_by_department: true,
    weekend_sheet: true,
    name_format: 'name',
    present: '{norm}',
    legend: true,
    codes: {},
    labels: {},
  },
};

const AUTODETECT = {
  sheets: [
    {
      sheet: 'Tabel',
      kind: 'main',
      grouped: true,
      days_found: 30,
      rows_removed: 4,
      columns: [
        { column: 'B', header: 'F.I.Sh', key: 'name' },
        { column: 'AH', header: 'Jami kun', key: 'n_present' },
        { column: 'AK', header: 'Izoh', key: null },
      ],
    },
    { sheet: 'Dam olish', kind: 'weekend', grouped: false, days_found: 30, rows_removed: 0, columns: [] },
  ],
  codes: { annual_leave: 'OT' },
};

const branch = (file?: Record<string, unknown>) => ({
  id: 2,
  name: 'Chorvoq GES',
  tabel_config: {},
  document_templates: file ? { tabel: { file } } : null,
});
const BRANCHES = [{ id: 1, name: 'Ijro apparati', is_head_office: true, tabel_config: {} }];

describe('Tabel template constructor + recognition report (v2 TabelTemplateBuilder / Report)', () => {
  const mock = new MockAdapter(apiClient);
  const open = async (b: unknown) => {
    mock.onGet(ORGANIZATION_BRANCHES).reply(200, [...BRANCHES, b]);
    await renderWithProviders(<TabelSettingsScreen />);
    await fireEvent.press(await screen.findByTestId('tabel-row-2'));
  };
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    jest.clearAllMocks();
    useAuthStore.setState({ user: master as never, isAuthenticated: true } as never);
    mock.onGet(LETTER_NEXT_REG_NUMBER).reply(200, { next_number: '1', last_number: '0' });
    mock.onGet(ORGANIZATION_BRANCH_TABEL_TEMPLATE_COLUMNS).reply(200, CATALOG);
  });
  afterEach(() => mock.reset());

  it('builds the form: pick columns / rename / codes, then POST …/{id}/tabel-template/build with the exact options', async () => {
    mock.onPost(ORGANIZATION_BRANCH_TABEL_TEMPLATE_BUILD(2)).reply(200, { id: 2 });
    await open(branch({ name: 'x.xlsx', original: 'Eski.xlsx' }));
    await fireEvent.press(await screen.findByTestId('tabel-open-builder'));
    expect(await screen.findByTestId('tabel-builder')).toBeTruthy();
    // Defaults are prefilled.
    expect(screen.getByTestId('tplc-summary-n_leave')).toBeTruthy();
    expect(screen.getByTestId('tplc-summary-n_present')).toBeTruthy();
    expect(screen.queryByTestId('tplc-summary-hours')).toBeNull();

    await fireEvent.press(screen.getByTestId('tplc-add-hours'));
    await fireEvent.press(screen.getByTestId('tplc-up-hours'));
    await fireEvent.press(screen.getByTestId('tplc-remove-n_leave'));
    await fireEvent.changeText(screen.getByTestId('tplc-label-hours'), 'Soat jami');
    await fireEvent.press(screen.getByTestId('tplc-identity-position'));
    await fireEvent(screen.getByTestId('tplc-weekend'), 'valueChange', false);
    await fireEvent.changeText(screen.getByTestId('tplc-code-holiday'), 'BK');
    await fireEvent.changeText(screen.getByTestId('tplc-code-annual_leave'), 'OT');
    expect(screen.getByTestId('tplc-preview')).toHaveTextContent('№ | F.I.SH. | Tabel № | 1 2 3 … | Soat jami | Jami ish kunlari');

    await fireEvent.press(screen.getByTestId('tplc-save'));
    // The branch already has a template — replacing it asks first.
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({
      identity: ['tabel_number'],
      summary: ['hours', 'n_present'],
      group_by_department: true,
      weekend_sheet: false,
      name_format: 'name',
      present: '{norm}',
      legend: true,
      codes: { holiday: 'BK' },
      labels: { hours: 'Soat jami' },
    });
    expect(toast.success).toHaveBeenCalledWith('Tabel blanki saqlandi va qo\'llandi');
  });

  it('needs at least one summary column; no request is sent', async () => {
    await open(branch());
    await fireEvent.press(await screen.findByTestId('tabel-open-builder'));
    await fireEvent.press(await screen.findByTestId('tplc-remove-n_leave'));
    await fireEvent.press(screen.getByTestId('tplc-remove-n_present'));
    await fireEvent.press(screen.getByTestId('tplc-save'));
    expect(await screen.findByText('Kamida bitta yakuniy ustunni tanlang')).toBeTruthy();
    expect(mock.history.post).toHaveLength(0);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('sample download: POST …/tabel-template-sample?organization_branch_id= with the options, nothing saved', async () => {
    await open(branch());
    await fireEvent.press(await screen.findByTestId('tabel-open-builder'));
    await fireEvent.press(await screen.findByTestId('tplc-sample'));
    await waitFor(() => expect(downloadAndSave).toHaveBeenCalledTimes(1));
    const [req, name] = (downloadAndSave as jest.Mock).mock.calls[0]!;
    expect(req).toMatchObject({ url: ORGANIZATION_BRANCH_TABEL_TEMPLATE_SAMPLE, method: 'post', params: { organization_branch_id: 2 } });
    expect(req.data).toMatchObject({ summary: ['n_leave', 'n_present'], weekend_sheet: true, codes: {}, labels: {} });
    expect(name).toBe('tabel-blank-konstruktor.xlsx');
    expect(mock.history.post).toHaveLength(0);
  });

  it('shows what the system recognised (sheets, header → value, codes) and the own-legend note', async () => {
    await open(branch({ name: 'x.xlsx', original: 'Tabel okt.xlsx', sheets: ['Tabel', 'Dam olish'], autodetect: AUTODETECT, own_legend: true }));
    expect(await screen.findByTestId('tabel-report')).toBeTruthy();
    expect(screen.getByText('Tizim nimani tanidi')).toBeTruthy();
    expect(screen.getByTestId('tabel-report-sheet-0')).toHaveTextContent(/Tabel/);
    expect(screen.getByTestId('tabel-report-sheet-0')).toHaveTextContent(/Jami ish kunlari/);
    expect(screen.getByTestId('tabel-report-sheet-0')).toHaveTextContent(/hisobga olinmaydi/);
    expect(screen.getByTestId('tabel-report-sheet-1')).toHaveTextContent(/Dam olish varag'i/);
    expect(screen.getByTestId('tabel-code-annual_leave')).toHaveTextContent('Mehnat ta’tili: OT');
    expect(screen.getByTestId('tabel-own-legend')).toBeTruthy();
    // The constructor opens on the codes found in the file.
    await fireEvent.press(screen.getByTestId('tabel-open-builder'));
    expect((await screen.findByTestId('tplc-code-annual_leave')).props.value).toBe('OT');
  });

  it('no own-legend note and no report for a hand-made template', async () => {
    await open(branch({ name: 'x.xlsx', original: 'Qo‘lda.xlsx', own_legend: false }));
    await screen.findByTestId('tabel-open-builder');
    expect(screen.queryByTestId('tabel-report')).toBeNull();
    expect(screen.queryByTestId('tabel-own-legend')).toBeNull();
  });

  it('upload: POST …/tabel-template multipart, then the list refreshes', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///tmp/t.xlsx', name: 't.xlsx', mimeType: 'application/vnd.ms-excel' }],
    });
    mock.onPost(ORGANIZATION_BRANCH_TABEL_TEMPLATE(2)).reply(200, { id: 2 });
    await open(branch());
    await fireEvent.press(await screen.findByTestId('tabel-upload-template'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(mock.history.post[0]!.url).toBe(ORGANIZATION_BRANCH_TABEL_TEMPLATE(2));
    expect(mock.history.post[0]!.headers?.['Content-Type']).toBe('multipart/form-data');
    expect(toast.success).toHaveBeenCalledWith('Shablon yuklandi');
  });

  it('old server (the catalogue route answers 422): the constructor and its report are hidden, the rest works', async () => {
    mock.onGet(ORGANIZATION_BRANCH_TABEL_TEMPLATE_COLUMNS).reply(422, { detail: [{ msg: 'value is not a valid integer' }] });
    await open(branch({ name: 'x.xlsx', original: 'Eski.xlsx', autodetect: AUTODETECT, own_legend: true }));
    expect(await screen.findByTestId('tabel-template')).toHaveTextContent('Eski.xlsx');
    expect(screen.queryByTestId('tabel-open-builder')).toBeNull();
    expect(screen.queryByTestId('tabel-report')).toBeNull();
    expect(screen.queryByTestId('tabel-template-block')).toBeNull();
    // The settings themselves are still editable.
    expect(screen.getByTestId('tabel-open-config')).toBeTruthy();
  });

  it('old server (404): same, no crash', async () => {
    mock.onGet(ORGANIZATION_BRANCH_TABEL_TEMPLATE_COLUMNS).reply(404, {});
    await open(branch());
    expect(await screen.findByTestId('tabel-open-config')).toBeTruthy();
    expect(screen.queryByTestId('tabel-open-builder')).toBeNull();
  });
});
