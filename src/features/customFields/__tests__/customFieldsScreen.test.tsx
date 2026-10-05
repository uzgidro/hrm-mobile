import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import { confirm } from '@/lib/confirm';
import i18n from '@/i18n';
import {
  CUSTOM_FIELD,
  CUSTOM_FIELDS,
  CUSTOM_FIELDS_META,
  CUSTOM_FIELD_GROUP,
  CUSTOM_FIELD_GROUPS,
  DICTIONARIES,
} from '@/api/urls';
import CustomFieldsScreen from '../screens/CustomFieldsScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));

const master = { id: 2, type: 'master-admin', employee: { id: 6 } };
const akt = { id: 3, type: 'employee', employee: { id: 7 }, akt_branch_ids: [2] };

const META = {
  entity_types: [
    { value: 'employee', label: 'Xodim' },
    { value: 'department', label: "Bo'lim" },
  ],
  field_types: [
    { value: 'text', label: 'Matn' },
    { value: 'select', label: "Ro'yxatdan bittasi" },
    { value: 'dictionary', label: "Ma'lumotnomadan" },
    { value: 'number', label: 'Son' },
  ],
};
const GROUPS = [
  {
    id: 1,
    title: 'Harbiy hisob',
    entity_type: 'employee',
    description: 'Harbiy xizmat',
    is_active: true,
    fields: [
      {
        id: 11,
        group_id: 1,
        key: 'harbiy_unvon',
        label: 'Harbiy unvon',
        field_type: 'select',
        is_required: true,
        show_in_list: true,
        is_active: true,
        options: [{ value: 'Leytenant', label: 'Leytenant' }],
        position: 0,
      },
      {
        id: 12,
        group_id: 1,
        key: 'millat',
        label: 'Millat',
        field_type: 'dictionary',
        dictionary_type_code: 'nationalities',
        is_active: false,
      },
    ],
  },
  { id: 2, title: 'Eski', entity_type: 'employee', is_active: false, fields: [] },
];

describe('CustomFieldsScreen (v2 CustomFieldsPage)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    (confirm as jest.Mock).mockClear();
    useAuthStore.setState({ user: master as never, isAuthenticated: true } as never);
    mock.onGet(CUSTOM_FIELDS_META).reply(200, META);
    mock.onGet(CUSTOM_FIELD_GROUPS).reply((cfg) => [200, cfg.params.entity_type === 'employee' ? GROUPS : []]);
    mock.onGet(DICTIONARIES).reply(200, [{ id: 4, code: 'nationalities', name: 'Millatlar' }]);
  });
  afterEach(() => mock.reset());

  it("guruhlar va maydonlar: o'chirilganlari ham (only_active=false), nishonlar; obyekt turi almashsa qayta so'rov", async () => {
    await renderWithProviders(<CustomFieldsScreen />);
    expect(await screen.findByText('Harbiy hisob')).toBeTruthy();
    expect(screen.getByTestId('cf-count')).toHaveTextContent("2 ta bo'lim");
    // Majburiy «*» — nomdan tashqarida (nom qisqarganda ham ko'rinadi).
    expect(screen.getByText('Harbiy unvon')).toBeTruthy();
    expect(screen.getByLabelText('Majburiy maydon')).toHaveTextContent('*');
    expect(screen.getByText('harbiy_unvon')).toBeTruthy();
    expect(screen.getByText("Ro'yxatdan bittasi")).toBeTruthy();
    expect(screen.getByText("Ro'yxatda")).toBeTruthy();
    expect(screen.getAllByText("O'chirilgan")).toHaveLength(2);
    expect(screen.getByText("Bu bo'limda maydon yo'q")).toBeTruthy();
    expect(mock.history.get.find((r) => r.url === CUSTOM_FIELD_GROUPS)?.params).toEqual({
      entity_type: 'employee',
      only_active: false,
    });

    await fireEvent.press(screen.getByText("Bo'lim"));
    expect(await screen.findByText("Qo'shimcha maydon yo'q")).toBeTruthy();
    expect(mock.history.get.filter((r) => r.url === CUSTOM_FIELD_GROUPS).map((r) => r.params.entity_type)).toEqual([
      'employee',
      'department',
    ]);
  });

  it("yangi bo'lim: nom majburiy; entity_type joriy tanlovdan", async () => {
    mock.onPost(CUSTOM_FIELD_GROUPS).reply(201, { id: 3 });
    await renderWithProviders(<CustomFieldsScreen />);
    await screen.findByText('Harbiy hisob');
    await fireEvent.press(screen.getByText("Bo'lim"));
    await fireEvent.press(await screen.findByTestId('cf-group-new'));
    await fireEvent.press(await screen.findByTestId('cf-group-save'));
    expect(screen.getByTestId('cf-group-error')).toHaveTextContent("Bo'lim nomini kiriting");
    await fireEvent.changeText(screen.getByTestId('cf-group-title'), ' Malaka ');
    await fireEvent.press(screen.getByTestId('cf-group-save'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({
      title: 'Malaka',
      entity_type: 'department',
      description: null,
      is_active: true,
    });
  });

  it("bo'lim varag'i: tahrir (entity_type yuborilmaydi), o'chirish — tasdiq bilan, rad etilsa so'rov yo'q", async () => {
    mock.onPatch(CUSTOM_FIELD_GROUP(1)).reply(200, {});
    mock.onDelete(CUSTOM_FIELD_GROUP(1)).reply(204);
    await renderWithProviders(<CustomFieldsScreen />);
    await fireEvent.press(await screen.findByTestId('cf-group-row-1'));
    await fireEvent.press(await screen.findByTestId('cf-group-edit'));
    await fireEvent(screen.getByTestId('cf-group-active'), 'valueChange', false);
    await fireEvent.press(screen.getByTestId('cf-group-save'));
    await waitFor(() => expect(mock.history.patch).toHaveLength(1));
    expect(JSON.parse(mock.history.patch[0]!.data)).toEqual({
      title: 'Harbiy hisob',
      description: 'Harbiy xizmat',
      is_active: false,
    });

    (confirm as jest.Mock).mockResolvedValueOnce(false);
    await fireEvent.press(await screen.findByTestId('cf-group-row-1'));
    await fireEvent.press(await screen.findByTestId('cf-group-delete'));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(mock.history.delete).toHaveLength(0);
    await fireEvent.press(screen.getByTestId('cf-group-delete'));
    await waitFor(() => expect(mock.history.delete.map((r) => r.url)).toEqual([CUSTOM_FIELD_GROUP(1)]));
    expect(confirm).toHaveBeenLastCalledWith(
      expect.objectContaining({ destructive: true, message: "«Harbiy hisob» va undagi barcha maydonlar o'chiriladi." }),
    );
  });

  it('yangi maydon: kalit nomdan, tanlov turi variantsiz — xato; tana v2 bilan aynan', async () => {
    mock.onPost(CUSTOM_FIELDS).reply(201, { id: 13 });
    await renderWithProviders(<CustomFieldsScreen />);
    await fireEvent.press(await screen.findByTestId('cf-group-row-1'));
    await fireEvent.press(await screen.findByTestId('cf-group-add-field'));
    await fireEvent.changeText(await screen.findByTestId('cf-field-label'), 'Ish o‘rni');
    expect(screen.getByTestId('cf-field-key').props.value).toBe('ish_orni');
    await fireEvent.press(screen.getByTestId('cf-field-type-select'));
    await fireEvent.press(screen.getByTestId('cf-field-save'));
    expect(screen.getByTestId('cf-field-error')).toHaveTextContent('Kamida bitta variant kiriting');
    await fireEvent.changeText(screen.getByTestId('cf-field-options'), 'Asosiy\nQo‘shimcha');
    await fireEvent(screen.getByTestId('cf-field-required'), 'valueChange', true);
    await fireEvent.press(screen.getByTestId('cf-field-save'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({
      group_id: 1,
      key: 'ish_orni',
      label: 'Ish o‘rni',
      field_type: 'select',
      is_required: true,
      show_in_list: false,
      is_active: true,
      help_text: null,
      options: [
        { value: 'Asosiy', label: 'Asosiy' },
        { value: 'Qo‘shimcha', label: 'Qo‘shimcha' },
      ],
      dictionary_type_code: null,
      min_value: null,
      max_value: null,
      position: 0,
    });
  });

  it("maydon varag'i: tafsilot; tahrir — kalit qulf, group_id yo'q; server xatosi formada; o'chirish — tasdiq", async () => {
    mock.onPatch(CUSTOM_FIELD(12)).reply(422, { detail: "Ma'lumotnoma topilmadi: x" });
    mock.onDelete(CUSTOM_FIELD(12)).reply(204);
    await renderWithProviders(<CustomFieldsScreen />);
    await fireEvent.press(await screen.findByTestId('cf-field-row-12'));
    await waitFor(() => expect(screen.getByTestId('cf-field-dictionary')).toHaveTextContent('Millatlar'));
    expect(screen.getByTestId('cf-field-type')).toHaveTextContent("Ma'lumotnomadan");
    await fireEvent.press(screen.getByTestId('cf-field-edit'));
    expect(await screen.findByTestId('cf-field-key-locked')).toHaveTextContent('millat');
    expect(screen.queryByTestId('cf-field-key')).toBeNull();
    await waitFor(() => expect(screen.getByTestId('cf-field-dictionary')).toHaveTextContent('Millatlar'));
    await fireEvent.press(screen.getByTestId('cf-field-save'));
    expect(await screen.findByText("Ma'lumotnoma topilmadi: x")).toBeTruthy();
    const body = JSON.parse(mock.history.patch[0]!.data);
    expect(body).toMatchObject({
      key: 'millat',
      field_type: 'dictionary',
      dictionary_type_code: 'nationalities',
      is_active: false,
    });
    expect('group_id' in body).toBe(false);

    await fireEvent.press(screen.getByTestId('cf-field-row-12'));
    await fireEvent.press(await screen.findByTestId('cf-field-delete'));
    await waitFor(() => expect(mock.history.delete.map((r) => r.url)).toEqual([CUSTOM_FIELD(12)]));
    expect(confirm).toHaveBeenLastCalledWith(
      expect.objectContaining({
        destructive: true,
        message: "«Millat» maydoni va unga kiritilgan qiymatlar o'chiriladi.",
      }),
    );
  });

  it("AKT xodimi (kadr emas): faqat ko'rish — qo'shish, tahrir, o'chirish chizilmaydi", async () => {
    useAuthStore.setState({ user: akt as never } as never);
    await renderWithProviders(<CustomFieldsScreen />);
    expect(await screen.findByTestId('cf-read-only')).toBeTruthy();
    expect(screen.queryByTestId('cf-group-new')).toBeNull();
    await fireEvent.press(await screen.findByTestId('cf-group-row-1'));
    expect(screen.queryByTestId('cf-group-edit')).toBeNull();
    await fireEvent.press(screen.getByTestId('cf-field-row-11'));
    expect(await screen.findByTestId('cf-field-key')).toHaveTextContent('harbiy_unvon');
    expect(screen.queryByTestId('cf-field-edit')).toBeNull();
    expect(screen.queryByTestId('cf-field-delete')).toBeNull();
  });

  it("oddiy xodim — «Ruxsat yo'q» (v2 RequireRole), so'rov yo'q", async () => {
    useAuthStore.setState({ user: { id: 9, type: 'employee', employee: { id: 1 } } as never } as never);
    await renderWithProviders(<CustomFieldsScreen />);
    expect(await screen.findByText("Bu bo'lim faqat tizim administratorlari uchun.")).toBeTruthy();
    expect(mock.history.get).toHaveLength(0);
  });
});
