import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import i18n from '@/i18n';
import {
  EMPLOYEES_LIST,
  LETTER_NEXT_REG_NUMBER,
  ORGANIZATION_BRANCH,
  ORGANIZATION_BRANCHES,
  ORGANIZATION_BRANCH_DOC_TEMPLATE,
  ORGANIZATION_BRANCH_LEADER,
  ORGANIZATION_BRANCH_LEADERS,
  ORGANIZATION_BRANCH_TABEL_TEMPLATE,
  USER_INFO,
} from '@/api/urls';
import TabelSettingsScreen from '../screens/TabelSettingsScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));
jest.mock('@/lib/toast', () => ({ ...jest.requireActual('@/lib/toast'), toast: { success: jest.fn(), error: jest.fn() } }));

const master = { id: 1, type: 'master-admin' };
// Hamshira — faqat 2-filial rahbari: bitta filial, sozlash bor, rahbarlar ro'yxati yo'q (direktor / AKT emas).
const nurse = { id: 3, type: 'employee', employee: { id: 30 }, nurse_branch_ids: [2] };

const BRANCHES = [
  { id: 1, name: 'Ijro apparati', is_head_office: true, tabel_config: {} },
  {
    id: 2,
    name: 'Chorvoq GES',
    bildirgi_number_prefix: '38',
    stamp_path: 'https://minio.example/stamp.png',
    tabel_config: {
      approver: { org: 'Chorvoq', title: 'Direktor', name: 'A. Valiyev' },
      title_prefix: 'Chorvoq GES xodimlarining',
      signers: [{ position: 'Bosh hisobchi', name: 'B. Karimov' }],
      stamp_coords: { number: [60, 50], day: [20, 80], month: [50, 80], year: [70, 80], font_pct: 18 },
      late_grace_minutes: 10,
      default_work_start: '08:00',
    },
    document_templates: {
      tabel: { file: { name: 'x.xlsx', original: 'Chorvoq tabel.xlsx' } },
      explanatory: {
        title: 'BILDIRGI',
        blocks: { addressee: false },
        file: { name: 'b.docx', original: 'Blank.docx' },
      },
    },
  },
  { id: 3, name: 'Farhod GES', tabel_config: null },
];

describe('TabelSettingsScreen (v2 TabelSettingsPage)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    (confirm as jest.Mock).mockClear();
    (toast.success as jest.Mock).mockClear();
    useAuthStore.setState({ user: master as never, isAuthenticated: true } as never);
    mock.onGet(ORGANIZATION_BRANCHES).reply(200, BRANCHES);
    mock.onGet(LETTER_NEXT_REG_NUMBER).reply(200, { next_number: '38-101', last_number: '38-100' });
  });
  afterEach(() => mock.reset());

  it('ro‘yxat: tasdiqlovchi (yo‘q — «Standart»), imzo egalari soni, shtamp; qidiruv mijozda; doira — barcha filiallar', async () => {
    await renderWithProviders(<TabelSettingsScreen />);
    expect(await screen.findByText('Chorvoq GES')).toBeTruthy();
    expect(screen.getByText('A. Valiyev')).toBeTruthy();
    expect(screen.getAllByText('Standart')).toHaveLength(2);
    expect(screen.getByText('1 ta imzo egasi')).toBeTruthy();
    expect(screen.getAllByText('3 ta imzo egasi')).toHaveLength(2);
    expect(screen.getByTestId('tabel-count')).toHaveTextContent('Jami: 3 ta filial');
    expect(screen.getByText('Barcha filiallar')).toBeTruthy();
    await fireEvent.changeText(screen.getByPlaceholderText("Filial nomi bo'yicha izlash…"), 'farhod');
    expect(screen.queryByText('Chorvoq GES')).toBeNull();
    expect(screen.getByTestId('tabel-count')).toHaveTextContent('Jami: 1 ta filial');
    expect(mock.history.get.filter((r) => r.url === ORGANIZATION_BRANCHES)).toHaveLength(1);
  });

  it('tabel sozlash: forma saqlangandan, keyingi raqam, ish vaqti soat tanlagichi; tana v2 bilan aynan (shtamp joylashuvi o‘zgarmaydi)', async () => {
    mock.onPatch(ORGANIZATION_BRANCH(2)).reply(200, { id: 2 });
    await renderWithProviders(<TabelSettingsScreen />);
    await fireEvent.press(await screen.findByTestId('tabel-row-2'));
    expect(screen.getByTestId('tabel-template')).toHaveTextContent('Chorvoq tabel.xlsx');
    await fireEvent.press(screen.getByTestId('tabel-open-config'));
    await waitFor(() => expect(screen.getByTestId('cfg-next-number')).toHaveTextContent('38-101'));
    expect(mock.history.get.find((r) => r.url === LETTER_NEXT_REG_NUMBER)?.params).toEqual({
      organization_branch_id: 2,
    });
    expect(screen.getByTestId('cfg-approver-name').props.value).toBe('A. Valiyev');
    expect(screen.getByTestId('cfg-coord-number')).toHaveTextContent('X 60 · Y 50');

    await fireEvent.changeText(screen.getByTestId('cfg-late-grace'), '250');
    await fireEvent(screen.getByTestId('cfg-auto-full-day'), 'valueChange', true);
    await fireEvent.changeText(screen.getByTestId('cfg-guvohnoma-prefix'), ' E ');
    await fireEvent.changeText(screen.getByTestId('cfg-guvohnoma-start'), '99');
    // Tushlik: soat tanlansa daqiqa — :00 (v2 ClockSelect).
    await fireEvent.press(screen.getByTestId('cfg-lunch-start-hour'));
    await fireEvent.changeText(await screen.findByPlaceholderText('Qidirish...'), '13');
    // Soat tanlagichi faqat soatni ko'rsatadi («13», «13:00» emas) — daqiqa alohida maydonda.
    expect(screen.queryByText('13:00')).toBeNull();
    await fireEvent.press(await screen.findByText('13'));
    expect(screen.getByTestId('cfg-lunch-start-hour')).toHaveTextContent('13');
    expect(screen.getByTestId('cfg-lunch-start-hour')).not.toHaveTextContent('13:00');
    expect(screen.getByTestId('cfg-lunch-start-minute')).toHaveTextContent('00');
    await fireEvent.press(screen.getByTestId('cfg-signer-add'));
    await fireEvent.changeText(screen.getByTestId('cfg-signer-position-1'), 'Kadr');
    await fireEvent.press(screen.getByTestId('cfg-save'));

    await waitFor(() => expect(mock.history.patch).toHaveLength(1));
    expect(JSON.parse(mock.history.patch[0]!.data)).toEqual({
      tabel_config: {
        approver: { org: 'Chorvoq', title: 'Direktor', name: 'A. Valiyev' },
        title_prefix: 'Chorvoq GES xodimlarining',
        signers: [
          { position: 'Bosh hisobchi', name: 'B. Karimov' },
          { position: 'Kadr', name: '' },
        ],
        stamp_coords: { number: [60, 50], day: [20, 80], month: [50, 80], year: [70, 80], font_pct: 18 },
        registration_start: null,
        guvohnoma_number_prefix: 'E',
        guvohnoma_number_start: 99,
        late_grace_minutes: 180,
        default_work_start: '08:00',
        default_work_end: null,
        default_lunch_start: '13:00',
        default_lunch_end: null,
        auto_full_day: true,
      },
      bildirgi_number_prefix: '38',
    });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Tabel sozlamalari saqlandi'));
    // Ro'yxat qayta o'qiladi — boshqa ekranlar ham yangi qiymatni ko'radi.
    await waitFor(() => expect(mock.history.get.filter((r) => r.url === ORGANIZATION_BRANCHES).length).toBe(2));
  });

  it('Excel shablonni olib tashlash — tasdiq bilan; server xatosi formada', async () => {
    mock.onDelete(ORGANIZATION_BRANCH_TABEL_TEMPLATE(2)).reply(200, { id: 2 });
    mock.onPatch(ORGANIZATION_BRANCH(2)).reply(422, { detail: [{ msg: 'late_grace_minutes noto‘g‘ri' }] });
    await renderWithProviders(<TabelSettingsScreen />);
    await fireEvent.press(await screen.findByTestId('tabel-row-2'));
    await fireEvent.press(screen.getByTestId('tabel-open-config'));
    await fireEvent.press(await screen.findByTestId('cfg-template-remove'));
    await waitFor(() => expect(mock.history.delete.map((r) => r.url)).toEqual([ORGANIZATION_BRANCH_TABEL_TEMPLATE(2)]));
    expect(confirm).toHaveBeenLastCalledWith(expect.objectContaining({ destructive: true }));
    await fireEvent.press(screen.getByTestId('cfg-save'));
    expect(await screen.findByTestId('cfg-error')).toHaveTextContent('late_grace_minutes noto‘g‘ri');
  });

  it('konfiguratsiyasiz filial — standart tasdiqlovchi, imzo egalari va shtamp joylashuvi bilan yuboriladi; keyingi raqam filialdan tashqariga so‘ralmaydi', async () => {
    useAuthStore.setState({
      user: {
        id: 4,
        type: 'employee',
        is_executive_hr: true,
        employee: {
          id: 40,
          is_multi_org_user: true,
          multi_org_employee_role: 'hr',
          department: { organization_branch_id: 1 },
        },
      } as never,
    } as never);
    mock.onPatch(ORGANIZATION_BRANCH(3)).reply(200, { id: 3 });
    await renderWithProviders(<TabelSettingsScreen />);
    await fireEvent.press(await screen.findByTestId('tabel-row-3'));
    await fireEvent.press(screen.getByTestId('tabel-open-config'));
    await fireEvent.press(await screen.findByTestId('cfg-save'));
    await waitFor(() => expect(mock.history.patch).toHaveLength(1));
    const body = JSON.parse(mock.history.patch[0]!.data);
    expect(body.tabel_config.approver.name).toBe('Ф. Нуруллаев');
    expect(body.tabel_config.signers).toHaveLength(3);
    expect(body.tabel_config.stamp_coords.number).toEqual([66.6, 57.8]);
    expect(body.tabel_config.auto_full_day).toBe(false);
    expect(mock.history.get.some((r) => r.url === LETTER_NEXT_REG_NUMBER)).toBe(false);
  });

  it('bitta filial (filial rahbari) — jadvalsiz, to‘g‘ridan-to‘g‘ri; rahbarlar ro‘yxati faqat direktor / AKT ga', async () => {
    useAuthStore.setState({ user: nurse as never } as never);
    await renderWithProviders(<TabelSettingsScreen />);
    expect(await screen.findByTestId('tabel-sole')).toBeTruthy();
    expect(screen.getByText("Faqat o'z filialing")).toBeTruthy();
    expect(screen.queryByTestId('tabel-count')).toBeNull();
    expect(screen.getByTestId('tabel-open-config')).toBeTruthy();
    expect(screen.getByTestId('tabel-open-blank')).toBeTruthy();
    expect(screen.queryByTestId('tabel-open-leaders')).toBeNull();
  });

  it('rahbarlar: olib tashlash, rolni almashtirish, dublikat rad, yangi qo‘shish; saqlash — tasdiq, avval DELETE ?role=, keyin POST, so‘ng /auth/me', async () => {
    mock.onGet(ORGANIZATION_BRANCH_LEADERS(2)).reply(200, [
      { employee_id: 10, leadership_role: 'director', employee: { id: 10, legal_name: 'Ali Valiyev' } },
      { employee_id: 11, leadership_role: 'nurse', employee: { id: 11, legal_name: 'Zebo Karimova' } },
    ]);
    mock
      .onGet(EMPLOYEES_LIST)
      .reply(200, { items: [{ id: 12, legal_name: 'Olim Sobirov', job_position: { name: 'Muhandis' } }] });
    mock.onDelete(ORGANIZATION_BRANCH_LEADER(2, 11)).reply(200, {});
    mock.onPost(ORGANIZATION_BRANCH_LEADERS(2)).reply(200, []);
    mock.onGet(USER_INFO).reply(200, master);
    await renderWithProviders(<TabelSettingsScreen />);
    await fireEvent.press(await screen.findByTestId('tabel-row-2'));
    await fireEvent.press(screen.getByTestId('tabel-open-leaders'));
    expect(await screen.findByText('Ali Valiyev')).toBeTruthy();
    expect(screen.getByTestId('leader-save').props.accessibilityState?.disabled).toBe(true);

    await fireEvent.press(screen.getByTestId('leader-employee'));
    await waitFor(() => expect(mock.history.get.some((r) => r.url === EMPLOYEES_LIST)).toBe(true));
    expect(mock.history.get.find((r) => r.url === EMPLOYEES_LIST)?.params).toEqual({
      organization_branch_id: 2,
      size: 20,
    });
    await fireEvent.press(await screen.findByText('Olim Sobirov'));
    await fireEvent.press(screen.getByTestId('leader-add'));
    expect(await screen.findByText('Olim Sobirov')).toBeTruthy();
    expect(screen.getByText('yangi')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('leader-row-12:director'));
    await fireEvent.press(await screen.findByText('Texnik yordam (AKT)'));
    expect(screen.getByTestId('leader-row-12:akt')).toBeTruthy();
    // Dublikat: Olim AKT sifatida yana qo'shilmaydi (PickerModal ro'yxatdan keyin chiziladi — oxirgi matn).
    await fireEvent.press(screen.getByTestId('leader-employee'));
    const olim = await screen.findAllByText('Olim Sobirov');
    await fireEvent.press(olim[olim.length - 1]!);
    await fireEvent.press(screen.getByTestId('leader-role'));
    const akt = await screen.findAllByText('Texnik yordam (AKT)');
    await fireEvent.press(akt[akt.length - 1]!);
    await fireEvent.press(screen.getByTestId('leader-add'));
    expect(screen.getByTestId('leader-error')).toHaveTextContent("Bu xodim shu rol bilan allaqachon qo'shilgan");
    // Sayt master-admini AKT tanlasa — nomzodlar filial filtrisiz (v1/v2).
    await fireEvent.press(screen.getByTestId('leader-employee'));
    await waitFor(() =>
      expect(mock.history.get.filter((r) => r.url === EMPLOYEES_LIST).map((r) => r.params)).toContainEqual({
        size: 20,
      }),
    );
    await fireEvent.press((await screen.findAllByText('Olim Sobirov')).slice(-1)[0]!);

    await fireEvent.press(screen.getByTestId('leader-remove-11:nurse'));
    expect(screen.queryByText('Zebo Karimova')).toBeNull();
    expect(screen.getByTestId('leader-unsaved')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('leader-save'));

    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(confirm).toHaveBeenLastCalledWith(
      expect.objectContaining({ destructive: true, message: '1 ta rahbar tayinlovi olib tashlanadi. Saqlaysizmi?' }),
    );
    expect(mock.history.delete.map((r) => [r.url, r.params])).toEqual([
      [ORGANIZATION_BRANCH_LEADER(2, 11), { role: 'nurse' }],
    ]);
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({ employee_id: 12, leadership_role: 'akt' });
    await waitFor(() => expect(mock.history.get.some((r) => r.url === USER_INFO)).toBe(true));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Rahbarlar saqlandi'));
  });

  it('rahbarlar: olib tashlash tasdig‘i rad etilsa so‘rov yo‘q; qisman xato — varaq ochiq, xato matni', async () => {
    mock
      .onGet(ORGANIZATION_BRANCH_LEADERS(2))
      .reply(200, [{ employee_id: 10, leadership_role: 'director', employee: { id: 10, legal_name: 'Ali Valiyev' } }]);
    mock.onDelete(ORGANIZATION_BRANCH_LEADER(2, 10)).reply(403, { detail: 'yo‘q' });
    mock.onGet(USER_INFO).reply(200, master);
    (confirm as jest.Mock).mockResolvedValueOnce(false);
    await renderWithProviders(<TabelSettingsScreen />);
    await fireEvent.press(await screen.findByTestId('tabel-row-2'));
    await fireEvent.press(screen.getByTestId('tabel-open-leaders'));
    await fireEvent.press(await screen.findByTestId('leader-remove-10:director'));
    await fireEvent.press(screen.getByTestId('leader-save'));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(mock.history.delete).toHaveLength(0);
    await fireEvent.press(screen.getByTestId('leader-save'));
    expect(await screen.findByTestId('leader-error')).toHaveTextContent('Rahbarlarni saqlashda xato');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('hujjat blanki: tayyor fayl holati va olib tashlash (tasdiq), bloklar, sarlavha qatori, logo eni chegarasi; faqat shu tur yuboriladi', async () => {
    mock.onPatch(ORGANIZATION_BRANCH(2)).reply(200, { id: 2 });
    mock.onDelete(ORGANIZATION_BRANCH_DOC_TEMPLATE(2, 'explanatory')).reply(200, { id: 2 });
    await renderWithProviders(<TabelSettingsScreen />);
    await fireEvent.press(await screen.findByTestId('tabel-row-2'));
    await fireEvent.press(screen.getByTestId('tabel-open-blank'));
    expect(await screen.findByText('Blank.docx')).toBeTruthy();
    expect(screen.getByTestId('blank-block-addressee').props.value).toBe(false);
    expect(screen.getByTestId('blank-block-sign_qr').props.value).toBe(true);
    await fireEvent.press(screen.getByTestId('blank-file-remove'));
    await waitFor(() =>
      expect(mock.history.delete.map((r) => r.url)).toEqual([ORGANIZATION_BRANCH_DOC_TEMPLATE(2, 'explanatory')]),
    );

    await fireEvent(screen.getByTestId('blank-block-sign_qr'), 'valueChange', false);
    await fireEvent.press(screen.getByTestId('blank-line-add'));
    await fireEvent.changeText(screen.getByTestId('blank-line-0'), '  Chorvoq GES  ');
    await fireEvent.changeText(screen.getByTestId('blank-logo-width'), '9');
    await fireEvent.press(screen.getByTestId('blank-save'));
    expect(screen.getByTestId('blank-error')).toHaveTextContent("Logo eni 0.5 dan 8 sm gacha bo'lsin");
    expect(mock.history.patch).toHaveLength(0);
    await fireEvent.changeText(screen.getByTestId('blank-logo-width'), '3,5');
    await fireEvent.changeText(screen.getByTestId('blank-margin-left'), '2');
    await fireEvent.press(screen.getByTestId('blank-save'));
    await waitFor(() => expect(mock.history.patch).toHaveLength(1));
    expect(JSON.parse(mock.history.patch[0]!.data)).toEqual({
      document_templates: {
        explanatory: {
          title: 'BILDIRGI',
          blocks: { addressee: false, sign_qr: false },
          header_lines: ['Chorvoq GES'],
          logo_width_cm: 3.5,
          margins: { left: 2 },
        },
      },
    });
  });

  it('blank: buyruq turida shahar bloki va KIRITILDI bo‘limi; tur almashsa forma saqlangandan qayta', async () => {
    await renderWithProviders(<TabelSettingsScreen />);
    await fireEvent.press(await screen.findByTestId('tabel-row-2'));
    await fireEvent.press(screen.getByTestId('tabel-open-blank'));
    await fireEvent.press(await screen.findByText('Buyruq'));
    expect(screen.getByTestId('blank-block-city')).toBeTruthy();
    expect(screen.getByTestId('blank-block-signature_section')).toBeTruthy();
    expect(screen.queryByTestId('blank-block-addressee')).toBeNull();
    expect(screen.getByTestId('blank-city-text')).toBeTruthy();
    expect(screen.getByTestId('blank-file')).toHaveTextContent('yuklanmagan');
  });
});
