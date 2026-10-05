import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import { confirm } from '@/lib/confirm';
import i18n from '@/i18n';
import {
  ADMIN,
  ADMINS,
  ADMIN_SEND_PASSWORD,
  EMPLOYEES_LIST,
  EMPLOYEE_DEACTIVATE,
  MULTI_MODAL_USER,
  MULTI_MODAL_USERS,
  MULTI_MODAL_USER_SEND_PASSWORD,
  ORGANIZATION_BRANCHES,
} from '@/api/urls';
import UsersScreen from '../screens/UsersScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));

const master = { id: 2, type: 'master-admin', employee: { id: 6 } };

const ACCOUNTS = [
  {
    id: 21,
    legal_name: 'Aliyev Vali',
    email: 'vali@uzgidro.uz',
    department: { id: 3, name: 'Kadrlar bo‘limi' },
    job_position: { id: 4, name: 'Mutaxassis' },
    account_is_active: true,
  },
  { id: 22, legal_name: 'Karimova Nodira', email: null, account_is_active: false },
  { id: 23, legal_name: 'Hisobsiz Odam', account_is_active: null },
];
const ADMIN_ROWS = [{ id: 5, email: 'admin@chorvoq.uz', organization_branch_id: 2 }];
const KIOSKS = [
  {
    id: 9,
    username: 'post1',
    legal_name: 'KPP 1',
    role: 'kpp',
    personal_identification_number: '12345678901234',
    organization_branch_ids: [2],
  },
  { username: 'broken' },
];
const BRANCHES = [
  { id: 2, name: 'Chorvoq GES' },
  { id: 3, name: 'Farhod GES' },
];

const employeeCalls = (m: MockAdapter) => m.history.get.filter((r) => r.url === EMPLOYEES_LIST);

describe('UsersScreen (v2 UsersPage)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    (confirm as jest.Mock).mockClear();
    useAuthStore.setState({ user: master as never, isAuthenticated: true } as never);
    mock.onGet(EMPLOYEES_LIST).reply((cfg) =>
      cfg.params?.is_multi_org_user
        ? [
            200,
            {
              items: [
                {
                  id: 31,
                  legal_name: 'Rahimov Kadr',
                  multi_org_employee_role: ['hr'],
                  is_kpi_admin: true,
                  organization_branch_ids: [2, 3],
                  created_at: '2026-10-04T20:00:00+00:00',
                },
              ],
              total: 1,
              pages: 1,
            },
          ]
        : [200, { items: ACCOUNTS, total: 60, page: 1, size: 25, pages: 3 }],
    );
    mock.onGet(ADMINS).reply(200, { items: ADMIN_ROWS, total: 1 });
    mock.onGet(MULTI_MODAL_USERS).reply(200, KIOSKS);
    mock.onGet(ORGANIZATION_BRANCHES).reply(200, BRANCHES);
  });
  afterEach(() => mock.reset());

  it('xodim hisoblari: server sahifalash 25 tadan, holat nishonlari; faolsizlantirish — tasdiq bilan', async () => {
    mock.onPost(EMPLOYEE_DEACTIVATE(21)).reply(200, { id: 21 });
    await renderWithProviders(<UsersScreen />);
    expect(await screen.findByText('Aliyev Vali')).toBeTruthy();
    expect(employeeCalls(mock)[0]!.params).toEqual({ page: 1, size: 25 });
    expect(screen.getByText('Kadrlar bo‘limi · Mutaxassis')).toBeTruthy();
    expect(screen.getByTestId('account-state-21')).toHaveTextContent('Faol');
    expect(screen.getByTestId('account-state-22')).toHaveTextContent('Faolsiz');
    expect(screen.getByTestId('account-state-23')).toHaveTextContent("Hisob yo'q");
    expect(screen.getByTestId('accounts-total')).toHaveTextContent('Jami: 60 ta');

    await fireEvent.press(screen.getByTestId('account-row-21'));
    await fireEvent.press(await screen.findByTestId('account-deactivate'));
    await waitFor(() => expect(mock.history.post.map((r) => r.url)).toEqual([EMPLOYEE_DEACTIVATE(21)]));
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ destructive: true }));
  });

  it("hisobsiz xodimda amal yo'q; faolsizlantirish rad etilsa so'rov yo'q", async () => {
    (confirm as jest.Mock).mockResolvedValueOnce(false);
    await renderWithProviders(<UsersScreen />);
    await fireEvent.press(await screen.findByTestId('account-row-21'));
    await fireEvent.press(await screen.findByTestId('account-deactivate'));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(mock.history.post).toHaveLength(0);
    await fireEvent.press(screen.getByTestId('account-row-23'));
    expect(await screen.findByText("Xodimda tizimga kirish hisobi yo'q — faollashtiradigan narsa yo'q.")).toBeTruthy();
    expect(screen.queryByTestId('account-activate')).toBeNull();
    expect(screen.queryByTestId('account-deactivate')).toBeNull();
  });

  it('filial tanlansa xodimlar shu filial bo‘yicha (barcha filiallar — parametrsiz)', async () => {
    await renderWithProviders(<UsersScreen />);
    await screen.findByText('Aliyev Vali');
    await fireEvent.press(screen.getByTestId('users-branch'));
    await fireEvent.press(await screen.findByText('Farhod GES'));
    await waitFor(() =>
      expect(employeeCalls(mock)[employeeCalls(mock).length - 1]!.params).toEqual({
        page: 1,
        size: 25,
        organization_branch_id: 3,
      }),
    );
  });

  it("403 — «ruxsat yo'q»", async () => {
    mock.onGet(EMPLOYEES_LIST).reply(403, { detail: 'Forbidden' });
    await renderWithProviders(<UsersScreen />);
    expect(await screen.findByText("Bu bo'lim faqat administrator va bosh administrator uchun.")).toBeTruthy();
  });

  describe("har tab: faqat 403 — «Ruxsat yo'q», boshqa xato — qayta urinish", () => {
    const DENIED = "Ruxsat yo'q";
    const multiOrg = (status: number) =>
      mock.onGet(EMPLOYEES_LIST).reply((cfg) =>
        cfg.params?.is_multi_org_user ? [status, {}] : [200, { items: ACCOUNTS, total: 1, pages: 1 }],
      );
    const cases: [string, string, (status: number) => void][] = [
      ['Xodim hisoblari', 'accounts', (st) => mock.onGet(EMPLOYEES_LIST).reply(st, {})],
      ['Administratorlar', 'admins', (st) => mock.onGet(ADMINS).reply(st, {})],
      ['Rol vakillari', 'multiorg', multiOrg],
      ['Kiosk hisoblari', 'kiosk', (st) => mock.onGet(MULTI_MODAL_USERS).reply(st, {})],
    ];
    it.each(cases)('%s: 403 → ruxsat yo‘q', async (tab, _id, fail) => {
      fail(403);
      await renderWithProviders(<UsersScreen />);
      if (tab !== 'Xodim hisoblari') await fireEvent.press(await screen.findByText(tab));
      expect(await screen.findByText(DENIED)).toBeTruthy();
      expect(screen.queryByText('Qayta urinish')).toBeNull();
    });
    it.each(cases)('%s: 500 → xato + qayta urinish (ruxsat yo‘q emas)', async (tab, _id, fail) => {
      fail(500);
      await renderWithProviders(<UsersScreen />);
      if (tab !== 'Xodim hisoblari') await fireEvent.press(await screen.findByText(tab));
      expect(await screen.findByText('Qayta urinish')).toBeTruthy();
      expect(screen.queryByText(DENIED)).toBeNull();
    });
  });

  it('administratorlar: yangi — pochta majburiy, parol ≥ 8; bo‘sh parol null (pochtaga), filial bo‘sh — null', async () => {
    mock.onPost(ADMINS).reply(200, { id: 6 });
    await renderWithProviders(<UsersScreen />);
    await fireEvent.press(await screen.findByText('Administratorlar'));
    expect(await screen.findByText('admin@chorvoq.uz')).toBeTruthy();
    expect(await screen.findByText('Chorvoq GES')).toBeTruthy();
    expect(mock.history.get.find((r) => r.url === ADMINS)!.params).toEqual({ page: 1, size: 200 });

    await fireEvent.press(screen.getByTestId('admin-new'));
    await fireEvent.press(await screen.findByTestId('admin-form-save'));
    expect(screen.getByTestId('admin-form-error')).toHaveTextContent('Elektron pochtani kiriting.');
    await fireEvent.changeText(screen.getByTestId('admin-form-email'), ' new@uz.uz ');
    await fireEvent.changeText(screen.getByTestId('admin-form-password'), 'short');
    expect(screen.getByTestId('admin-form-password').props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByTestId('admin-form-save'));
    expect(screen.getByTestId('admin-form-error')).toHaveTextContent("Parol kamida 8 ta belgidan iborat bo'lsin.");
    await fireEvent.changeText(screen.getByTestId('admin-form-password'), '');
    await fireEvent.press(screen.getByTestId('admin-form-save'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({
      email: 'new@uz.uz',
      password: null,
      organization_branch_id: null,
    });
  });

  it('administrator: parol xati va o‘chirish — tasdiq bilan; server xatosi tarjima qilinadi', async () => {
    mock.onPost(ADMIN_SEND_PASSWORD(5)).reply(200, { detail: 'ok' });
    mock.onDelete(ADMIN(5)).reply(200, {});
    mock.onPatch(ADMIN(5)).reply(400, { code: 'admin_email_exists', detail: 'exists' });
    await renderWithProviders(<UsersScreen />);
    await fireEvent.press(await screen.findByText('Administratorlar'));
    await fireEvent.press(await screen.findByTestId('admin-row-5'));
    await fireEvent.press(await screen.findByTestId('admin-send-password'));
    await waitFor(() => expect(mock.history.post.map((r) => r.url)).toEqual([ADMIN_SEND_PASSWORD(5)]));
    await fireEvent.press(screen.getByTestId('admin-delete'));
    await waitFor(() => expect(mock.history.delete.map((r) => r.url)).toEqual([ADMIN(5)]));
    expect(confirm).toHaveBeenLastCalledWith(expect.objectContaining({ destructive: true }));

    await fireEvent.press(await screen.findByTestId('admin-row-5'));
    await fireEvent.press(await screen.findByTestId('admin-edit'));
    await fireEvent.press(await screen.findByTestId('admin-form-save'));
    expect(await screen.findByText('Bu e-pochta bilan administrator allaqachon mavjud')).toBeTruthy();
    // Tahrirda bo'sh parol yuborilmaydi.
    expect(JSON.parse(mock.history.patch[0]!.data)).toEqual({ email: 'admin@chorvoq.uz', organization_branch_id: 2 });
  });

  it('rol vakillari: M2M filial filtri, rol nomi va KPI nishoni; tafsilot — biriktirilgan filiallar', async () => {
    await renderWithProviders(<UsersScreen />);
    await fireEvent.press(await screen.findByText('Rol vakillari'));
    expect(await screen.findByText('Rahimov Kadr')).toBeTruthy();
    const call = employeeCalls(mock).find((r) => r.params?.is_multi_org_user)!;
    expect(call.params).toEqual({ is_multi_org_user: true, include_multi_org: true, page: 1, size: 25 });
    expect(screen.getByTestId('multiorg-role-31')).toHaveTextContent('Inson resurslarini boshqarish');
    expect(screen.getByText('KPI administratori')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('multiorg-row-31'));
    expect(await screen.findByTestId('multiorg-branches')).toHaveTextContent('Chorvoq GES, Farhod GES');
    expect(screen.getByText('05.10.2026')).toBeTruthy();
  });

  it("kiosk: id siz qator tashlanadi; tahrirda login o'zgarmaydi, bo'sh parol yuborilmaydi, qisqa parol rad", async () => {
    mock.onPatch(MULTI_MODAL_USER(9)).reply(200, KIOSKS[0]);
    mock.onPost(MULTI_MODAL_USER_SEND_PASSWORD(9)).reply(200, {});
    await renderWithProviders(<UsersScreen />);
    await fireEvent.press(await screen.findByText('Kiosk hisoblari'));
    expect(await screen.findByText('KPP 1')).toBeTruthy();
    expect(screen.queryByText('broken')).toBeNull();
    expect(screen.getByTestId('kiosk-role-9')).toHaveTextContent('KPP posti');
    // JShShIR ro'yxatda ko'rinmaydi.
    expect(screen.queryByText('12345678901234')).toBeNull();

    await fireEvent.press(screen.getByTestId('kiosk-row-9'));
    await fireEvent.press(await screen.findByTestId('kiosk-send-password'));
    await waitFor(() => expect(mock.history.post.map((r) => r.url)).toEqual([MULTI_MODAL_USER_SEND_PASSWORD(9)]));
    await fireEvent.press(screen.getByTestId('kiosk-edit'));
    expect(await screen.findByTestId('kiosk-form-username-fixed')).toHaveTextContent('post1');
    expect(screen.queryByTestId('kiosk-form-username')).toBeNull();
    await fireEvent.changeText(screen.getByTestId('kiosk-form-password'), 'abc');
    await fireEvent.press(screen.getByTestId('kiosk-form-save'));
    expect(screen.getByTestId('kiosk-form-error')).toHaveTextContent("Parol kamida 8 belgidan iborat bo'lishi kerak");
    await fireEvent.changeText(screen.getByTestId('kiosk-form-password'), '');
    await fireEvent.press(screen.getByTestId('kiosk-form-role-monitoring-operator'));
    await fireEvent.press(screen.getByTestId('kiosk-form-save'));
    await waitFor(() => expect(mock.history.patch).toHaveLength(1));
    expect(JSON.parse(mock.history.patch[0]!.data)).toEqual({
      legal_name: 'KPP 1',
      role: 'monitoring-operator',
      organization_branch_ids: [2],
      personal_identification_number: '12345678901234',
    });
  });

  it('kiosk yaratish: filialsiz rad etiladi', async () => {
    await renderWithProviders(<UsersScreen />);
    await fireEvent.press(await screen.findByText('Kiosk hisoblari'));
    await fireEvent.press(await screen.findByTestId('kiosk-new'));
    await fireEvent.changeText(await screen.findByTestId('kiosk-form-username'), 'post2');
    await fireEvent.changeText(screen.getByTestId('kiosk-form-password'), 'Secret123');
    await fireEvent.press(screen.getByTestId('kiosk-form-save'));
    expect(screen.getByTestId('kiosk-form-error')).toHaveTextContent('Kamida bitta filial tanlang', { exact: false });
    expect(mock.history.post).toHaveLength(0);
  });
});
