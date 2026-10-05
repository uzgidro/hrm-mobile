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

/** Screen ScrollView'ining `refreshControl` elementi (RNTL 14 da UNSAFE_getByType yo'q). */
function refreshControl(): { props: { refreshing: boolean; onRefresh: () => void } } {
  type Node = { props?: Record<string, unknown>; children?: unknown[] };
  const walk = (n: Node): Node | null => {
    if (n.props?.refreshControl) return n.props.refreshControl as Node;
    for (const c of n.children ?? []) {
      if (c && typeof c === 'object') {
        const hit = walk(c as Node);
        if (hit) return hit;
      }
    }
    return null;
  };
  const hit = walk(screen.getByTestId('turnstiles-screen') as unknown as Node);
  if (!hit) throw new Error('refreshControl topilmadi');
  return hit as never;
}

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
      expect(mock.history.get.find((r) => r.url === TURNSTILES)!.params).toEqual({ page: 1, size: 50 });

      await fireEvent.changeText(screen.getByPlaceholderText("Nomi, IP yoki kod bo'yicha qidirish"), ' 10.2 ');
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      await waitFor(() =>
        expect(mock.history.get.filter((r) => r.url === TURNSTILES).map((r) => r.params)).toContainEqual({
          page: 1,
          size: 50,
          search: '10.2',
        }),
      );
      // Qidiruv/debounce qayta so'rovi pull-to-refresh spinnerini yoqmaydi — u faqat tortilganda.
      expect(refreshControl().props.refreshing).toBe(false);
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

  it("server sahifalash 50 tadan: onlayn soni joriy sahifa bo'yicha deb yoziladi; oxirgi sahifa bo'shasa — oldingisiga", async () => {
    let deleted = false;
    const page1 = Array.from({ length: 50 }, (_, i) => ({
      id: 100 + i,
      acs_dev_index_code: `P${i}`,
      acs_dev_name: `Qurilma ${i}`,
      status: i < 10 ? '1' : '0',
      locations: [],
    }));
    mock.onGet(TURNSTILES).reply((cfg) => {
      const pages = deleted ? 1 : 2;
      if ((cfg.params?.page ?? 1) === 1) return [200, { items: page1, total: deleted ? 50 : 51, page: 1, size: 50, pages }];
      return [200, { items: deleted ? [] : [TURNSTILE_ROWS[0]], total: deleted ? 50 : 51, page: 2, size: 50, pages }];
    });
    mock.onDelete(TURNSTILE(1)).reply(() => {
      deleted = true;
      return [200, {}];
    });
    await renderWithProviders(<TurnstilesScreen />);
    expect(await screen.findByText('Qurilma 0')).toBeTruthy();
    expect(screen.getByTestId('turnstiles-online')).toHaveTextContent('Bu sahifada 10 / 50 onlayn · jami 51 ta');
    await fireEvent.press(screen.getByTestId('pager-next'));
    expect(await screen.findByText('Kirish-1')).toBeTruthy();
    expect(mock.history.get.filter((r) => r.url === TURNSTILES).at(-1)!.params).toEqual({ page: 2, size: 50 });

    await fireEvent.press(screen.getByTestId('turnstile-row-1'));
    await fireEvent.press(await screen.findByTestId('turnstile-delete'));
    await waitFor(() => expect(mock.history.delete).toHaveLength(1));
    // 2-sahifa yo'qoldi — bo'sh ro'yxat va yashiringan Pager o'rniga 1-sahifa.
    expect(await screen.findByText('Qurilma 0')).toBeTruthy();
    expect(screen.queryByTestId('pager-next')).toBeNull();
    expect(screen.getByTestId('turnstiles-online')).toHaveTextContent('10 / 50 onlayn');
  });

  it('pull-to-refresh: spinner faqat tortilganda yonadi', async () => {
    await renderWithProviders(<TurnstilesScreen />);
    expect(await screen.findByText('Kirish-1')).toBeTruthy();
    expect(refreshControl().props.refreshing).toBe(false);
    const before = mock.history.get.filter((r) => r.url === TURNSTILES).length;
    await act(async () => {
      refreshControl().props.onRefresh();
    });
    await waitFor(() => expect(mock.history.get.filter((r) => r.url === TURNSTILES).length).toBe(before + 1));
    await waitFor(() => expect(refreshControl().props.refreshing).toBe(false));
  });

  it("IP maydonlari decimal-pad emas (ru/uz da «,» chiqadi) — nuqta yoziladigan klaviatura", async () => {
    await renderWithProviders(<TurnstilesScreen />);
    await fireEvent.press(await screen.findByTestId('turnstile-new'));
    expect(screen.getByTestId('turnstile-form-ip').props.keyboardType).toBe('numbers-and-punctuation');
    await fireEvent.press(screen.getAllByLabelText(i18n.t('common.close')).at(-1)!);
    await fireEvent.press(await screen.findByTestId('isapi-new'));
    expect(screen.getByTestId('isapi-form-ip').props.keyboardType).toBe('numbers-and-punctuation');
  });

  it("turniket o'chirilsa Filiallar keshi ham yangilanadi (turniketlar soni)", async () => {
    mock.onDelete(TURNSTILE(1)).reply(200, {});
    const { queryClient } = await renderWithProviders(<TurnstilesScreen />);
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    await fireEvent.press(await screen.findByTestId('turnstile-row-1'));
    await fireEvent.press(await screen.findByTestId('turnstile-delete'));
    await waitFor(() => expect(mock.history.delete).toHaveLength(1));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['branches-admin'] }));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['turnstiles-admin'] });
  });

  it("HikCentral sinxroni: varaq yopilib qayta ochilsa ham ishlayotgan sinxron qayta boshlanmaydi", async () => {
    mock.onGet(HIK_SYNC_ACCESS_LISTS).reply(200, []);
    let release: () => void = () => {};
    mock.onPost(HIK_SYNC_DEVICES).reply(
      () =>
        new Promise((resolve) => {
          release = () => resolve([200, {}]);
        }),
    );
    mock.onPost(HIK_SYNC_DOORS).reply(200, {});
    mock.onPost(HIK_SYNC_ACCESS_LISTS).reply(200, {});
    await renderWithProviders(<TurnstilesScreen />);
    await fireEvent.press(await screen.findByTestId('turnstile-sync'));
    await fireEvent.press(await screen.findByTestId('hik-sync-run'));
    await waitFor(() => expect(mock.history.post.map((r) => r.url)).toEqual([HIK_SYNC_DEVICES]));
    await fireEvent.press(screen.getAllByLabelText(i18n.t('common.close')).at(-1)!);
    await fireEvent.press(screen.getByTestId('turnstile-sync'));
    const btn = await screen.findByTestId('hik-sync-run');
    expect(btn).toBeDisabled();
    await fireEvent.press(btn);
    expect(confirm).toHaveBeenCalledTimes(1);
    await act(async () => {
      release();
    });
    await waitFor(() =>
      expect(mock.history.post.map((r) => r.url)).toEqual([HIK_SYNC_DEVICES, HIK_SYNC_DOORS, HIK_SYNC_ACCESS_LISTS]),
    );
    await waitFor(() => expect(screen.getByTestId('hik-sync-run')).toBeEnabled());
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
