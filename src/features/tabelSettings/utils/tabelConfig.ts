// Tabel sozlamalari (web v2 `TabelSettingsPage` + `features/tabel/useTabel`) — sof mantiq: filial doirasi
// (kim qaysi filialni ko'radi), ro'yxat qatori, tabel konfiguratsiyasi formasi va PATCH tanasi (v2 bilan
// aynan), soat tanlagichi (v2 `ClockSelect`).
//
// ⚠️ Server `tabel_config` ni BUTUNLAY almashtiradi (`model_dump(exclude_none=True)`), shuning uchun tana
// har safar to'liq yuboriladi — mobil'da tahrirlanmaydigan `stamp_coords` ham saqlangan qiymati bilan.
import type { User } from '@/types';
import {
  canAdministerBranch,
  canSwitchBranchScope,
  employeeBranchIds,
  isBranchAdmin,
  isHR,
  isSiteMasterAdmin,
} from '@/utils/roles';
import type { BranchBlank } from './blank';

export type Coord = [number, number];

export interface StampCoords {
  number: Coord;
  day: Coord;
  month: Coord;
  year: Coord;
  font_pct: number;
}

export interface TabelSigner {
  position: string;
  name: string;
}

export interface TabelConfig {
  approver?: { org?: string | null; title?: string | null; name?: string | null } | null;
  title_prefix?: string | null;
  signers?: TabelSigner[] | null;
  stamp_coords?: Partial<Record<'number' | 'day' | 'month' | 'year', unknown>> & { font_pct?: unknown };
  registration_start?: number | null;
  guvohnoma_number_prefix?: string | null;
  guvohnoma_number_start?: number | null;
  late_grace_minutes?: number | null;
  default_work_start?: string | null;
  default_work_end?: string | null;
  default_lunch_start?: string | null;
  default_lunch_end?: string | null;
  auto_full_day?: boolean | null;
}

/** `GET organization-branches` qatori (to'liq — `tabel_config`, shtamp, blanklar bilan). */
export interface TabelBranch {
  id: number;
  name?: string | null;
  tabel_config?: TabelConfig | null;
  bildirgi_number_prefix?: string | null;
  stamp_path?: string | null;
  stamp_filename?: string | null;
  logo_path?: string | null;
  document_templates?: (Record<string, BranchBlank | undefined> & { tabel?: unknown }) | null;
  is_head_office?: boolean | null;
}

/** `letters/next-registration-number` — keyingi ro'yxat raqami (oldindan ko'rish, hech narsa band qilinmaydi). */
export interface NextRegNumber {
  next_number?: string | null;
  last_number?: string | null;
  detail?: string | null;
}

/** Shtampdagi matn joylari (% — shtamp eni/bo'yidan), backend standarti bilan bir xil (v2). */
export const DEFAULT_STAMP_COORDS: StampCoords = {
  number: [66.6, 57.8],
  day: [25.1, 83.2],
  month: [50.8, 83.2],
  year: [72.9, 83.2],
  font_pct: 19.8,
};

/** Filialda konfiguratsiya bo'lmasa forma shundan to'ldiriladi (v2 / v1 `DEFAULT_TABEL_CONFIG`). Hujjat matni — tarjima qilinmaydi. */
export const DEFAULT_TABEL_CONFIG: TabelConfig = {
  approver: {
    org: '"Ўзбекгидроэнерго" акциядорлик жамияти',
    title: 'Бошқарув раиси ўринбосари',
    name: 'Ф. Нуруллаев',
  },
  title_prefix: '"Ўзбекгидроэнерго" АЖ ижро аппарати ходимларининг',
  signers: [
    { position: 'Бош ҳисобчи', name: '' },
    { position: 'Иқтисодий таҳлил, режалаштириш ва хавфларни баҳолаш департаменти бошлиғи', name: '' },
    { position: 'Инсон ресурслари бошқармаси бош мутахассиси', name: '' },
  ],
};

const num = (v: unknown, d: number) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
};
const pair = (arr: unknown, d: Coord): Coord => {
  const a = Array.isArray(arr) ? arr : [];
  return [num(a[0], d[0]), num(a[1], d[1])];
};

/** v2 `sanitizeStampCoords`: yuborishdan oldin songa keltiriladi (bo'sh/NaN → standart). */
export function sanitizeStampCoords(c?: TabelConfig['stamp_coords'] | null): StampCoords {
  return {
    number: pair(c?.number, DEFAULT_STAMP_COORDS.number),
    day: pair(c?.day, DEFAULT_STAMP_COORDS.day),
    month: pair(c?.month, DEFAULT_STAMP_COORDS.month),
    year: pair(c?.year, DEFAULT_STAMP_COORDS.year),
    font_pct: num(c?.font_pct, DEFAULT_STAMP_COORDS.font_pct),
  };
}

/** v2: konfiguratsiya bo'sh (yoki yo'q) bo'lsa — standart. */
export function effectiveConfig(branch: TabelBranch): TabelConfig {
  const cfg = branch.tabel_config;
  return cfg && Object.keys(cfg).length > 0 ? cfg : DEFAULT_TABEL_CONFIG;
}

// ─── Filial doirasi (v2 TabelSettingsPage) ───────────────────────────────────

export interface BranchScope {
  execBranchId: number | null;
  isGlobal: boolean;
  visible: TabelBranch[];
  /** Doirada bitta filial — jadval o'rniga uning sozlamalari to'g'ridan-to'g'ri. */
  sole: TabelBranch | null;
}

/**
 * v2: bosh admin, admin hisobi va «Barcha filiallar» doirasidagi kadr hamma filialni ko'radi; qolganlar —
 * faqat o'zi boshqaradiganlarini (`canAdministerBranch`, server `assert_branch_admin`). Bosh filial —
 * ro'yxatning `is_head_office` bayrog'idan.
 */
export function branchScope(user: User | null | undefined, branches: TabelBranch[]): BranchScope {
  const execBranchId = branches.find((b) => b.is_head_office)?.id ?? null;
  const isGlobal =
    isSiteMasterAdmin(user) || isBranchAdmin(user) || (isHR(user) && canSwitchBranchScope(user, execBranchId));
  const visible = isGlobal ? branches : branches.filter((b) => canAdministerBranch(user, b.id, { execBranchId }));
  return { execBranchId, isGlobal, visible, sole: !isGlobal && visible.length === 1 ? visible[0] : null };
}

/** v2: filial nomi bo'yicha qidiruv, mijozda. */
export function filterTabelBranches(rows: TabelBranch[], search: string): TabelBranch[] {
  const q = search.trim().toLowerCase();
  return q ? rows.filter((b) => (b.name || '').toLowerCase().includes(q)) : rows;
}

/** Ro'yxat ustunlari (v2): tasdiqlovchi ismi (bo'lmasa — «Standart»), imzo egalari soni (konfiguratsiyasiz — 3). */
export const approverOf = (b: TabelBranch): string | null => b.tabel_config?.approver?.name || null;
export const signersCountOf = (b: TabelBranch): number => b.tabel_config?.signers?.length ?? 3;

/**
 * Keyingi raqamni oldindan ko'rish: server (`peek_next_registered_number`) filialdan tashqaridagilarga
 * 403 beradi — sayt master-admini bundan mustasno (v2 `canPreviewNumber`).
 */
export function canPreviewNumber(user: User | null | undefined, branchId: number): boolean {
  return isSiteMasterAdmin(user) || employeeBranchIds(user).includes(Number(branchId));
}

/** Filialning o'z Excel tabel shabloni (`document_templates.tabel.file`) — fayl nomi yoki null (v2 `readTplMeta`). */
export function tabelTemplateName(b: TabelBranch): string | null {
  const entry = (b.document_templates?.tabel ?? null) as {
    file?: { original?: string | null; name?: string | null };
  } | null;
  return entry?.file?.name ? entry.file.original || entry.file.name : null;
}

// ─── Konfiguratsiya formasi ─────────────────────────────────────────────────

export interface ConfigForm {
  approverOrg: string;
  approverTitle: string;
  approverName: string;
  titlePrefix: string;
  bildirgiPrefix: string;
  registrationStart: string;
  guvohnomaPrefix: string;
  guvohnomaStart: string;
  /** Bo'sh — tizim sozlamasidagi umumiy qiymat. */
  lateGrace: string;
  workStart: string;
  workEnd: string;
  lunchStart: string;
  lunchEnd: string;
  autoFullDay: boolean;
  signers: TabelSigner[];
}

const str = (v: number | null | undefined) => (v != null ? String(v) : '');

/** v2 `TabelConfigModal` boshlang'ich holati. Imzo egalari bo'sh bo'lsa — bitta bo'sh qator. */
export function seedConfigForm(branch: TabelBranch): ConfigForm {
  const cfg = effectiveConfig(branch);
  return {
    approverOrg: cfg.approver?.org ?? '',
    approverTitle: cfg.approver?.title ?? '',
    approverName: cfg.approver?.name ?? '',
    titlePrefix: cfg.title_prefix ?? '',
    bildirgiPrefix: branch.bildirgi_number_prefix ?? '',
    registrationStart: str(cfg.registration_start),
    guvohnomaPrefix: cfg.guvohnoma_number_prefix ?? '',
    guvohnomaStart: str(cfg.guvohnoma_number_start),
    lateGrace: str(cfg.late_grace_minutes),
    workStart: cfg.default_work_start ?? '',
    workEnd: cfg.default_work_end ?? '',
    lunchStart: cfg.default_lunch_start ?? '',
    lunchEnd: cfg.default_lunch_end ?? '',
    autoFullDay: cfg.auto_full_day === true,
    signers: cfg.signers && cfg.signers.length > 0 ? cfg.signers.map((s) => ({ ...s })) : [{ position: '', name: '' }],
  };
}

/** Bo'sh — null; aks holda butun son, manfiy emas (v2: `Math.max(0, parseInt(v) || 0)`). */
const startNumber = (v: string): number | null => (v.trim() === '' ? null : Math.max(0, parseInt(v, 10) || 0));

/** v2 `save()` tanasi aynan: kechikish imtiyozi 0–180 ga qisiladi, `auto_full_day` — null emas, `false`. */
export function buildConfigBody(form: ConfigForm, branch: TabelBranch) {
  const cfg = effectiveConfig(branch);
  return {
    tabel_config: {
      approver: { org: form.approverOrg, title: form.approverTitle, name: form.approverName },
      title_prefix: form.titlePrefix,
      signers: form.signers.filter((s) => s.position.trim() || s.name.trim()),
      stamp_coords: sanitizeStampCoords(cfg.stamp_coords),
      registration_start: startNumber(form.registrationStart),
      guvohnoma_number_prefix: form.guvohnomaPrefix.trim() || null,
      guvohnoma_number_start: startNumber(form.guvohnomaStart),
      late_grace_minutes:
        form.lateGrace.trim() === '' ? null : Math.min(180, Math.max(0, parseInt(form.lateGrace, 10) || 0)),
      default_work_start: form.workStart || null,
      default_work_end: form.workEnd || null,
      default_lunch_start: form.lunchStart || null,
      default_lunch_end: form.lunchEnd || null,
      auto_full_day: form.autoFullDay,
    },
    bildirgi_number_prefix: form.bildirgiPrefix.trim(),
  };
}

// ─── Soat tanlagichi (v2 `ClockSelect`) ──────────────────────────────────────

/** 24 soat ("00".."23") va 5 daqiqalik qadam ("00".."55"). */
export const CLOCK_HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
export const CLOCK_MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

export function splitClock(value: string): { h: string; m: string } {
  const [h = '', m = ''] = value ? value.split(':') : [];
  return { h, m };
}

/** Soat tanlansa daqiqasiz — ":00"; soat tozalansa butun qiymat tozalanadi (v2). */
export function setClockHour(value: string, hour: string): string {
  const { m } = splitClock(value);
  return hour ? `${hour}:${m || '00'}` : '';
}

export function setClockMinute(value: string, minute: string): string {
  const { h } = splitClock(value);
  return `${h || '00'}:${minute || '00'}`;
}
