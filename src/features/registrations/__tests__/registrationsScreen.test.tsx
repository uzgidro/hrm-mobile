import React from 'react';
import { Linking } from 'react-native';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import { confirm } from '@/lib/confirm';
import i18n from '@/i18n';
import {
  DEPARTMENTS_LIST,
  JOB_POSITIONS_LIST,
  ORGANIZATION_BRANCHES,
  REGISTRATIONS,
  REGISTRATION_APPROVE,
  REGISTRATION_REJECT,
} from '@/api/urls';
import RegistrationsScreen from '../screens/RegistrationsScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));

const admin = { id: 5, type: 'admin' };

const ROWS = [
  {
    id: 41,
    status: 'pending',
    full_name: 'Toshmatov Anvar',
    username: 'anvar',
    email: 'anvar@mail.uz',
    phone_number: '+998 90 123 45 67',
    birth_date: '1990-03-07',
    gender: 1,
    pinfl: '12345678901234',
    passport_number: 'AA1234567',
    is_uge_employee: true,
    claimed_branch_id: 2,
    claimed_department_id: 7,
    claimed_job_position_id: 9,
    claimed_branch_name: 'Chorvoq GES',
    claimed_department_name: 'Texnik bo‘lim',
    claimed_job_position_name: 'Muhandis',
    photo_url: 'https://minio.uzgidro.uz/reg/41.jpg',
  },
  {
    id: 42,
    status: 'rejected',
    full_name: 'Mehmon Odam',
    email: 'g@mail.uz',
    is_uge_employee: false,
    reject_reason: 'Hujjat xira',
    reviewed_at: '2026-10-04T20:30:00+00:00',
    reviewed_by_name: 'admin',
    photo_url: 'javascript:alert(1)',
  },
];

const listCalls = (m: MockAdapter) => m.history.get.filter((r) => r.url === REGISTRATIONS);
const lastList = (m: MockAdapter) => listCalls(m)[listCalls(m).length - 1]!.params;

describe('RegistrationsScreen (v2 RegistrationsPage)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    (confirm as jest.Mock).mockClear();
    useAuthStore.setState({ user: admin as never, isAuthenticated: true } as never);
    mock.onGet(REGISTRATIONS).reply(200, { items: ROWS, total: 2, page: 1, size: 25, pages: 1 });
    mock.onGet(ORGANIZATION_BRANCHES).reply(200, [
      { id: 2, name: 'Chorvoq GES' },
      { id: 3, name: 'Farhod GES' },
    ]);
    mock.onGet(DEPARTMENTS_LIST).reply(200, { items: [{ id: 7, name: 'Texnik bo‘lim' }], total: 1, pages: 1 });
    mock.onGet(JOB_POSITIONS_LIST).reply(200, { items: [{ id: 9, name: 'Muhandis' }], total: 1, pages: 1 });
  });
  afterEach(() => mock.reset());

  it("standart — kutilayotganlar; «Barchasi» holatsiz so'raladi; nishonlar va da'vo", async () => {
    await renderWithProviders(<RegistrationsScreen />);
    expect(await screen.findByText('Toshmatov Anvar')).toBeTruthy();
    expect(lastList(mock)).toEqual({ status: 'pending', page: 1, size: 25 });
    expect(screen.getByTestId('registration-status-41')).toHaveTextContent('Kutilmoqda');
    expect(screen.getByTestId('registration-status-42')).toHaveTextContent('Rad etilgan');
    expect(screen.getByText('anvar · Chorvoq GES · Texnik bo‘lim · Muhandis')).toBeTruthy();
    expect(screen.getByTestId('registrations-total')).toHaveTextContent('Jami: 2 ta ariza');

    await fireEvent.press(screen.getByText('Barchasi'));
    await waitFor(() => expect(lastList(mock)).toEqual({ page: 1, size: 25 }));
    // Ko'rib chiqilganlar ro'yxatida — ko'rib chiqilgan sana (Toshkentda).
    expect(await screen.findByText('g@mail.uz · Mehmon · 05.10.2026')).toBeTruthy();
  });

  it("kartochka: ma'lumotlar, surat — faqat http(s) Linking; tasdiqlash — da'vo boshlang'ich, filial almashsa bo'lim/lavozim tozalanadi", async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    mock.onPost(REGISTRATION_APPROVE(41)).reply(200, { ...ROWS[0], status: 'approved' });
    await renderWithProviders(<RegistrationsScreen />);
    await fireEvent.press(await screen.findByTestId('registration-row-41'));
    expect(await screen.findByTestId('registration-birth')).toHaveTextContent('07.03.1990');
    expect(screen.getByText('Erkak')).toBeTruthy();
    expect(screen.getByTestId('registration-claim')).toHaveTextContent('Chorvoq GES · Texnik bo‘lim · Muhandis');
    await fireEvent.press(screen.getByTestId('registration-photo'));
    expect(open).toHaveBeenCalledWith('https://minio.uzgidro.uz/reg/41.jpg');

    await fireEvent.press(screen.getByTestId('registration-approve'));
    expect(await screen.findByText('Chorvoq GES')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('registration-approve-submit'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(mock.history.post[0]!.url).toBe(REGISTRATION_APPROVE(41));
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({
      organization_branch_id: 2,
      department_id: 7,
      job_position_id: 9,
    });
    open.mockRestore();
  });

  it("tasdiqlash: filial almashtirilsa bo'lim va lavozim tushib qoladi; server xatosi formada", async () => {
    mock.onPost(REGISTRATION_APPROVE(41)).reply(404, { code: 'branch_not_found', detail: 'Tashkilot topilmadi' });
    await renderWithProviders(<RegistrationsScreen />);
    await fireEvent.press(await screen.findByTestId('registration-row-41'));
    await fireEvent.press(await screen.findByTestId('registration-approve'));
    await fireEvent.press(await screen.findByTestId('registration-branch'));
    await fireEvent.press(await screen.findByText('Farhod GES'));
    await fireEvent.press(screen.getByTestId('registration-approve-submit'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({
      organization_branch_id: 3,
      department_id: null,
      job_position_id: null,
    });
    expect(await screen.findByTestId('registration-error')).toHaveTextContent('Filial topilmadi');
  });

  it("rad etish: sabab ≥ 3 belgi, tasdiq bilan; rad etilgan arizada amal yo'q, sabab ko'rinadi", async () => {
    mock.onPost(REGISTRATION_REJECT(41)).reply(200, { ...ROWS[0], status: 'rejected' });
    await renderWithProviders(<RegistrationsScreen />);
    await fireEvent.press(await screen.findByTestId('registration-row-41'));
    await fireEvent.press(await screen.findByTestId('registration-reject'));
    await fireEvent.changeText(await screen.findByTestId('registration-reason'), ' ab ');
    await fireEvent.press(screen.getByTestId('registration-reject-submit'));
    expect(screen.getByTestId('registration-error')).toHaveTextContent('Sababni yozing (kamida 3 ta belgi).');
    expect(confirm).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByTestId('registration-reason'), ' Hujjat xira ');
    await fireEvent.press(screen.getByTestId('registration-reject-submit'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ destructive: true }));
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({ reason: 'Hujjat xira' });

    await fireEvent.press(await screen.findByTestId('registration-row-42'));
    expect(await screen.findByText('Hujjat xira')).toBeTruthy();
    expect(screen.queryByTestId('registration-approve')).toBeNull();
    expect(screen.queryByTestId('registration-photo')).toBeNull();
    expect(screen.getByTestId('registration-reviewed')).toHaveTextContent("Ko'rib chiqildi: 05.10.2026 · admin");
  });

  it("rad etish tasdiqlanmasa so'rov yo'q", async () => {
    (confirm as jest.Mock).mockResolvedValueOnce(false);
    await renderWithProviders(<RegistrationsScreen />);
    await fireEvent.press(await screen.findByTestId('registration-row-41'));
    await fireEvent.press(await screen.findByTestId('registration-reject'));
    await fireEvent.changeText(await screen.findByTestId('registration-reason'), 'Sabab bor');
    await fireEvent.press(screen.getByTestId('registration-reject-submit'));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(mock.history.post).toHaveLength(0);
  });

  it("403 — «Ruxsat yo'q»", async () => {
    mock.onGet(REGISTRATIONS).reply(403, { code: 'forbidden' });
    await renderWithProviders(<RegistrationsScreen />);
    expect(await screen.findByText("Bu bo'lim faqat tizim administratori uchun.")).toBeTruthy();
  });
});
