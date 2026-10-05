import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import { confirm } from '@/lib/confirm';
import i18n from '@/i18n';
import {
  SYSTEM_OPS_DIAGNOSTICS,
  SYSTEM_OPS_INCIDENTS,
  SYSTEM_OPS_RECOVERY_RUN,
  SYSTEM_OPS_RESUME,
  SYSTEM_OPS_SHUTDOWN,
  SYSTEM_OPS_STATE,
} from '@/api/urls';
import SystemHealthScreen from '../screens/SystemHealthScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));

const setUser = (u: Record<string, unknown>) =>
  useAuthStore.setState({ user: u as never, isAuthenticated: true } as never);
const master = { id: 2, type: 'master-admin', employee: { id: 6 } };
const ministr = {
  id: 3,
  type: 'employee',
  employee: { id: 7, is_multi_org_user: true, multi_org_employee_role: 'ministr' },
};

const DIAG = {
  checks: [
    { component: 'database', status: 'ok', detail: 'javob 3 ms', severity: null },
    { component: 'disk', status: 'fail', detail: "bo'sh 1.2 GB / 50 GB", severity: 'warning' },
    { component: 'something_new', status: 'fail', detail: null, severity: 'critical' },
  ],
  failed: 2,
  healthy: false,
  elapsed_ms: 412,
  // Server timestamptz (UTC ofset) — Toshkentda 12:30.
  checked_at: '2026-10-05T07:30:00+00:00',
};
const INCIDENTS = [
  {
    id: 4,
    kind: 'shutdown',
    message: 'Rejali ish',
    detected_at: '2026-10-04T05:00:00+00:00',
    resolved_at: '2026-10-04T05:20:00+00:00',
    duration_seconds: 1200,
  },
  { id: 5, kind: 'detected', message: null, detected_at: '2026-10-05T03:00:00+00:00', resolved_at: null },
];

const posts = (m: MockAdapter, url: string) => m.history.post.filter((r) => r.url === url);

describe('SystemHealthScreen (v2 SystemHealthPage + SystemOpsPanel)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    (confirm as jest.Mock).mockClear();
    mock.onGet(SYSTEM_OPS_STATE).reply(200, { mode: 'running', mode_label: 'Ish rejimi' });
    mock.onGet(SYSTEM_OPS_DIAGNOSTICS).reply(200, DIAG);
    mock.onGet(SYSTEM_OPS_INCIDENTS).reply(200, INCIDENTS);
  });
  afterEach(() => mock.reset());

  it('master-admin: plitkalar, komponentlar (tarjima / slug), hodisalar Toshkent vaqtida', async () => {
    setUser(master);
    await renderWithProviders(<SystemHealthScreen />);
    expect(await screen.findByText("Ma'lumotlar bazasi")).toBeTruthy();
    expect(screen.getByText('Disk')).toBeTruthy();
    // Noma'lum komponent — slug bilan, xom kalit emas.
    expect(screen.getByText('something_new')).toBeTruthy();
    expect(screen.getByText('Nosozlik bor')).toBeTruthy();
    expect(screen.getByText('2 / 3')).toBeTruthy();
    expect(screen.getByTestId('sys-checked-at')).toHaveTextContent('05.10.2026 12:30 · 412 ms');
    await screen.findByTestId('sys-incident-4');
    // Hodisa turi + to'xtatish tugmasi.
    expect(screen.getAllByText("Avariyaviy to'xtatish")).toHaveLength(2);
    expect(screen.getByText('04.10.2026 10:00 · 20 daq')).toBeTruthy();
    expect(screen.getByText('Rejali ish')).toBeTruthy();
    expect(screen.getByText('Nosozlik aniqlandi')).toBeTruthy();
    expect(screen.getByText('Bartaraf etilgan')).toBeTruthy();
    expect(screen.getByText('Ochiq')).toBeTruthy();
    expect(mock.history.get.find((r) => r.url === SYSTEM_OPS_INCIDENTS)!.params).toEqual({ limit: 30 });
  });

  it('diagnostika yiqilsa «soz» deyilmaydi (v2 izohi)', async () => {
    setUser(master);
    mock.onGet(SYSTEM_OPS_DIAGNOSTICS).reply(500, {});
    await renderWithProviders(<SystemHealthScreen />);
    expect(await screen.findByText("Ma'lumotni yuklab bo'lmadi")).toBeTruthy();
    expect(screen.queryByText('Soz')).toBeNull();
  });

  it("master-admin bo'lmagan (ministr ham) — so'rovsiz «ruxsat yo'q»", async () => {
    setUser(ministr);
    await renderWithProviders(<SystemHealthScreen />);
    expect(await screen.findByText('Tizim holati faqat bosh administrator uchun ochiq.')).toBeTruthy();
    expect(mock.history.get).toHaveLength(0);
  });

  it("avariyaviy to'xtatish: sabab 3 belgidan kam — yuborilmaydi; majburiy bayroq; hisobot ko'rsatiladi", async () => {
    setUser(master);
    mock.onPost(SYSTEM_OPS_SHUTDOWN).reply(200, { incident_id: 9, mode: 'maintenance' });
    await renderWithProviders(<SystemHealthScreen />);
    await fireEvent.press(await screen.findByTestId('sys-action-shutdown'));
    await fireEvent.changeText(screen.getByTestId('sys-shutdown-reason'), 'ab');
    expect(screen.getByText('Sababni yozing — kamida 3 ta belgi')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('sys-shutdown-submit'));
    expect(posts(mock, SYSTEM_OPS_SHUTDOWN)).toHaveLength(0);
    await fireEvent.changeText(screen.getByTestId('sys-shutdown-reason'), '  Baza serverida ish ');
    await fireEvent(screen.getByTestId('sys-shutdown-force'), 'valueChange', true);
    await fireEvent.press(screen.getByTestId('sys-shutdown-submit'));
    await waitFor(() => expect(posts(mock, SYSTEM_OPS_SHUTDOWN)).toHaveLength(1));
    expect(JSON.parse(posts(mock, SYSTEM_OPS_SHUTDOWN)[0]!.data)).toEqual({
      reason: 'Baza serverida ish',
      force: true,
    });
    expect(await screen.findByTestId('sys-report')).toHaveTextContent(/"incident_id": 9/);
  });

  it("to'xtatilgan rejim: tiklash (rollback tanlovi) va ish rejimiga qaytarish (tasdiq bilan)", async () => {
    setUser(master);
    mock.onGet(SYSTEM_OPS_STATE).reply(200, { mode: 'maintenance', reason: 'Rejali ish', changed_by_name: 'Admin' });
    mock.onPost(SYSTEM_OPS_RECOVERY_RUN).reply(200, { ok: false, incident_id: 10 });
    mock.onPost(SYSTEM_OPS_RESUME).reply(200, { mode: 'running' });
    await renderWithProviders(<SystemHealthScreen />);
    expect(await screen.findByTestId('sys-action-enter')).toBeTruthy();
    expect(screen.queryByTestId('sys-action-shutdown')).toBeNull();
    expect(screen.getByTestId('sys-ops-reason')).toHaveTextContent('Rejali ish');

    await fireEvent.press(screen.getByTestId('sys-action-run'));
    await fireEvent.press(screen.getByTestId('sys-tx-rollback'));
    expect(screen.getByText(/YO'QOLADI/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('sys-recovery-submit'));
    await waitFor(() => expect(posts(mock, SYSTEM_OPS_RECOVERY_RUN)).toHaveLength(1));
    expect(JSON.parse(posts(mock, SYSTEM_OPS_RECOVERY_RUN)[0]!.data)).toEqual({ tx_action: 'rollback', repair: true });
    expect(await screen.findByTestId('sys-report')).toHaveTextContent(/"ok": false/);

    await fireEvent.press(screen.getByTestId('sys-action-resume'));
    await waitFor(() => expect(posts(mock, SYSTEM_OPS_RESUME)).toHaveLength(1));
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it("qaytarish tasdiqlanmasa — so'rov yo'q", async () => {
    setUser(master);
    (confirm as jest.Mock).mockResolvedValueOnce(false);
    mock.onGet(SYSTEM_OPS_STATE).reply(200, { mode: 'recovery' });
    await renderWithProviders(<SystemHealthScreen />);
    await fireEvent.press(await screen.findByTestId('sys-action-resume'));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(posts(mock, SYSTEM_OPS_RESUME)).toHaveLength(0);
    // Tiklash rejimida «Tiklash rejimi» tugmasi yo'q.
    expect(screen.queryByTestId('sys-action-enter')).toBeNull();
  });
});
