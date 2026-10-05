import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import dayjs from 'dayjs';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import { confirm } from '@/lib/confirm';
import i18n from '@/i18n';
import {
  HEALTH_CHECK,
  HEALTH_CHECKS,
  HEALTH_CHECKS_ACCESS,
  HEALTH_CHECKS_BULK,
  HEALTH_CHECKS_ROSTER,
  ORGANIZATION_BRANCHES,
} from '@/api/urls';
import HealthChecksScreen from '../screens/HealthChecksScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));

const setUser = (u: Record<string, unknown>) =>
  useAuthStore.setState({ user: u as never, isAuthenticated: true } as never);
const nurse = { id: 1, type: 'employee', employee: { id: 5 }, nurse_branch_ids: [7] };
const master = { id: 2, type: 'master-admin', employee: { id: 6 } };
// Kun — qurilmaning mahalliy bugungi sanasi (ekran ham shunday hisoblaydi), TZ'dan mustaqil.
const DAY = dayjs().format('YYYY-MM-DD');
const NEXT = dayjs().add(4, 'day').format('YYYY-MM-DD');

const ROWS = [
  {
    employee_id: 1,
    check_id: 11,
    legal_name: 'Aliyev Vali',
    position: 'Haydovchi',
    status: 'good',
    date_from: DAY,
    date_to: DAY,
  },
  {
    employee_id: 2,
    check_id: 12,
    legal_name: 'Karimov Ali',
    position: 'Haydovchi',
    status: 'unfit',
    note: 'Isitma',
    date_from: DAY,
    date_to: NEXT,
  },
  { employee_id: 3, legal_name: 'Rustamov Bek', position: 'Haydovchi', status: null },
  { employee_id: 5, legal_name: 'Usmonov Jasur', position: 'Ekspeditor', status: null },
];

const rosterCalls = (m: MockAdapter) => m.history.get.filter((r) => r.url === HEALTH_CHECKS_ROSTER);
const accessCalls = (m: MockAdapter) => m.history.get.filter((r) => r.url === HEALTH_CHECKS_ACCESS);

describe('HealthChecksScreen (v2 HealthChecksPage)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    (confirm as jest.Mock).mockClear();
    mock.onGet(HEALTH_CHECKS_ACCESS).reply(200, { can_check: true, nurse_branch_ids: [7] });
    mock.onGet(HEALTH_CHECKS_ROSTER).reply(200, ROWS);
    mock.onGet(ORGANIZATION_BRANCHES).reply(200, [
      { id: 7, name: 'Chorvoq GES' },
      { id: 9, name: "Farg'ona filiali" },
    ]);
    mock.onPost(HEALTH_CHECKS).reply(200, {});
    mock.onDelete(HEALTH_CHECK(11)).reply(200, {});
  });
  afterEach(() => mock.reset());

  it("hamshira: o'z filiali ro'yxati (branch_id aniq), holat yorlig'i, hisoblagichlar; can_check shu filial uchun", async () => {
    setUser(nurse);
    await renderWithProviders(<HealthChecksScreen />);
    expect(await screen.findByText('Aliyev Vali')).toBeTruthy();
    expect(rosterCalls(mock)[0]!.params).toEqual({ branch_id: 7, day: DAY });
    // auth/me da filial bor — identitet so'rovi kerak emas; can_check filial bilan so'raladi.
    expect(accessCalls(mock).map((r) => r.params)).toEqual([{ organization_branch_id: 7 }]);
    // Plitka yorlig'i + qator badge'i.
    expect(screen.getAllByText("Sog'lom")).toHaveLength(2);
    expect(screen.getByText(`Kasal · ${dayjs(NEXT).format('DD.MM')}`)).toBeTruthy();
    expect(screen.getAllByText("Ko'rikdan o'tmagan")).toHaveLength(2);
    expect(screen.getByText(/Izoh: Isitma/)).toBeTruthy();
    expect(screen.getByText('2/4')).toBeTruthy();
    // Bitta filial — tanlagich yo'q.
    expect(screen.queryByTestId('health-branch')).toBeNull();
  });

  it('qidiruv serverga yuboriladi', async () => {
    setUser(nurse);
    await renderWithProviders(<HealthChecksScreen />);
    await screen.findByText('Aliyev Vali');
    await fireEvent.changeText(screen.getByPlaceholderText(i18n.t('health.searchPlaceholder')), 'Karim');
    await waitFor(() => expect(rosterCalls(mock).some((r) => r.params?.search === 'Karim')).toBe(true));
  });

  it('ommaviy: tasdiq → POST bulk-grade (faqat bahosizlar, good, shu kun); server rad etganlari ism va sabab bilan', async () => {
    setUser(nurse);
    mock
      .onPost(HEALTH_CHECKS_BULK)
      .reply(200, { ok: [3], failed: [{ id: 5, error: "Sog'liq ko'rigi faqat haydovchilar uchun" }] });
    await renderWithProviders(<HealthChecksScreen />);
    await screen.findByText('Aliyev Vali');
    await fireEvent.press(screen.getByTestId('health-bulk'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(mock.history.post[0]!.url).toBe(HEALTH_CHECKS_BULK);
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({
      employee_ids: [3, 5],
      status: 'good',
      date_from: DAY,
      date_to: DAY,
    });
    expect(await screen.findByTestId('health-failed-5')).toBeTruthy();
    expect(screen.getByText("Sog'liq ko'rigi faqat haydovchilar uchun")).toBeTruthy();
  });

  it("ommaviy: tasdiqlanmasa so'rov yo'q", async () => {
    setUser(nurse);
    (confirm as jest.Mock).mockResolvedValueOnce(false);
    await renderWithProviders(<HealthChecksScreen />);
    await screen.findByText('Aliyev Vali');
    await fireEvent.press(screen.getByTestId('health-bulk'));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(mock.history.post).toHaveLength(0);
  });

  it("baholash: holatsiz — so'rov yo'q; holat + izoh → POST (sana bo'sh — faqat shu kun)", async () => {
    setUser(nurse);
    await renderWithProviders(<HealthChecksScreen />);
    await fireEvent.press(await screen.findByText('Rustamov Bek'));
    await fireEvent.press(await screen.findByTestId('health-save'));
    expect(await screen.findByText(i18n.t('health.pickStatus'))).toBeTruthy();
    expect(mock.history.post).toHaveLength(0);
    // Bahosi yo'q qatorda o'chirish tugmasi yo'q.
    expect(screen.queryByTestId('health-remove')).toBeNull();
    await fireEvent.press(screen.getByTestId('health-grade-limited'));
    await fireEvent.changeText(screen.getByTestId('health-note'), ' Bosim yuqori ');
    await fireEvent.press(screen.getByTestId('health-save'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({
      employee_id: 3,
      status: 'limited',
      date_from: DAY,
      date_to: DAY,
      note: 'Bosim yuqori',
    });
  });

  it("mavjud bahoni o'chirish → tasdiq → DELETE health-checks/{check_id}", async () => {
    setUser(nurse);
    await renderWithProviders(<HealthChecksScreen />);
    await fireEvent.press(await screen.findByText('Aliyev Vali'));
    await fireEvent.press(await screen.findByTestId('health-remove'));
    await waitFor(() => expect(mock.history.delete).toHaveLength(1));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(mock.history.delete[0]!.url).toBe(HEALTH_CHECK(11));
  });

  it("can_check yo'q — faqat ko'rish: ommaviy tugma yo'q, qator bosilmaydi", async () => {
    setUser(nurse);
    mock.onGet(HEALTH_CHECKS_ACCESS).reply(200, { can_check: false, nurse_branch_ids: [7] });
    await renderWithProviders(<HealthChecksScreen />);
    await screen.findByText('Aliyev Vali');
    await waitFor(() => expect(accessCalls(mock)).toHaveLength(1));
    expect(screen.queryByTestId('health-bulk')).toBeNull();
    await fireEvent.press(screen.getByText('Rustamov Bek'));
    expect(screen.queryByTestId('health-save')).toBeNull();
  });

  it("hamshira bo'lmagan bosh admin: filial aniqlanmadi → tanlagichdan filial → ro'yxat", async () => {
    setUser(master);
    mock.onGet(HEALTH_CHECKS_ACCESS).reply(200, { can_check: true, nurse_branch_ids: [] });
    await renderWithProviders(<HealthChecksScreen />);
    expect(await screen.findByText(i18n.t('health.noBranch'))).toBeTruthy();
    expect(rosterCalls(mock)).toHaveLength(0);
    await fireEvent.press(screen.getByTestId('health-branch'));
    await fireEvent.press(await screen.findByText("Farg'ona filiali"));
    expect(await screen.findByText('Aliyev Vali')).toBeTruthy();
    expect(rosterCalls(mock)[0]!.params).toEqual({ branch_id: 9, day: DAY });
  });

  it('bir nechta hamshira filiali — tanlagich, birinchisi ochiladi', async () => {
    setUser({ ...nurse, nurse_branch_ids: [7, 9] });
    await renderWithProviders(<HealthChecksScreen />);
    await screen.findByText('Aliyev Vali');
    expect(rosterCalls(mock)[0]!.params).toEqual({ branch_id: 7, day: DAY });
    expect(await screen.findByText('Chorvoq GES')).toBeTruthy();
  });

  it("ro'yxat xatosi — ErrorState", async () => {
    setUser(nurse);
    mock.onGet(HEALTH_CHECKS_ROSTER).reply(500);
    await renderWithProviders(<HealthChecksScreen />);
    expect(await screen.findByText(i18n.t('errors.generic'))).toBeTruthy();
  });
});
