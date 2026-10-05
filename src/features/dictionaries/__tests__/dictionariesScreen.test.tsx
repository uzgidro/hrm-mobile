import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import i18n from '@/i18n';
import {
  DICTIONARIES,
  DICTIONARIES_SYNC,
  DICTIONARY_ENTRIES,
  DICTIONARY_ENTRY,
  DICTIONARY_ENTRY_USAGE,
  DICTIONARY_OPTIONS,
} from '@/api/urls';
import DictionariesScreen from '../screens/DictionariesScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));
jest.mock('@/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const hr = {
  id: 2,
  type: 'employee',
  employee: { id: 6, is_multi_org_user: true, multi_org_employee_role: 'hr' },
};
const plain = { id: 3, type: 'employee', employee: { id: 7 } };

const TYPES = [
  {
    id: 1,
    code: 'nationalities',
    name: 'Millatlar',
    name_ru: 'Национальности',
    is_system: true,
    is_editable: true,
    entry_count: 2,
  },
  {
    id: 2,
    code: 'districts',
    name: 'Tumanlar',
    is_system: false,
    is_editable: true,
    parent_type_code: 'regions',
    is_hierarchical: true,
    entry_count: 1,
  },
  { id: 3, code: 'divisions', name: "Bo'limlar", is_editable: false, external_source: 'departments', entry_count: 40 },
  { id: 4, code: 'genders', name: 'Jinslar', is_editable: false, entry_count: 2 },
];
const NAT = [
  { id: 11, code: 'uzbek', name: "O'zbek", name_ru: 'Узбек', sort_order: 1, is_active: true },
  { id: 12, code: 'qozoq', name: 'Qozoq', is_active: false },
];

describe('DictionariesScreen (v2 DictionariesPage)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    (confirm as jest.Mock).mockClear();
    (toast.success as jest.Mock).mockClear();
    (toast.error as jest.Mock).mockClear();
    useAuthStore.setState({ user: hr as never, isAuthenticated: true } as never);
    mock.onGet(DICTIONARIES).reply(200, TYPES);
    mock.onGet(DICTIONARY_ENTRIES('nationalities')).reply(200, { items: NAT, total: 2, pages: 1 });
  });
  afterEach(() => mock.reset());

  it("ro'yxat: soni, belgilar (boshqa modul / o'zgarmas), qidiruv nom/kod bo'yicha mijozda", async () => {
    await renderWithProviders(<DictionariesScreen />);
    expect(await screen.findByText('Millatlar')).toBeTruthy();
    expect(screen.getByTestId('dict-types-count')).toHaveTextContent("4 ta ma'lumotnoma");
    expect(screen.getByText('Национальности · 2 ta yozuv')).toBeTruthy();
    expect(screen.getByText('Boshqa moduldan olinadi')).toBeTruthy();
    expect(screen.getAllByText("O'zgarmas")).toHaveLength(1);
    await fireEvent.changeText(screen.getByPlaceholderText("Ma'lumotnoma izlash…"), 'DISTR');
    expect(screen.queryByText('Millatlar')).toBeNull();
    expect(screen.getByText('Tumanlar')).toBeTruthy();
    expect(mock.history.get.filter((r) => r.url === DICTIONARIES)).toHaveLength(1);
  });

  it("yozuvlar: server qidiruvi va holat filtri, sahifa 25; orqaga — ro'yxat", async () => {
    await renderWithProviders(<DictionariesScreen />);
    await fireEvent.press(await screen.findByTestId('dict-type-nationalities'));
    expect(await screen.findByText("O'zbek")).toBeTruthy();
    expect(screen.getByText('Узбек · uzbek')).toBeTruthy();
    expect(screen.getAllByText('Faolsiz')).toHaveLength(2); // holat chipi + qator nishoni
    expect(screen.getByTestId('dict-head')).toHaveTextContent('Tizim', { exact: false });
    expect(mock.history.get.find((r) => r.url === DICTIONARY_ENTRIES('nationalities'))?.params).toEqual({
      page: 1,
      size: 25,
    });
    await fireEvent.press(screen.getByTestId('dict-status-inactive'));
    await waitFor(() =>
      expect(mock.history.get.filter((r) => r.url === DICTIONARY_ENTRIES('nationalities')).at(-1)?.params).toEqual({
        page: 1,
        size: 25,
        is_active: false,
      }),
    );
    await fireEvent.press(screen.getByTestId('dict-back'));
    expect(await screen.findByTestId('dict-types-count')).toBeTruthy();
  });

  it('yangi yozuv: nom majburiy; kod bo‘sh — yuborilmaydi; tana v2 bilan aynan; ro‘yxat yangilanadi', async () => {
    mock.onPost(DICTIONARY_ENTRIES('nationalities')).reply(200, { id: 13 });
    await renderWithProviders(<DictionariesScreen />);
    await fireEvent.press(await screen.findByTestId('dict-type-nationalities'));
    await fireEvent.press(await screen.findByTestId('dict-entry-new'));
    await fireEvent.press(await screen.findByTestId('dict-form-save'));
    expect(screen.getByTestId('dict-form-error')).toHaveTextContent('Nom kiritilishi shart');
    await fireEvent.changeText(screen.getByTestId('dict-form-name'), ' Tojik ');
    await fireEvent.changeText(screen.getByTestId('dict-form-name-ru'), 'Таджик');
    await fireEvent.press(screen.getByTestId('dict-form-save'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({
      name: 'Tojik',
      name_ru: 'Таджик',
      description: null,
      parent_id: null,
      sort_order: 0,
      is_active: true,
    });
    await waitFor(() => expect(mock.history.get.filter((r) => r.url === DICTIONARIES).length).toBeGreaterThan(1));
  });

  it('tahrir (PUT) va o‘chirish: bog‘liqlik tasdiq matnida; server 409 — toast, rad etilsa so‘rov yo‘q', async () => {
    mock.onPut(DICTIONARY_ENTRY(11)).reply(200, {});
    mock.onGet(DICTIONARY_ENTRY_USAGE(11)).reply(200, {
      entry_id: 11,
      used: true,
      refs: [{ label: 'Xodimlar', count: 4, sample: ['Ali', 'Vali', 'Soli', 'Gani'] }],
    });
    mock
      .onDelete(DICTIONARY_ENTRY(11))
      .reply(409, { code: 'conflict', detail: "Bu yozuv ishlatilmoqda, o'chirib bo'lmaydi" });
    await renderWithProviders(<DictionariesScreen />);
    await fireEvent.press(await screen.findByTestId('dict-type-nationalities'));
    await fireEvent.press(await screen.findByTestId('dict-entry-11'));
    expect(await screen.findByTestId('dict-entry-code')).toHaveTextContent('uzbek');
    await fireEvent.press(screen.getByTestId('dict-entry-edit'));
    await fireEvent.changeText(await screen.findByTestId('dict-form-sort'), '3');
    await fireEvent(screen.getByTestId('dict-form-active'), 'valueChange', false);
    await fireEvent.press(screen.getByTestId('dict-form-save'));
    await waitFor(() => expect(mock.history.put).toHaveLength(1));
    expect(JSON.parse(mock.history.put[0]!.data)).toEqual({
      name: "O'zbek",
      name_ru: 'Узбек',
      description: null,
      parent_id: null,
      sort_order: 3,
      is_active: false,
      code: 'uzbek',
    });

    (confirm as jest.Mock).mockResolvedValueOnce(false);
    await fireEvent.press(await screen.findByTestId('dict-entry-11'));
    await fireEvent.press(await screen.findByTestId('dict-entry-delete'));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect((confirm as jest.Mock).mock.calls[0][0]).toMatchObject({ destructive: true });
    expect((confirm as jest.Mock).mock.calls[0][0].message).toContain('Xodimlar — 4 (Ali, Vali, Soli…)');
    expect(mock.history.delete).toHaveLength(0);

    await fireEvent.press(screen.getByTestId('dict-entry-delete'));
    await waitFor(() => expect(mock.history.delete.map((r) => r.url)).toEqual([DICTIONARY_ENTRY(11)]));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Bu yozuv ishlatilmoqda, o'chirib bo'lmaydi"));
  });

  it("ierarxik: tegishli filtri ota ma'lumotnomadan; formada tegishli tanlanadi", async () => {
    mock.onGet(DICTIONARY_OPTIONS('regions')).reply(200, [
      { id: 21, code: 'toshkent', name: 'Toshkent' },
      { id: 22, code: 'samarqand', name: 'Samarqand' },
    ]);
    mock.onGet(DICTIONARY_ENTRIES('districts')).reply(200, {
      items: [
        { id: 31, code: 'chilonzor', name: 'Chilonzor', parent_id: 21, parent_name: 'Toshkent', is_active: true },
      ],
      total: 1,
      pages: 1,
    });
    mock.onPost(DICTIONARY_ENTRIES('districts')).reply(200, { id: 32 });
    await renderWithProviders(<DictionariesScreen />);
    await fireEvent.press(await screen.findByTestId('dict-type-districts'));
    expect(await screen.findByText('Toshkent · chilonzor')).toBeTruthy();
    await fireEvent.press(await screen.findByTestId('dict-parent-filter'));
    await fireEvent.press((await screen.findAllByText('Samarqand')).at(-1)!);
    await waitFor(() =>
      expect(mock.history.get.filter((r) => r.url === DICTIONARY_ENTRIES('districts')).at(-1)?.params).toEqual({
        page: 1,
        size: 25,
        parent_id: 22,
      }),
    );
    await fireEvent.press(screen.getByTestId('dict-entry-new'));
    await fireEvent.changeText(await screen.findByTestId('dict-form-name'), 'Urgut');
    await fireEvent.press(screen.getByTestId('dict-form-parent'));
    await fireEvent.press((await screen.findAllByText('Samarqand')).at(-1)!);
    await fireEvent.press(screen.getByTestId('dict-form-save'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data)).toMatchObject({ name: 'Urgut', parent_id: 22 });
  });

  it("tashqi manba va o'zgarmas: hech kimga yozilmaydi, holat filtri tashqida yo'q", async () => {
    mock.onGet(DICTIONARY_ENTRIES('divisions')).reply(200, {
      items: [{ id: 5, code: '5', name: 'Kadrlar', is_external: true, is_active: true }],
      total: 1,
      pages: 1,
    });
    await renderWithProviders(<DictionariesScreen />);
    await fireEvent.press(await screen.findByTestId('dict-type-divisions'));
    expect(await screen.findByText('Kadrlar')).toBeTruthy();
    expect(screen.getByTestId('dict-read-only')).toHaveTextContent('boshqa moduldan olinadi', { exact: false });
    expect(screen.queryByTestId('dict-entry-new')).toBeNull();
    expect(screen.queryByTestId('dict-status-all')).toBeNull();
    await fireEvent.press(screen.getByTestId('dict-entry-5'));
    expect(screen.queryByTestId('dict-entry-edit')).toBeNull();
  });

  it("oddiy xodim: o'qiydi, lekin qo'shish/tahrir/o'chirish va «Tekshirish» yo'q", async () => {
    useAuthStore.setState({ user: plain as never } as never);
    await renderWithProviders(<DictionariesScreen />);
    expect(await screen.findByText('Millatlar')).toBeTruthy();
    expect(screen.queryByTestId('dict-sync')).toBeNull();
    await fireEvent.press(screen.getByTestId('dict-type-nationalities'));
    expect(await screen.findByText("O'zbek")).toBeTruthy();
    expect(screen.getByTestId('dict-read-only')).toHaveTextContent("Ko'rish rejimi", { exact: false });
    expect(screen.queryByTestId('dict-entry-new')).toBeNull();
    await fireEvent.press(screen.getByTestId('dict-entry-11'));
    expect(await screen.findByTestId('dict-entry-code')).toBeTruthy();
    expect(screen.queryByTestId('dict-entry-delete')).toBeNull();
  });

  it('«Tekshirish» — tasdiq bilan; natija toastda', async () => {
    mock.onPost(DICTIONARIES_SYNC).reply(200, { types_created: 1, entries_created: 5 });
    await renderWithProviders(<DictionariesScreen />);
    await fireEvent.press(await screen.findByTestId('dict-sync'));
    await waitFor(() => expect(mock.history.post.map((r) => r.url)).toEqual([DICTIONARIES_SYNC]));
    expect(confirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("1 ta ma'lumotnoma, 5 ta yozuv qo'shildi"));
  });
});
