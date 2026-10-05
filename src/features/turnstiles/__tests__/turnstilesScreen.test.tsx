import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor, act } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import { confirm } from '@/lib/confirm';
import i18n from '@/i18n';
import {
  HIK_SYNC_ACCESS_LISTS,
  HIK_SYNC_DEVICES,
  HIK_SYNC_DOORS,
  ISAPI_DEVICES,
  ISAPI_DEVICE_CREDENTIALS,
  ISAPI_DEVICE_TEST,
  LOCATIONS_LIST,
  ORGANIZATION_BRANCHES,
  TURNSTILE,
  TURNSTILES,
  TURNSTILE_DOOR,
  TURNSTILE_DOORS,
} from '@/api/urls';
import TurnstilesScreen from '../screens/TurnstilesScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));

const master = { id: 2, type: 'master-admin', employee: { id: 6 } };
const akt = { id: 3, type: 'employee', employee: { id: 7 }, akt_branch_ids: [2] };

const TURNSTILE_ROWS = [
  {
    id: 1,
    acs_dev_index_code: 'A1',
    acs_dev_name: 'Kirish-1',
    acs_dev_ip: '10.0.0.5',
    acs_dev_port: 80,
    treaty_type: 'HikCentral',
    status: '1',
    locations: [{ id: 11, name: 'Asosiy darvoza' }],
  },
  {
    id: 2,
    acs_dev_index_code: 'B7',
    acs_dev_name: 'Terminal-2',
    display_name: 'Orqa terminal',
    acs_dev_ip: '10.2.90.6',
    acs_dev_port: 80,
    treaty_type: 'ISAPI',
    status: '0',
    locations: [],
  },
];

describe('TurnstilesScreen (v2 TurnstilesPage)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    (confirm as jest.Mock).mockClear();
    useAuthStore.setState({ user: master as never, isAuthenticated: true } as never);
    mock.onGet(TURNSTILES).reply(200, TURNSTILE_ROWS);
    mock.onGet(LOCATIONS_LIST).reply((cfg) => [
      200,
      cfg.params?.organization_branch_id === 3
        ? [{ id: 21, name: 'Farhod kirish' }]
        : [
            { id: 11, name: 'Asosiy darvoza' },
            { id: 12, name: 'Orqa darvoza' },
          ],
    ]);
    mock.onGet(ORGANIZATION_BRANCHES).reply(200, [{ id: 3, name: 'Farhod GES' }]);
  });
  afterEach(() => mock.reset());

  it("ro'yxat: holat, «1 / 2 onlayn», IP · manzillar; qidiruv serverda (debounce)", async () => {
    jest.useFakeTimers();
    try {
      await renderWithProviders(<TurnstilesScreen />);
      expect(await screen.findByText('Kirish-1')).toBeTruthy();
      expect(screen.getByText('Orqa terminal')).toBeTruthy();
      expect(screen.getByText('10.0.0.5 · Asosiy darvoza')).toBeTruthy();
      expect(screen.getByTestId('turnstile-status-1')).toHaveTextContent('Onlayn');
      expect(screen.getByTestId('turnstile-status-2')).toHaveTextContent('Oflayn');
      expect(screen.getByTestId('turnstiles-online')).toHaveTextContent('1 / 2 onlayn');
      expect(mock.history.get.find((r) => r.url === TURNSTILES)!.params).toEqual({});

      await fireEvent.changeText(screen.getByPlaceholderText("Nomi, IP yoki kod bo'yicha qidirish"), ' 10.2 ');
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      await waitFor(() =>
        expect(mock.history.get.filter((r) => r.url === TURNSTILES).map((r) => r.params)).toContainEqual({
          search: '10.2',
        }),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('varaq: ma’lumot; o‘chirish — tasdiq bilan; tahrir — indeks kodi majburiy, maxfiy maydonlar yuborilmaydi', async () => {
    mock.onDelete(TURNSTILE(1)).reply(200, {});
    mock.onPatch(TURNSTILE(1)).reply(200, TURNSTILE_ROWS[0]);
    await renderWithProviders(<TurnstilesScreen />);
    await fireEvent.press(await screen.findByTestId('turnstile-row-1'));
    expect(await screen.findByTestId('turnstile-code')).toHaveTextContent('A1');
    expect(screen.getByTestId('turnstile-locations')).toHaveTextContent('Asosiy darvoza');
    // HikCentral turniketida «Terminal» tabi yo'q.
    expect(screen.queryByText('Terminal')).toBeNull();

    await fireEvent.press(screen.getByTestId('turnstile-delete'));
    await waitFor(() => expect(mock.history.delete.map((r) => r.url)).toEqual([TURNSTILE(1)]));
    expect(confirm).toHaveBeenLastCalledWith(
      expect.objectContaining({
        destructive: true,
        message: "«Kirish-1» o'chiriladi. Undan kelgan eski yozuvlar saqlanib qoladi.",
      }),
    );

    await fireEvent.press(await screen.findByTestId('turnstile-row-1'));
    await fireEvent.press(await screen.findByTestId('turnstile-edit'));
    await fireEvent.changeText(await screen.findByTestId('turnstile-form-code'), ' ');
    await fireEvent.press(screen.getByTestId('turnstile-form-save'));
    expect(screen.getByTestId('turnstile-form-error')).toHaveTextContent('Indeks kodini kiriting');
    await fireEvent.changeText(screen.getByTestId('turnstile-form-code'), 'A2');
    await fireEvent.press(screen.getByTestId('turnstile-form-treaty-ISAPI'));
    await fireEvent.press(screen.getByTestId('turnstile-form-save'));
    await waitFor(() => expect(mock.history.patch).toHaveLength(1));
    const body = JSON.parse(mock.history.patch[0]!.data);
    expect(body).toEqual({
      acs_dev_index_code: 'A2',
      acs_dev_name: 'Kirish-1',
      acs_dev_ip: '10.0.0.5',
      acs_dev_port: 80,
      acs_dev_code: null,
      treaty_type: 'ISAPI',
      location_ids: [11],
    });
    expect(body).not.toHaveProperty('event_token');
    expect(body).not.toHaveProperty('rtsp_stream_url');
  });

  it('server xatosi formada tarjima bilan (turnstile_index_code_exists)', async () => {
    mock.onPost(TURNSTILES).reply(400, { code: 'turnstile_index_code_exists', detail: 'exists' });
    await renderWithProviders(<TurnstilesScreen />);
    await fireEvent.press(await screen.findByTestId('turnstile-new'));
    await fireEvent.changeText(await screen.findByTestId('turnstile-form-code'), 'A1');
    await fireEvent.changeText(screen.getByTestId('turnstile-form-name'), 'Yangi');
    await fireEvent.press(screen.getByTestId('turnstile-form-locations'));
    await fireEvent.press(await screen.findByText('Orqa darvoza'));
    await fireEvent.press(screen.getByTestId('turnstile-form-save'));
    expect(await screen.findByText('Ushbu kodli turniket allaqachon mavjud')).toBeTruthy();
    expect(JSON.parse(mock.history.post[0]!.data).location_ids).toEqual([12]);
  });

  it("eshiklar: yo'nalish darhol (tasdiq bilan), belgilanmagani ogohlantiriladi; yangi eshik; o'chirish — tasdiq bilan", async () => {
    mock.onGet(TURNSTILE_DOORS).reply(200, [
      { id: 31, door_name: 'Kirish eshigi', door_no: '1', door_index_code: 'D1', direction_type: 'entrance' },
      { id: 32, door_no: '2', door_index_code: 'D2', direction_type: null },
    ]);
    mock.onPatch(TURNSTILE_DOOR(31)).reply(200, {});
    mock.onPost(TURNSTILE_DOORS).reply(200, { id: 33 });
    mock.onDelete(TURNSTILE_DOOR(32)).reply(200, {});
    await renderWithProviders(<TurnstilesScreen />);
    await fireEvent.press(await screen.findByTestId('turnstile-row-1'));
    await fireEvent.press(await screen.findByText('Eshiklar'));
    expect(await screen.findByText('Kirish eshigi')).toBeTruthy();
    expect(screen.getByText('Eshik #2')).toBeTruthy();
    expect(screen.getByTestId('door-unset-32')).toBeTruthy();
    expect(screen.queryByTestId('door-unset-31')).toBeNull();
    expect(mock.history.get.find((r) => r.url === TURNSTILE_DOORS)!.params).toEqual({ turnstile_id: 1 });

    await fireEvent.press(screen.getAllByText('Chiqish')[0]!);
    await waitFor(() => expect(mock.history.patch).toHaveLength(1));
    expect(mock.history.patch[0]!.url).toBe(TURNSTILE_DOOR(31));
    expect(JSON.parse(mock.history.patch[0]!.data)).toEqual({ direction_type: 'exit' });

    await fireEvent.press(screen.getByTestId('door-add'));
    await fireEvent.press(await screen.findByTestId('door-form-save'));
    expect(screen.getByTestId('door-form-error')).toHaveTextContent('Eshik kodini kiriting');
    await fireEvent.changeText(screen.getByTestId('door-form-code'), 'D3');
    await fireEvent.press(screen.getByTestId('door-form-save'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({
      turnstile_id: 1,
      door_index_code: 'D3',
      acs_dev_index_code: 'A1',
      door_no: null,
      door_name: null,
      direction_type: 'entrance',
    });

    await fireEvent.press(screen.getByTestId('door-delete-32'));
    await waitFor(() => expect(mock.history.delete.map((r) => r.url)).toEqual([TURNSTILE_DOOR(32)]));
    expect(confirm).toHaveBeenLastCalledWith(expect.objectContaining({ destructive: true }));
  });

  it("ISAPI terminal: sinov; hisob — login serverdan, parol bo'sh (null), maydon yashirin", async () => {
    mock.onGet(ISAPI_DEVICES).reply(200, [{ id: 2, username: 'operator', ip: '10.2.90.6' }]);
    mock.onPost(ISAPI_DEVICE_TEST(2)).reply(200, { online: true, model: 'DS-K1T', firmware_version: 'V3' });
    mock.onPatch(ISAPI_DEVICE_CREDENTIALS(2)).reply(200, { status: 'ok' });
    await renderWithProviders(<TurnstilesScreen />);
    await fireEvent.press(await screen.findByTestId('turnstile-row-2'));
    await fireEvent.press(await screen.findByText('Terminal'));
    expect(await screen.findByTestId('isapi-address')).toHaveTextContent('10.2.90.6:80');
    await waitFor(() => expect(screen.getByTestId('isapi-login').props.value).toBe('operator'));
    expect(screen.getByTestId('isapi-password').props.secureTextEntry).toBe(true);
    expect(screen.getByTestId('isapi-password').props.value).toBe('');

    await fireEvent.press(screen.getByTestId('isapi-test'));
    await waitFor(() => expect(mock.history.post.map((r) => r.url)).toEqual([ISAPI_DEVICE_TEST(2)]));
    // Qurilmaga boradigan so'rovda mijoz muddati yo'q (v2 REACHES_HARDWARE).
    expect(mock.history.post[0]!.timeout).toBe(0);

    await fireEvent.press(screen.getByTestId('isapi-save-creds'));
    await waitFor(() => expect(mock.history.patch).toHaveLength(1));
    expect(JSON.parse(mock.history.patch[0]!.data)).toEqual({ username: 'operator', password: null });
  });

  it("ISAPI terminalini qo'shish: IP → parol → manzil; filial almashsa manzillar tozalanadi; filial tanaga kirmaydi", async () => {
    mock.onPost(ISAPI_DEVICES).reply(200, { id: 9 });
    await renderWithProviders(<TurnstilesScreen />);
    await fireEvent.press(await screen.findByTestId('isapi-new'));
    await fireEvent.press(await screen.findByTestId('isapi-form-save'));
    expect(screen.getByTestId('isapi-form-error')).toHaveTextContent('Qurilma IP manzilini kiriting');
    await fireEvent.changeText(screen.getByTestId('isapi-form-ip'), '10.2.90.7');
    await fireEvent.press(screen.getByTestId('isapi-form-save'));
    expect(screen.getByTestId('isapi-form-error')).toHaveTextContent('Terminal parolini kiriting');
    await fireEvent.changeText(screen.getByTestId('isapi-form-password'), 'Secret1');
    expect(screen.getByTestId('isapi-form-password').props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByTestId('isapi-form-save'));
    expect(screen.getByTestId('isapi-form-error')).toHaveTextContent('Kamida bitta manzilni tanlang');

    await fireEvent.press(screen.getByTestId('isapi-form-branch'));
    await fireEvent.press(await screen.findByText('Farhod GES'));
    await fireEvent.press(screen.getByTestId('isapi-form-locations'));
    await fireEvent.press(await screen.findByText('Farhod kirish'));
    await fireEvent.press(screen.getByText(/^Tayyor/));
    await fireEvent.press(screen.getByText('Chiqish'));
    await fireEvent.press(screen.getByTestId('isapi-form-save'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({
      ip: '10.2.90.7',
      port: 80,
      name: null,
      direction_type: 'exit',
      location_ids: [21],
      username: 'admin',
      password: 'Secret1',
    });
  });

  it("HikCentral sinxroni: global admin — tasdiq bilan, ketma-ket uch qadam; AKT xodimiga tugma yo'q", async () => {
    mock
      .onGet(HIK_SYNC_ACCESS_LISTS)
      .reply(200, [{ id: 4, privilege_group_name: 'Bosh bino', privilege_group_id: '17' }]);
    mock.onPost(HIK_SYNC_DEVICES).reply(200, {});
    mock.onPost(HIK_SYNC_DOORS).reply(200, {});
    mock.onPost(HIK_SYNC_ACCESS_LISTS).reply(200, {});
    await renderWithProviders(<TurnstilesScreen />);
    await fireEvent.press(await screen.findByTestId('turnstile-sync'));
    expect(await screen.findByText('Bosh bino')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('hik-sync-run'));
    await waitFor(() =>
      expect(mock.history.post.map((r) => r.url)).toEqual([HIK_SYNC_DEVICES, HIK_SYNC_DOORS, HIK_SYNC_ACCESS_LISTS]),
    );
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it("AKT xodimi: sinxron tugmasi o'rniga izoh; oddiy xodim — «Ruxsat yo'q», so'rov yo'q", async () => {
    mock.onGet(HIK_SYNC_ACCESS_LISTS).reply(200, []);
    useAuthStore.setState({ user: akt as never } as never);
    const view = await renderWithProviders(<TurnstilesScreen />);
    await fireEvent.press(await screen.findByTestId('turnstile-sync'));
    expect(await screen.findByTestId('hik-sync-global-only')).toBeTruthy();
    expect(screen.queryByTestId('hik-sync-run')).toBeNull();
    view.unmount();

    mock.resetHistory();
    useAuthStore.setState({ user: { id: 9, type: 'employee', employee: { id: 1 } } as never } as never);
    await renderWithProviders(<TurnstilesScreen />);
    expect(await screen.findByText("Bu bo'lim faqat tizim administratori uchun.")).toBeTruthy();
    expect(mock.history.get).toHaveLength(0);
  });
});
