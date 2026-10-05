import React from 'react';
import { Linking } from 'react-native';
import MockAdapter from 'axios-mock-adapter';
import dayjs from 'dayjs';
import * as DocumentPicker from 'expo-document-picker';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import { confirm } from '@/lib/confirm';
import { __resetToasts, getToasts } from '@/lib/toast';
import i18n from '@/i18n';
import {
  MEDICAL_ANNUAL_INDEX,
  MEDICAL_CHECKUP,
  MEDICAL_CHECKUP_FILES,
  MEDICAL_CHECKUPS,
  MEDICAL_EMPLOYEE,
  MEDICAL_EMPLOYEES,
  MEDICAL_FILE,
  MEDICAL_SPECIALTIES,
  ORGANIZATION_BRANCHES,
} from '@/api/urls';
import MedicalScreen from '../screens/MedicalScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

const setUser = (u: Record<string, unknown> | null) =>
  useAuthStore.setState({ user: u as never, isAuthenticated: !!u } as never);
const doctor = {
  id: 1,
  type: 'employee',
  employee: { id: 5, primary_organization_branch_id: 30 },
  medical_enabled: true,
  medical_specialties: [{ id: 3, name: 'Terapevt' }],
};
// Bugun — qurilmaning mahalliy sanasi (forma ham shunday oladi), TZ'dan mustaqil.
const TODAY = dayjs().format('YYYY-MM-DD');
const YEAR = dayjs().year();

const ROWS = [
  {
    id: 11,
    legal_name: 'Aliyev Vali',
    department_name: 'Kadrlar',
    job_position_name: 'Mutaxassis',
    last_checkup_date: '2026-02-01',
    checkup_count: 2,
    status: 'passed',
    annual_index: 'good',
    annual_index_year: 2026,
  },
  { id: 12, legal_name: 'Karimov Ali', last_checkup_date: null, checkup_count: 0, status: 'overdue' },
];
const COUNTS: Record<string, number> = { '': 120, passed: 80, due_soon: 15, overdue: 25 };

const DETAIL = {
  employee: ROWS[0],
  can_add_checkup: true,
  can_set_annual_index: true,
  checkups: [
    {
      id: 101,
      checkup_date: '2025-02-01',
      specialty_name: 'Kardiolog',
      doctor_name: 'Doktor B',
      conclusion: 'Eski xulosa',
      files: [],
      can_edit: false,
      can_delete: false,
    },
    {
      id: 102,
      checkup_date: '2026-02-01',
      specialty_id: 3,
      specialty_name: 'Terapevt',
      doctor_name: 'Doktor A',
      conclusion: "Sog'lom",
      recommendation: 'Dam olish',
      files: [
        { id: 7, original_filename: 'tahlil.pdf', file_url: 'https://minio/tahlil.pdf' },
        { id: 8, original_filename: 'skan.jpg', file_url: 'javascript:alert(1)' },
      ],
      can_edit: true,
      can_delete: true,
    },
  ],
  annual_indexes: [
    { id: 1, year: 2025, health_index: 'excellent', index_note: 'Yaxshi natija', set_by_name: 'Toshmatov Bosh' },
  ],
};

const listCalls = (m: MockAdapter) =>
  m.history.get.filter((r) => r.url === MEDICAL_EMPLOYEES && r.params?.size !== 1).map((r) => r.params);
const countCalls = (m: MockAdapter) =>
  m.history.get.filter((r) => r.url === MEDICAL_EMPLOYEES && r.params?.size === 1).map((r) => r.params);

describe('MedicalScreen (v2 MedicalPage)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    (confirm as jest.Mock).mockClear();
    (confirm as jest.Mock).mockImplementation(() => Promise.resolve(true));
    __resetToasts();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    mock.onGet(MEDICAL_EMPLOYEES).reply((cfg) => {
      if (cfg.params?.size === 1) return [200, { items: [], total: COUNTS[cfg.params.status ?? ''], page: 1, size: 1 }];
      return [200, { items: ROWS, total: 45, page: cfg.params?.page, size: 20 }];
    });
    mock.onGet(MEDICAL_EMPLOYEE(11)).reply(200, DETAIL);
    mock.onGet(ORGANIZATION_BRANCHES).reply(200, [
      { id: 30, name: 'Sihatgoh' },
      { id: 7, name: 'Chorvoq GES' },
    ]);
    mock.onGet(MEDICAL_SPECIALTIES).reply(200, [
      { id: 3, name: 'Terapevt' },
      { id: 4, name: 'Kardiolog' },
    ]);
    mock.onPost(MEDICAL_CHECKUPS).reply(200, { id: 200 });
    mock.onPatch(MEDICAL_CHECKUP(102)).reply(200, { id: 102 });
    mock.onDelete(MEDICAL_CHECKUP(102)).reply(200, {});
    mock.onPost(MEDICAL_ANNUAL_INDEX).reply(200, {});
    mock.onPost(MEDICAL_CHECKUP_FILES(102)).reply(200, { id: 9 });
    mock.onDelete(MEDICAL_FILE(7)).reply(200, {});
  });
  afterEach(() => {
    mock.reset();
    jest.restoreAllMocks();
  });

  const openDetail = async () => {
    await renderWithProviders(<MedicalScreen />);
    await fireEvent.press(await screen.findByText('Aliyev Vali'));
    return screen.findByTestId('medical-checkup-102');
  };

  it("modul yopiq (medical_enabled yo'q) — «ochiq emas», so'rov yo'q", async () => {
    setUser({ id: 2, type: 'master-admin', employee: { id: 6 } });
    await renderWithProviders(<MedicalScreen />);
    expect(screen.getByText(i18n.t('medical.noAccess'))).toBeTruthy();
    expect(mock.history.get).toHaveLength(0);
  });

  it("ro'yxat: sahifa 1 (filialsiz — butun tashkilot), qator: holat, indeks·yil, oxirgi sana; plitka sonlari serverdan", async () => {
    setUser(doctor);
    await renderWithProviders(<MedicalScreen />);
    expect(await screen.findByText('Aliyev Vali')).toBeTruthy();
    expect(listCalls(mock)[0]).toEqual({ page: 1, size: 20 });
    expect(screen.getByText('Kadrlar · Mutaxassis')).toBeTruthy();
    expect(screen.getByText(`Yaxshi · 2026`)).toBeTruthy();
    expect(screen.getByText('01.02.2026')).toBeTruthy();
    // Plitka + qator badge'i.
    expect(screen.getAllByText("Muddati o'tgan").length).toBeGreaterThanOrEqual(2);
    await waitFor(() => expect(screen.getByText('120')).toBeTruthy());
    expect(screen.getByText('80')).toBeTruthy();
    expect(screen.getByText('15')).toBeTruthy();
    expect(screen.getByText('25')).toBeTruthy();
    expect(countCalls(mock).map((p) => p?.status ?? '')).toEqual(
      expect.arrayContaining(['', 'passed', 'due_soon', 'overdue']),
    );
    // 45 ta / 20 — uch sahifa.
    expect(screen.getByText('1 / 3')).toBeTruthy();
  });

  it('plitka — holat filtri; qidiruv serverga (plitkalar ham shu qidiruv bilan)', async () => {
    setUser(doctor);
    await renderWithProviders(<MedicalScreen />);
    await screen.findByText('Aliyev Vali');
    await fireEvent.press(screen.getByTestId('medical-tile-overdue'));
    await waitFor(() => expect(listCalls(mock).some((p) => p?.status === 'overdue')).toBe(true));
    await fireEvent.changeText(screen.getByPlaceholderText(i18n.t('medical.searchPlaceholder')), 'Karim');
    await waitFor(() =>
      expect(listCalls(mock).some((p) => p?.search === 'Karim' && p?.status === 'overdue')).toBe(true),
    );
    await waitFor(() =>
      expect(countCalls(mock).some((p) => p?.search === 'Karim' && p?.status === 'passed')).toBe(true),
    );
  });

  it("filtrlar: indeks, yil, filial (filial o'zgarsa bo'lim tashlanadi); tozalash", async () => {
    setUser(doctor);
    await renderWithProviders(<MedicalScreen />);
    await screen.findByText('Aliyev Vali');
    await fireEvent.press(screen.getByTestId('medical-filters-toggle'));
    await fireEvent.press(screen.getByTestId('medical-filter-index-poor'));
    await fireEvent.press(screen.getByTestId(`medical-filter-year-${YEAR - 1}`));
    await waitFor(() =>
      expect(listCalls(mock).some((p) => p?.health_index === 'poor' && p?.year === YEAR - 1)).toBe(true),
    );
    await fireEvent.press(screen.getByTestId('medical-filter-branch'));
    await fireEvent.press(await screen.findByText('Chorvoq GES'));
    await waitFor(() => expect(listCalls(mock).some((p) => p?.organization_branch_id === 7)).toBe(true));
    await fireEvent.press(screen.getByTestId('medical-filters-reset'));
    await waitFor(() => expect(listCalls(mock).at(-1)).toEqual({ page: 1, size: 20 }));
  });

  it('tafsilot: tarix eng yangisi tepada, bayroqsiz yozuvda tugma yo‘q, yillik indekslar', async () => {
    setUser(doctor);
    await openDetail();
    expect(mock.history.get.some((r) => r.url === MEDICAL_EMPLOYEE(11))).toBe(true);
    const ids = screen.getAllByTestId(/^medical-checkup-\d+$/).map((n) => n.props.testID);
    expect(ids).toEqual(['medical-checkup-102', 'medical-checkup-101']);
    expect(screen.getByText("Sog'lom")).toBeTruthy();
    expect(screen.getByText('Tavsiya: Dam olish')).toBeTruthy();
    expect(screen.getByTestId('medical-checkup-edit-102')).toBeTruthy();
    expect(screen.queryByTestId('medical-checkup-edit-101')).toBeNull();
    expect(screen.queryByTestId('medical-checkup-remove-101')).toBeNull();
    expect(screen.getByText('Yaxshi natija')).toBeTruthy();
    // Kim belgilagani (v2 `set_by_name`).
    expect(screen.getByText('Belgilagan: Toshmatov Bosh')).toBeTruthy();
  });

  it("ko'rik qo'shish: bitta turli doktor — tanlash yo'q, POST (employee_id, bugungi sana, bo'sh matn null)", async () => {
    setUser(doctor);
    await openDetail();
    await fireEvent.press(screen.getByTestId('medical-add-checkup'));
    expect(screen.queryByTestId('medical-specialty-3')).toBeNull();
    await fireEvent.changeText(screen.getByTestId('medical-conclusion'), ' Yaroqli ');
    await fireEvent.press(screen.getByTestId('medical-checkup-save'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(mock.history.post[0]!.url).toBe(MEDICAL_CHECKUPS);
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({
      employee_id: 11,
      checkup_date: TODAY,
      conclusion: 'Yaroqli',
      recommendation: null,
      specialty_id: null,
    });
    // Katalog so'ralmaydi — o'z turi bor.
    expect(mock.history.get.some((r) => r.url === MEDICAL_SPECIALTIES)).toBe(false);
  });

  it("ko'p turli yozuvchi (o'z turi yo'q) — katalogdan tanlash majburiy", async () => {
    setUser({ ...doctor, medical_specialties: [] });
    await openDetail();
    await fireEvent.press(screen.getByTestId('medical-add-checkup'));
    await screen.findByTestId('medical-specialty-4');
    await fireEvent.press(screen.getByTestId('medical-checkup-save'));
    expect(await screen.findByText(i18n.t('medical.specialtyRequired'))).toBeTruthy();
    expect(mock.history.post).toHaveLength(0);
    await fireEvent.press(screen.getByTestId('medical-specialty-4'));
    await fireEvent.press(screen.getByTestId('medical-checkup-save'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data).specialty_id).toBe(4);
  });

  it('tahrir: PATCH qiymatlar bilan; o‘chirish — tasdiq → DELETE, rad etilsa so‘rov yo‘q', async () => {
    setUser(doctor);
    await openDetail();
    await fireEvent.press(screen.getByTestId('medical-checkup-edit-102'));
    await fireEvent.changeText(screen.getByTestId('medical-recommendation'), '');
    await fireEvent.press(screen.getByTestId('medical-checkup-save'));
    await waitFor(() => expect(mock.history.patch).toHaveLength(1));
    expect(JSON.parse(mock.history.patch[0]!.data)).toEqual({
      checkup_date: '2026-02-01',
      conclusion: "Sog'lom",
      recommendation: null,
      specialty_id: 3,
    });

    await screen.findByTestId('medical-checkup-remove-102');
    (confirm as jest.Mock).mockImplementationOnce(() => Promise.resolve(false));
    await fireEvent.press(screen.getByTestId('medical-checkup-remove-102'));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(mock.history.delete).toHaveLength(0);
    await fireEvent.press(screen.getByTestId('medical-checkup-remove-102'));
    await waitFor(() => expect(mock.history.delete).toHaveLength(1));
    expect(mock.history.delete[0]!.url).toBe(MEDICAL_CHECKUP(102));
  });

  it("yillik indeks: noto'g'ri yil so'rovsiz rad; POST (yil son, indeks, izoh)", async () => {
    setUser(doctor);
    await openDetail();
    await fireEvent.press(screen.getByTestId('medical-set-index'));
    await fireEvent.changeText(screen.getByTestId('medical-index-year'), '1990');
    await fireEvent.press(screen.getByTestId('medical-index-save'));
    expect(await screen.findByText(i18n.t('medical.yearInvalid'))).toBeTruthy();
    expect(mock.history.post).toHaveLength(0);
    await fireEvent.changeText(screen.getByTestId('medical-index-year'), String(YEAR));
    await fireEvent.press(screen.getByTestId('medical-index-poor'));
    await fireEvent.changeText(screen.getByTestId('medical-index-note'), 'Nazorat');
    await fireEvent.press(screen.getByTestId('medical-index-save'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(mock.history.post[0]!.url).toBe(MEDICAL_ANNUAL_INDEX);
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({
      employee_id: 11,
      year: YEAR,
      health_index: 'poor',
      index_note: 'Nazorat',
    });
  });

  it('fayllar: http(s) ochiladi, boshqa sxema ochilmaydi; biriktirish (multipart) va olib tashlash (tasdiq)', async () => {
    setUser(doctor);
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///x.pdf', name: 'x.pdf', mimeType: 'application/pdf' }],
    });
    await openDetail();
    await fireEvent.press(screen.getByTestId('medical-file-7'));
    expect(Linking.openURL).toHaveBeenCalledWith('https://minio/tahlil.pdf');
    await fireEvent.press(screen.getByTestId('medical-file-8'));
    expect(Linking.openURL).toHaveBeenCalledTimes(1);
    expect(getToasts().map((x) => x.message)).toContain(i18n.t('medical.fileUnsafe'));

    await fireEvent.press(screen.getByTestId('medical-file-add-102'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(mock.history.post[0]!.url).toBe(MEDICAL_CHECKUP_FILES(102));
    expect(mock.history.post[0]!.data).toBeInstanceOf(FormData);

    await fireEvent.press(screen.getByTestId('medical-file-remove-7'));
    await waitFor(() => expect(mock.history.delete).toHaveLength(1));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(mock.history.delete[0]!.url).toBe(MEDICAL_FILE(7));
  });

  it("huquqsiz ko'ruvchi (can_add/can_set yo'q): qo'shish, indeks va fayl biriktirish tugmalari chizilmaydi", async () => {
    setUser({ ...doctor, medical_specialties: [] });
    mock.onGet(MEDICAL_EMPLOYEE(11)).reply(200, { ...DETAIL, can_add_checkup: false, can_set_annual_index: false });
    await openDetail();
    expect(screen.queryByTestId('medical-add-checkup')).toBeNull();
    expect(screen.queryByTestId('medical-set-index')).toBeNull();
    expect(screen.queryByTestId('medical-file-add-102')).toBeNull();
    // Doktor bo'lmagan — fayl olib tashlash ham yo'q (can_delete bo'lsa ham).
    expect(screen.queryByTestId('medical-file-remove-7')).toBeNull();
    // Ko'rish — ochiq.
    expect(screen.getByTestId('medical-file-7')).toBeTruthy();
  });
});
