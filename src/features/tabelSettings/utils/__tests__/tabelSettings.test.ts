import type { User } from '@/types';
import {
  branchScope,
  buildConfigBody,
  canPreviewNumber,
  DEFAULT_STAMP_COORDS,
  DEFAULT_TABEL_CONFIG,
  filterTabelBranches,
  sanitizeStampCoords,
  seedConfigForm,
  setClockHour,
  setClockMinute,
  signersCountOf,
  approverOf,
  tabelTemplateName,
  CLOCK_HOURS,
  CLOCK_MINUTES,
  type TabelBranch,
} from '../tabelConfig';
import {
  addPending,
  changePendingRole,
  hasLeaderChanges,
  leaderKey,
  leadersDiff,
  removePending,
  LEADERSHIP_ROLES,
  type BranchLeader,
} from '../leaders';
import {
  blockOn,
  blocksFor,
  buildBlankBody,
  parseDecimal,
  seedBlank,
  toggleBlock,
  uploadedFile,
  validateBlank,
} from '../blank';

const u = (x: Record<string, unknown>) => x as unknown as User;
const master = u({ id: 1, type: 'master-admin' });
const hr = (branchId: number, extra: Record<string, unknown> = {}) =>
  u({
    id: 2,
    type: 'employee',
    employee: {
      id: 2,
      is_multi_org_user: true,
      multi_org_employee_role: 'hr',
      department: { organization_branch_id: branchId },
    },
    ...extra,
  });

const BRANCHES: TabelBranch[] = [
  { id: 1, name: 'Ijro apparati', is_head_office: true },
  { id: 2, name: 'Chorvoq GES' },
  { id: 3, name: 'Farhod GES' },
];

describe('filial doirasi (v2 TabelSettingsPage)', () => {
  it('bosh admin va ijro apparati kadri — hammasi; filial kadri — faqat o‘zi (bitta → to‘g‘ridan-to‘g‘ri)', () => {
    expect(branchScope(master, BRANCHES)).toMatchObject({ isGlobal: true, execBranchId: 1, sole: null });
    expect(branchScope(master, BRANCHES).visible).toHaveLength(3);
    expect(branchScope(hr(1), BRANCHES)).toMatchObject({ isGlobal: true });
    const own = branchScope(hr(2), BRANCHES);
    expect(own.isGlobal).toBe(false);
    expect(own.visible.map((b) => b.id)).toEqual([2]);
    expect(own.sole?.id).toBe(2);
  });

  it('filial rahbari (direktor) bir nechta filialda — ro‘yxat, bitta emas', () => {
    const director = u({ id: 3, type: 'employee', employee: { id: 3 }, director_branch_ids: [2, 3] });
    const s = branchScope(director, BRANCHES);
    expect(s.visible.map((b) => b.id)).toEqual([2, 3]);
    expect(s.sole).toBeNull();
    expect(branchScope(u({ id: 4, type: 'employee', employee: { id: 4 } }), BRANCHES).visible).toEqual([]);
  });

  it('qidiruv nom bo‘yicha, katta-kichik harfsiz', () => {
    expect(filterTabelBranches(BRANCHES, ' ges ').map((b) => b.id)).toEqual([2, 3]);
    expect(filterTabelBranches(BRANCHES, '')).toHaveLength(3);
  });

  it('qator: tasdiqlovchi, imzo egalari soni (konfiguratsiyasiz — 3), Excel shablon nomi', () => {
    expect(approverOf({ id: 1 })).toBeNull();
    expect(approverOf({ id: 1, tabel_config: { approver: { name: 'A. Valiyev' } } })).toBe('A. Valiyev');
    expect(signersCountOf({ id: 1 })).toBe(3);
    expect(signersCountOf({ id: 1, tabel_config: { signers: [{ position: 'x', name: '' }] } })).toBe(1);
    expect(
      tabelTemplateName({ id: 1, document_templates: { tabel: { file: { name: 'a.xlsx', original: 'Tabel.xlsx' } } } }),
    ).toBe('Tabel.xlsx');
    expect(tabelTemplateName({ id: 1, document_templates: { tabel: { file: { name: 'a.xlsx' } } } })).toBe('a.xlsx');
    expect(tabelTemplateName({ id: 1, document_templates: {} })).toBeNull();
  });

  it('keyingi raqamni ko‘rish — sayt master-admini yoki filial a‘zosi', () => {
    expect(canPreviewNumber(master, 3)).toBe(true);
    expect(canPreviewNumber(hr(2), 2)).toBe(true);
    expect(canPreviewNumber(hr(1, { is_executive_hr: true }), 3)).toBe(false);
  });
});

describe('tabel konfiguratsiyasi formasi va tanasi (v2 TabelConfigModal.save)', () => {
  it('konfiguratsiyasiz filial — standartdan; imzo egalari bo‘sh bo‘lsa bitta bo‘sh qator', () => {
    const f = seedConfigForm({ id: 2, tabel_config: {} });
    expect(f.approverName).toBe(DEFAULT_TABEL_CONFIG.approver!.name);
    expect(f.signers).toHaveLength(3);
    expect(f.lateGrace).toBe('');
    expect(f.autoFullDay).toBe(false);
    const g = seedConfigForm({ id: 2, tabel_config: { title_prefix: 'X', signers: [] } });
    expect(g.signers).toEqual([{ position: '', name: '' }]);
  });

  it('tana: to‘liq tabel_config, raqamlar, imtiyoz 0–180, bo‘sh vaqt → null, auto_full_day false, prefiks trim', () => {
    const branch: TabelBranch = {
      id: 2,
      bildirgi_number_prefix: 'B',
      tabel_config: {
        approver: { org: 'Org', title: 'Rais', name: 'A. B.' },
        title_prefix: 'T',
        signers: [{ position: 'Hisobchi', name: '' }],
        stamp_coords: { number: [10, '20'], font_pct: 'x' },
        late_grace_minutes: 10,
        default_work_start: '08:00',
        auto_full_day: true,
      },
    };
    const f = seedConfigForm(branch);
    expect(f).toMatchObject({ lateGrace: '10', workStart: '08:00', autoFullDay: true, bildirgiPrefix: 'B' });
    const body = buildConfigBody(
      {
        ...f,
        bildirgiPrefix: ' 38 ',
        registrationStart: '-5',
        guvohnomaPrefix: '  ',
        guvohnomaStart: '99',
        lateGrace: '500',
        workEnd: '',
        autoFullDay: false,
        signers: [...f.signers, { position: ' ', name: '' }, { position: '', name: 'Ism' }],
      },
      branch,
    );
    expect(body).toEqual({
      tabel_config: {
        approver: { org: 'Org', title: 'Rais', name: 'A. B.' },
        title_prefix: 'T',
        signers: [
          { position: 'Hisobchi', name: '' },
          { position: '', name: 'Ism' },
        ],
        stamp_coords: { ...DEFAULT_STAMP_COORDS, number: [10, 20] },
        registration_start: 0,
        guvohnoma_number_prefix: null,
        guvohnoma_number_start: 99,
        late_grace_minutes: 180,
        default_work_start: '08:00',
        default_work_end: null,
        default_lunch_start: null,
        default_lunch_end: null,
        auto_full_day: false,
      },
      bildirgi_number_prefix: '38',
    });
    expect(buildConfigBody({ ...f, lateGrace: '', registrationStart: '' }, branch).tabel_config).toMatchObject({
      late_grace_minutes: null,
      registration_start: null,
    });
    expect(buildConfigBody({ ...f, lateGrace: 'abc' }, branch).tabel_config.late_grace_minutes).toBe(0);
  });

  it('shtamp koordinatalari son emas bo‘lsa standart', () => {
    expect(sanitizeStampCoords(undefined)).toEqual(DEFAULT_STAMP_COORDS);
    expect(sanitizeStampCoords({ day: [undefined, 'a'] }).day).toEqual(DEFAULT_STAMP_COORDS.day);
  });

  it('soat tanlagichi (v2 ClockSelect): soat → :00, soat tozalansa hammasi; daqiqa soatsiz → 00:MM', () => {
    expect(CLOCK_HOURS).toHaveLength(24);
    expect(CLOCK_MINUTES).toEqual(['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']);
    expect(setClockHour('', '08')).toBe('08:00');
    expect(setClockHour('09:30', '08')).toBe('08:30');
    expect(setClockHour('09:30', '')).toBe('');
    expect(setClockMinute('09:00', '45')).toBe('09:45');
    expect(setClockMinute('', '15')).toBe('00:15');
  });
});

describe('filial rahbarlari (v2 BranchLeadersModal)', () => {
  const ORIGINAL: BranchLeader[] = [
    { employee_id: 10, leadership_role: 'director', employee: { id: 10, legal_name: 'Ali' } },
    { employee_id: 11, leadership_role: 'akt', employee: { id: 11, legal_name: 'Vali' } },
  ];

  it('rollar — server ro‘yxati bilan to‘liq (13 ta)', () => {
    expect(LEADERSHIP_ROLES).toHaveLength(13);
    expect(LEADERSHIP_ROLES).toEqual(expect.arrayContaining(['nurse', 'hr', 'transport_approver', 'phone_editor']));
  });

  it('qo‘shish: dublikat rad etiladi, yangi — «yangi» belgisi va lavozim nomi bilan', () => {
    expect(addPending(ORIGINAL, { id: 10, legal_name: 'Ali' }, 'director')).toEqual({
      ok: false,
      error: 'tabelSettings.leaderDup',
    });
    const r = addPending(ORIGINAL, { id: 10, legal_name: 'Ali', job_position: { name: 'Bosh muhandis' } }, 'deputy');
    expect(r.ok && r.list[2]).toEqual({
      employee_id: 10,
      leadership_role: 'deputy',
      employee: { id: 10, legal_name: 'Ali', photo_path: null, job_position: { name: 'Bosh muhandis' } },
      _new: true,
    });
  });

  it('rolni almashtirish: shu xodimda o‘sha rol bo‘lsa rad', () => {
    const r = addPending(ORIGINAL, { id: 10 }, 'deputy');
    const list = r.ok ? r.list : [];
    expect(changePendingRole(list, '10:deputy', 'director')).toEqual({ ok: false, error: 'tabelSettings.leaderDup' });
    const ok = changePendingRole(ORIGINAL, '11:akt', 'nurse');
    expect(ok.ok && ok.list.map(leaderKey)).toEqual(['10:director', '11:nurse']);
  });

  it('o‘zgarish va farq: avval olib tashlanadiganlar, keyin qo‘shiladiganlar', () => {
    expect(
      hasLeaderChanges(
        ORIGINAL,
        ORIGINAL.map((l) => ({ ...l })),
      ),
    ).toBe(false);
    const changed = changePendingRole(ORIGINAL, '11:akt', 'nurse');
    const list = changed.ok ? changed.list : [];
    expect(hasLeaderChanges(ORIGINAL, list)).toBe(true);
    expect(leadersDiff(ORIGINAL, list)).toEqual({
      remove: [{ employee_id: 11, role: 'akt' }],
      add: [{ employee_id: 11, role: 'nurse' }],
    });
    const removed = removePending(ORIGINAL, '10:director');
    expect(leadersDiff(ORIGINAL, removed)).toEqual({ remove: [{ employee_id: 10, role: 'director' }], add: [] });
  });
});

describe('hujjat blanki (v2 BranchBlankModal)', () => {
  it('saqlangan blank, bloklar (tegilmagan = yoqilgan), hujjat turi bo‘yicha bloklar', () => {
    const tpl = {
      explanatory: { title: 'Bildirgi', blocks: { addressee: false }, file: { name: 'x.docx', original: 'B.docx' } },
    };
    const draft = seedBlank(tpl, 'explanatory');
    expect(uploadedFile(draft)?.original).toBe('B.docx');
    expect(seedBlank(tpl, 'decree')).toEqual({});
    expect(blockOn(draft, 'addressee')).toBe(false);
    expect(blockOn(draft, 'sign_qr')).toBe(true);
    expect(toggleBlock(draft, 'sign_qr').blocks).toEqual({ addressee: false, sign_qr: false });
    expect(blocksFor('explanatory')).toEqual(['number_date', 'addressee', 'sign_position', 'sign_qr']);
    expect(blocksFor('application')).toEqual(['addressee', 'sign_position', 'sign_qr']);
    expect(blocksFor('decree')).toEqual(['city', 'signature_section', 'sign_qr']);
  });

  it('o‘nlik son: vergul ham; bo‘sh / son emas — undefined', () => {
    expect(parseDecimal('2,5')).toBe(2.5);
    expect(parseDecimal(' ')).toBeUndefined();
    expect(parseDecimal('abc')).toBeUndefined();
  });

  it('server chegaralari: logo eni 0.5–8, chekkalar 0–10', () => {
    expect(validateBlank({ logo_width_cm: 0.4 })).toBe('tabelSettings.logoWidthRange');
    expect(validateBlank({ logo_width_cm: 8 })).toBeNull();
    expect(validateBlank({ margins: { left: 11 } })).toBe('tabelSettings.marginRange');
    expect(validateBlank({ margins: { top: 0 } })).toBeNull();
  });

  it('tana: faqat shu tur, `file` yuborilmaydi, bo‘sh qatorlar tashlanadi, tegilmagan kalit yo‘q', () => {
    const body = buildBlankBody('application', {
      file: { name: 'x' },
      title: 'Ariza',
      header_lines: [' Uzbekgidroenergo ', '', '  '],
    });
    expect(body).toEqual({
      document_templates: { application: { title: 'Ariza', header_lines: ['Uzbekgidroenergo'] } },
    });
  });
});
