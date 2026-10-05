import React from 'react';
import { Linking, Share } from 'react-native';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import { confirm } from '@/lib/confirm';
import { __resetToasts, getToasts } from '@/lib/toast';
import i18n from '@/i18n';
import {
  ZOOM_AVAILABILITY,
  ZOOM_CONFIG,
  ZOOM_LIVE,
  ZOOM_MEETING,
  ZOOM_MEETING_APPROVE,
  ZOOM_MEETING_HOST_KEY,
  ZOOM_MEETING_REJECT,
  ZOOM_MEETING_START,
  ZOOM_MEETINGS,
} from '@/api/urls';
import ZoomScreen from '../screens/ZoomScreen';
import { tashkentToday } from '../utils/zoom';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));
// Forma vaqti kun soatiga bog'liq (o'tgan 10:00 → keyingi yarim soat) — testlar barqaror
// bo'lishi uchun bugungi 10:00 qotiriladi; qoidaning o'zi `defaultZoomStart` testida.
jest.mock('../utils/zoom', () => {
  const actual = jest.requireActual('../utils/zoom');
  return { ...actual, defaultZoomStart: () => ({ date: actual.tashkentToday(), time: '10:00' }) };
});

// Sana — Toshkent bo'yicha bugun (ekran ham shunday hisoblaydi), qurilma TZ dan mustaqil.
const TODAY = tashkentToday();
const at = (hm: string) => `${TODAY}T${hm}:00+05:00`;

const CONFIG = { enabled: true, can_request: true, can_approve: true, auto_approve: true, max_concurrent: 2 };
const LIVE = { live_count: 1, max_concurrent: 2, is_full: false, meetings: [{ id: 1, topic: 'Kengash' }] };
const ROWS = [
  {
    id: 1,
    status: 'approved',
    topic: 'Kengash',
    start_at: at('10:00'),
    end_at: at('11:00'),
    duration_minutes: 60,
    join_url: 'https://zoom.us/j/98498148442?pwd=x',
    zoom_meeting_id: 98498148442,
    passcode: 'ab12',
    host_key: '123456',
    is_live: true,
    live_since: at('10:02'),
    participant_count: 5,
    can_manage: true,
    requested_by: { id: 3, legal_name: 'Aliyev Vali' },
  },
  {
    id: 2,
    status: 'pending',
    topic: 'Rejalashtirish',
    start_at: at('15:00'),
    end_at: at('15:30'),
    duration_minutes: 30,
    can_approve: true,
    can_manage: true,
  },
  {
    id: 3,
    status: 'approved',
    topic: 'Haftalik',
    start_at: at('16:00'),
    end_at: at('17:00'),
    duration_minutes: 60,
    join_url: 'javascript:alert(1)',
    series_id: 9,
    series_index: 3,
    series_total: 10,
    recurrence: { type: 'weekly', interval: 1, weekdays: [1] },
    can_manage: true,
  },
  { id: 4, status: 'approved', topic: 'Begona', start_at: at('18:00'), join_url: 'https://zoom.us/j/1' },
];

const listCalls = (m: MockAdapter) => m.history.get.filter((r) => r.url === ZOOM_MEETINGS);

describe('ZoomScreen (v2 ZoomPage)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    (confirm as jest.Mock).mockClear();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
    mock.onGet(ZOOM_CONFIG).reply(200, CONFIG);
    mock.onGet(ZOOM_LIVE).reply(200, LIVE);
    mock.onGet(ZOOM_MEETINGS).reply(200, { items: ROWS, total: ROWS.length, page: 1, size: 20 });
    mock.onGet(ZOOM_AVAILABILITY).reply(200, {
      date: TODAY,
      max_concurrent: 2,
      meetings: [],
      overlapping_count: 0,
      is_free: true,
    });
  });
  afterEach(() => {
    // Toast taymerlari (3.5 s) jest worker'ini ushlab qolmasin.
    __resetToasts();
    mock.reset();
    jest.restoreAllMocks();
  });

  it("modul o'chirilgan — ma'lumot holati, ro'yxat so'ralmaydi", async () => {
    mock.onGet(ZOOM_CONFIG).reply(200, { ...CONFIG, enabled: false });
    await renderWithProviders(<ZoomScreen />);
    expect(await screen.findByText(i18n.t('zoom.disabled'))).toBeTruthy();
    expect(listCalls(mock)).toHaveLength(0);
    expect(screen.queryByTestId('zoom-add')).toBeNull();
  });

  it("faol jadval: jonli chip, kun sarlavhasi, jonli belgi, holat, seriya; host_key keshda yo'q", async () => {
    const { queryClient } = await renderWithProviders(<ZoomScreen />);
    expect(await screen.findByText('Kengash')).toBeTruthy();
    expect(listCalls(mock)[0]!.params).toEqual({ scope: 'active', page: 1, size: 20 });
    expect(await screen.findByText('Hozir jonli: 1/2')).toBeTruthy();
    expect(screen.getByText("Bir vaqtda 2 ta yig'ilish")).toBeTruthy();
    expect(screen.getByTestId(`zoom-day-${TODAY}`)).toBeTruthy();
    expect(screen.getByText(/^Bugun · /)).toBeTruthy();
    expect(screen.getByTestId('zoom-live-1')).toBeTruthy();
    expect(screen.getByText('Jonli · 10:02')).toBeTruthy();
    // Holat filtri chipi ham «Kutilmoqda» — badge testID bilan.
    expect(screen.getByTestId('zoom-status-2')).toBeTruthy();
    expect(screen.getAllByText('Kutilmoqda')).toHaveLength(2);
    expect(screen.getByText('Takroriy 3/10')).toBeTruthy();
    expect(screen.getByText("So'ragan: Aliyev Vali")).toBeTruthy();
    // Hostlik kodi faqat mutatsiya bilan — ro'yxat keshiga tushmaydi.
    expect(
      JSON.stringify(
        queryClient
          .getQueryCache()
          .getAll()
          .map((q) => q.state.data),
      ),
    ).not.toContain('123456');
  });

  it('qidiruv, holat filtri va Arxiv tabi serverga yuboriladi', async () => {
    await renderWithProviders(<ZoomScreen />);
    await screen.findByText('Kengash');
    await fireEvent.changeText(screen.getByPlaceholderText(i18n.t('zoom.searchPlaceholder')), 'Ken');
    await waitFor(() => expect(listCalls(mock).some((r) => r.params?.search === 'Ken')).toBe(true));
    await fireEvent.press(screen.getByTestId('zoom-filter-pending'));
    await waitFor(() => expect(listCalls(mock).some((r) => r.params?.status === 'pending')).toBe(true));
    // Faol tabda arxiv holatlari filtri yo'q.
    expect(screen.queryByTestId('zoom-filter-ended')).toBeNull();
    await fireEvent.press(screen.getByText(i18n.t('zoom.scopeArchive')));
    await waitFor(() => expect(listCalls(mock).some((r) => r.params?.scope === 'archive')).toBe(true));
    expect(screen.getByTestId('zoom-filter-ended')).toBeTruthy();
  });

  it("tafsilot: qo'shilish (https) Linking bilan, taklifnoma Share bilan; raqam va parol", async () => {
    await renderWithProviders(<ZoomScreen />);
    await fireEvent.press(await screen.findByTestId('zoom-row-1'));
    expect(await screen.findByText("Yig'ilish raqami: 984 9814 8442")).toBeTruthy();
    expect(screen.getByText('Kod: ab12')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('zoom-join'));
    expect(Linking.openURL).toHaveBeenCalledWith('https://zoom.us/j/98498148442?pwd=x');
    await fireEvent.press(screen.getByTestId('zoom-share'));
    await waitFor(() => expect(Share.share).toHaveBeenCalledTimes(1));
    const msg = (Share.share as jest.Mock).mock.calls[0][0].message as string;
    expect(msg).toContain('Mavzu: Kengash');
    expect(msg).toContain('https://zoom.us/j/98498148442?pwd=x');
    expect(msg).toContain('Parol: ab12');
    // Jonli yig'ilishda «Host bo'lib kirish».
    expect(screen.getByText("Host bo'lib kirish")).toBeTruthy();
  });

  it("http(s) bo'lmagan join_url — qo'shilish/ulashish tugmasi yo'q", async () => {
    await renderWithProviders(<ZoomScreen />);
    await fireEvent.press(await screen.findByTestId('zoom-row-3'));
    expect(await screen.findByTestId('zoom-start')).toBeTruthy();
    expect(screen.queryByTestId('zoom-join')).toBeNull();
    expect(screen.queryByTestId('zoom-share')).toBeNull();
  });

  it("can_manage yo'q — boshlash/bekor/hostlik kodi yo'q, faqat qo'shilish", async () => {
    await renderWithProviders(<ZoomScreen />);
    await fireEvent.press(await screen.findByTestId('zoom-row-4'));
    expect(await screen.findByTestId('zoom-join')).toBeTruthy();
    expect(screen.queryByTestId('zoom-start')).toBeNull();
    expect(screen.queryByTestId('zoom-cancel')).toBeNull();
    expect(screen.queryByTestId('zoom-host-key-btn')).toBeNull();
    expect(screen.queryByTestId('zoom-approve')).toBeNull();
  });

  it("boshlash → POST start → host havolasi Linking bilan ochiladi; start_url keshda yo'q", async () => {
    mock
      .onPost(ZOOM_MEETING_START(1))
      .reply(200, { start_url: 'https://zoom.us/s/1?zak=secret', expires_in_minutes: 120, recording: 'armed' });
    const { queryClient } = await renderWithProviders(<ZoomScreen />);
    await fireEvent.press(await screen.findByTestId('zoom-row-1'));
    await fireEvent.press(await screen.findByTestId('zoom-start'));
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith('https://zoom.us/s/1?zak=secret'));
    expect(mock.history.post[0]!.url).toBe(ZOOM_MEETING_START(1));
    // Yozuv bilan nima bo'lgani toastda aytiladi.
    await waitFor(() => expect(getToasts().map((x) => x.message)).toContain(i18n.t('zoom.recordingArmed')));
    expect(
      JSON.stringify(
        queryClient
          .getQueryCache()
          .getAll()
          .map((q) => q.state.data),
      ),
    ).not.toContain('zak=secret');
  });

  it('hostlik kodi: tasdiq → POST host-key → kod ko‘rsatiladi', async () => {
    mock.onPost(ZOOM_MEETING_HOST_KEY(1)).reply(200, { host_key: '654321' });
    await renderWithProviders(<ZoomScreen />);
    await fireEvent.press(await screen.findByTestId('zoom-row-1'));
    await fireEvent.press(await screen.findByTestId('zoom-host-key-btn'));
    expect(await screen.findByText('654321')).toBeTruthy();
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it("tasdiqlash: confirm → POST approve; rad: sababsiz so'rov yo'q, sabab bilan POST reject", async () => {
    mock.onPost(ZOOM_MEETING_APPROVE(2)).reply(200, {});
    mock.onPost(ZOOM_MEETING_REJECT(2)).reply(200, {});
    await renderWithProviders(<ZoomScreen />);
    await fireEvent.press(await screen.findByTestId('zoom-row-2'));
    await fireEvent.press(await screen.findByTestId('zoom-approve'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(mock.history.post[0]!.url).toBe(ZOOM_MEETING_APPROVE(2));

    await fireEvent.press(await screen.findByTestId('zoom-row-2'));
    await fireEvent.press(await screen.findByTestId('zoom-reject'));
    await fireEvent.changeText(screen.getByTestId('zoom-reject-reason'), ' x ');
    await fireEvent.press(screen.getByTestId('zoom-reject-submit'));
    expect(await screen.findByText(i18n.t('zoom.reasonRequired'))).toBeTruthy();
    expect(mock.history.post).toHaveLength(1);
    await fireEvent.changeText(screen.getByTestId('zoom-reject-reason'), ' Vaqt band ');
    await fireEvent.press(screen.getByTestId('zoom-reject-submit'));
    await waitFor(() => expect(mock.history.post).toHaveLength(2));
    expect(mock.history.post[1]!.url).toBe(ZOOM_MEETING_REJECT(2));
    expect(JSON.parse(mock.history.post[1]!.data)).toEqual({ reason: 'Vaqt band' });
  });

  it('seriya: shu kunni bekor — DELETE; butun seriya — DELETE ?scope=series', async () => {
    mock.onDelete(ZOOM_MEETING(3)).reply(200, {});
    await renderWithProviders(<ZoomScreen />);
    await fireEvent.press(await screen.findByTestId('zoom-row-3'));
    expect(await screen.findByText('Shu kunni bekor qilish')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('zoom-cancel'));
    await waitFor(() => expect(mock.history.delete).toHaveLength(1));
    expect(mock.history.delete[0]!.params).toBeUndefined();

    await fireEvent.press(await screen.findByTestId('zoom-row-3'));
    await fireEvent.press(await screen.findByTestId('zoom-cancel-series'));
    await waitFor(() => expect(mock.history.delete).toHaveLength(2));
    expect(mock.history.delete[1]!.url).toBe(ZOOM_MEETING(3));
    expect(mock.history.delete[1]!.params).toEqual({ scope: 'series' });
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it("yaratish: band vaqtda yuborish o'chiq; bo'sh vaqtda POST (v2 tanasi) → taklifnoma varag'i", async () => {
    // 10:00 — limit to'lgan, boshqa vaqt — bo'sh (beforeEach'dagi javob almashtiriladi).
    mock.onGet(ZOOM_AVAILABILITY).reply((cfg) =>
      cfg.params?.start_at === `${TODAY}T10:00:00`
        ? [
            200,
            {
              date: TODAY,
              max_concurrent: 2,
              meetings: [
                { id: 1, topic: 'Kengash', start_at: at('10:00'), end_at: at('11:00'), requested_by: 'Aliyev Vali' },
              ],
              overlapping_count: 2,
              is_free: false,
              next_free_at: at('11:00'),
            },
          ]
        : [200, { date: TODAY, max_concurrent: 2, meetings: [], overlapping_count: 0, is_free: true }],
    );
    mock.onPost(ZOOM_MEETINGS).reply(201, {
      id: 50,
      status: 'approved',
      topic: 'Yangi',
      start_at: at('11:00'),
      join_url: 'https://zoom.us/j/111',
      zoom_meeting_id: 11122233344,
    });
    await renderWithProviders(<ZoomScreen />);
    await screen.findByText('Kengash');
    await fireEvent.press(screen.getByTestId('zoom-add'));
    await fireEvent.changeText(await screen.findByTestId('zoom-topic'), 'Yangi');
    // Bandlik so'rovi — formadagi aynan o'sha mintaqasiz satr bilan.
    expect(await screen.findByText("Bu vaqtda 2 ta yig'ilish bor — limit 2 ta")).toBeTruthy();
    const probe = mock.history.get.find((r) => r.url === ZOOM_AVAILABILITY)!;
    expect(probe.params).toEqual({ start_at: `${TODAY}T10:00:00`, duration_minutes: 60 });
    expect(screen.getByText('10:00–11:00 · Kengash (Aliyev Vali)')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('zoom-submit'));
    expect(mock.history.post).toHaveLength(0);
    // «Eng yaqin bo'sh vaqt» — forma 11:00 ga ko'chadi, yangi javob — bo'sh.
    await fireEvent.press(screen.getByTestId('zoom-next-free'));
    expect(await screen.findByText("Bu vaqt bo'sh (0/2 band)")).toBeTruthy();
    await fireEvent.press(screen.getByTestId('zoom-submit'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({
      topic: 'Yangi',
      start_at: `${TODAY}T11:00:00`,
      duration_minutes: 60,
      agenda: null,
      record: false,
      waiting_room: false,
      join_before_host: true,
      recurrence: null,
    });
    expect(await screen.findByTestId('zoom-invitation-text')).toBeTruthy();
    // Sarlavha qatori va taklifnoma matni — ikkalasida ham.
    expect(screen.getAllByText(/Yig'ilish raqami: 111 2223 3344/)).toHaveLength(2);
  });

  it('yaratish: haftalik takrorlash qoidasi tanaga tushadi; mavzusiz — xato, so‘rov yo‘q', async () => {
    mock.onPost(ZOOM_MEETINGS).reply(201, { id: 51, status: 'pending', topic: 'Seriya' });
    await renderWithProviders(<ZoomScreen />);
    await screen.findByText('Kengash');
    await fireEvent.press(screen.getByTestId('zoom-add'));
    await fireEvent.press(await screen.findByTestId('zoom-submit'));
    expect(await screen.findByText(i18n.t('zoom.topicRequired'))).toBeTruthy();
    expect(mock.history.post).toHaveLength(0);
    await fireEvent.changeText(screen.getByTestId('zoom-topic'), 'Seriya');
    await fireEvent.press(screen.getByTestId('zoom-repeat-weekly'));
    await fireEvent.changeText(screen.getByTestId('zoom-count'), '4');
    const other = [1, 2, 3, 4, 5, 6, 7].find((d) => d !== ((new Date(`${TODAY}T12:00:00`).getDay() + 6) % 7) + 1)!;
    await fireEvent.press(screen.getByTestId(`zoom-wd-${other}`));
    expect(screen.getByTestId('zoom-repeat-preview')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('zoom-verdict')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('zoom-submit'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data).recurrence).toEqual({
      type: 'weekly',
      interval: 1,
      weekdays: [other],
      count: 4,
    });
    // Kutilayotgan so'rov — havola yo'q, taklifnoma varag'i ochilmaydi.
    expect(screen.queryByTestId('zoom-invitation-text')).toBeNull();
  });

  it('server xato kodi (zoom_slot_busy) joriy tilda ko‘rsatiladi', async () => {
    await i18n.changeLanguage('ru');
    mock.onPost(ZOOM_MEETINGS).reply(409, { code: 'zoom_slot_busy', detail: "Bu vaqtda limit to'lgan" });
    await renderWithProviders(<ZoomScreen />);
    await screen.findByText('Kengash');
    await fireEvent.press(screen.getByTestId('zoom-add'));
    await fireEvent.changeText(await screen.findByTestId('zoom-topic'), 'Yangi');
    await waitFor(() => expect(screen.getByTestId('zoom-verdict')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('zoom-submit'));
    expect(await screen.findByText('На это время лимит встреч исчерпан — выберите другое время')).toBeTruthy();
  });

  it("ro'yxat xatosi — ErrorState", async () => {
    mock.onGet(ZOOM_MEETINGS).reply(500);
    await renderWithProviders(<ZoomScreen />);
    expect(await screen.findByText(i18n.t('errors.generic'))).toBeTruthy();
  });
});
