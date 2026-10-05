// Tibbiy ko'rik — sof mantiq (web v2 `MedicalPage` + `useMedical`).
// Holat (passed | due_soon | overdue) SERVERDA hisoblanadi (`models.medical`: davr 12 oy,
// «muddati yaqin» 11 oydan) — mijoz qayta hisoblamaydi va «keyingi ko'rik» sanasini
// chiqarmaydi: ikki joyda yozilgan qoida bir-biridan ajralib ketadi (v2 izohi).
// Holat / indeks KODLARI tarjima qilinmaydi — faqat yorliq.
import dayjs from 'dayjs';
import type { Tone } from '@/ui';

export const MEDICAL_STATUSES = ['passed', 'due_soon', 'overdue'] as const;
export const HEALTH_INDEXES = ['excellent', 'good', 'poor'] as const;
export type MedicalStatus = (typeof MEDICAL_STATUSES)[number];
export type HealthIndex = (typeof HEALTH_INDEXES)[number];

const STATUS_TONE: Record<string, Tone> = { passed: 'success', due_soon: 'warning', overdue: 'danger' };
const INDEX_TONE: Record<string, Tone> = { excellent: 'success', good: 'info', poor: 'danger' };

export const statusTone = (s?: string | null): Tone => (s && STATUS_TONE[s]) || 'neutral';
export const indexTone = (s?: string | null): Tone => (s && INDEX_TONE[s]) || 'neutral';

/** Ro'yxat qatori (server `MedicalEmployeeRow`, PII yo'q). */
export interface MedicalRow {
  id: number;
  legal_name?: string | null;
  photo_thumb_path?: string | null;
  photo_path?: string | null;
  branch_name?: string | null;
  department_name?: string | null;
  job_position_name?: string | null;
  last_checkup_date?: string | null;
  checkup_count?: number | null;
  status?: string | null;
  annual_index?: string | null;
  annual_index_year?: number | null;
}

export interface CheckupFile {
  id: number;
  original_filename?: string | null;
  content_type?: string | null;
  file_url?: string | null;
}

export interface Checkup {
  id: number;
  employee_id?: number | null;
  checkup_date?: string | null;
  conclusion?: string | null;
  recommendation?: string | null;
  specialty_id?: number | null;
  specialty_name?: string | null;
  doctor_name?: string | null;
  files?: CheckupFile[] | null;
  /** Server hal qiladi (muallif doktor / bosh admin; o'chirish — faqat kiritilgan kuni). */
  can_edit?: boolean;
  can_delete?: boolean;
}

export interface AnnualIndex {
  id?: number;
  year?: number | null;
  health_index?: string | null;
  index_note?: string | null;
  set_by_name?: string | null;
  set_at?: string | null;
}

export interface MedicalDetail {
  employee: MedicalRow;
  checkups: Checkup[];
  annual_indexes: AnnualIndex[];
  /** `scoping.is_doctor` — ko'rik kiritish (va fayl biriktirish) shu bayroqdan. */
  can_add_checkup: boolean;
  /** Sihatgoh rahbari (bosh shifokor) — yillik indeks. */
  can_set_annual_index: boolean;
}

export interface Specialty {
  id: number;
  name?: string | null;
  is_active?: boolean | null;
}

export interface MedicalPage {
  items: MedicalRow[];
  total: number;
}

/** Ekran filtrlari — ro'yxat, hisoblagichlar (v2 eksport ham) bir xil toraytirish bilan. */
export interface MedicalFilters {
  search: string;
  status: string;
  branchId: number | null;
  departmentId: number | null;
  jobPositionId: number | null;
  healthIndex: string;
  year: string;
}

export const EMPTY_FILTERS: MedicalFilters = {
  search: '',
  status: '',
  branchId: null,
  departmentId: null,
  jobPositionId: null,
  healthIndex: '',
  year: '',
};

/**
 * v2 `medicalExportParams`: filtr → server parametrlari, bo'shlari yuborilmaydi.
 * Filial — CHEKLOV emas, FILTR: doktor butun tashkilotni ko'radi, filial faqat
 * foydalanuvchi o'zi toraytirganda yuboriladi.
 */
export function medicalParams(f: MedicalFilters): Record<string, string | number> {
  const p: Record<string, string | number> = {};
  const term = f.search.trim();
  if (term) p.search = term;
  if (f.status) p.status = f.status;
  if (f.branchId != null) p.organization_branch_id = f.branchId;
  if (f.departmentId != null) p.department_id = f.departmentId;
  if (f.jobPositionId != null) p.job_position_id = f.jobPositionId;
  if (f.healthIndex) p.health_index = f.healthIndex;
  if (f.year) p.year = Number(f.year);
  return p;
}

/** «Filtrlar» tugmasidagi son — yig'iladigan beshtasi (v2 `foldedCount`). */
export const foldedCount = (f: MedicalFilters) =>
  [f.branchId, f.departmentId, f.jobPositionId, f.healthIndex, f.year].filter((x) => x != null && x !== '').length;

/** Tozalanadigan filtrlar soni (holat ham; qidiruv emas — v2 `useFilterReset`). */
export const activeFilterCount = (f: MedicalFilters) => foldedCount(f) + (f.status ? 1 : 0);

export const pageCount = (total: number, size: number) => Math.max(1, Math.ceil((total || 0) / (size || 1)));

/**
 * Yil filtri: joriy yil — standart (bo'sh = server joriy yilni oladi), shuning uchun
 * tanlovda faqat oldingi to'rt yil (v2: besh yil orqaga, joriysi placeholder bilan).
 */
export function previousYears(now: number, count = 4): string[] {
  return Array.from({ length: count }, (_, i) => String(now - 1 - i));
}

/** Ko'riklar tarixi — eng yangisi tepada (v2). */
export function sortCheckups(list: Checkup[] | null | undefined): Checkup[] {
  return [...(list ?? [])].sort((a, b) => String(b.checkup_date ?? '').localeCompare(String(a.checkup_date ?? '')));
}

export const fmtDate = (d?: string | null) => (d ? dayjs(d.slice(0, 10)).format('DD.MM.YYYY') : '—');

/** Qator ikkinchi satri: bo'lim · lavozim. */
export const rowSubtitle = (r: MedicalRow) => [r.department_name, r.job_position_name].filter(Boolean).join(' · ');

/**
 * Fayl huquqi. ⚠️ `can_edit` yolg'iz darvoza EMAS: fayl yo'llari avval `_assert_doctor`
 * ni tekshiradi, bosh admin esa `can_edit: true` oladi-yu yuklashda 403 qaytadi (v2
 * `CheckupFiles`). Doktorlik — tafsilotning `can_add_checkup` bayrog'idan.
 */
export function fileRights(isDoctor: boolean, c: Checkup) {
  return { canAttach: isDoctor && !!c.can_edit, canDetach: isDoctor && !!c.can_delete };
}

/** Fayl nomi tugmada — uzuni o'rtasidan qisqartiriladi (kengaytma ko'rinib tursin). */
export function shortFileName(name: string, max = 36): string {
  if (name.length <= max) return name;
  const keep = max - 1;
  const tail = Math.min(10, Math.floor(keep / 3));
  return `${name.slice(0, keep - tail)}…${name.slice(name.length - tail)}`;
}

// ─────────────────────────── Ko'rik formasi ────────────────────────────────

export interface CheckupForm {
  date: string;
  conclusion: string;
  recommendation: string;
  specialtyId: number | null;
}

export function initialCheckupForm(c: Checkup | null, today: string): CheckupForm {
  return {
    date: c?.checkup_date?.slice(0, 10) ?? today,
    conclusion: c?.conclusion ?? '',
    recommendation: c?.recommendation ?? '',
    specialtyId: c?.specialty_id ?? null,
  };
}

/**
 * Tanlanadigan doktor turlari: o'zinikilar (`/auth/me` `medical_specialties`), ular yo'q
 * bo'lsa — umumiy katalog. Bitta bo'lsa tanlash chiqmaydi: server o'zi qo'yadi (v2).
 */
export function specialtyChoices(mine: Specialty[] | null | undefined, all: Specialty[] | null | undefined) {
  const src = mine?.length ? mine : (all ?? []);
  return src.map((s) => ({ id: s.id, name: s.name || `#${s.id}` }));
}

export function validateCheckup(f: CheckupForm, needsPick: boolean): 'dateRequired' | 'specialtyRequired' | null {
  if (!f.date) return 'dateRequired';
  if (needsPick && f.specialtyId == null) return 'specialtyRequired';
  return null;
}

/** v2 tanasi aynan: bo'sh matn — `null`; yangi yozuvda `employee_id` qo'shiladi. */
export function buildCheckupBody(f: CheckupForm) {
  return {
    checkup_date: f.date,
    conclusion: f.conclusion.trim() || null,
    recommendation: f.recommendation.trim() || null,
    specialty_id: f.specialtyId,
  };
}

// ─────────────────────────── Yillik indeks ─────────────────────────────────

export interface IndexForm {
  year: string;
  index: HealthIndex;
  note: string;
}

export const initialIndexForm = (now: number): IndexForm => ({ year: String(now), index: 'good', note: '' });

/** Server: 2000 … joriy yil + 1. Bo'sh — v2 xabari; noto'g'ri — so'rovsiz rad. */
export function validateIndex(f: IndexForm, now: number): 'yearRequired' | 'yearInvalid' | null {
  const y = f.year.trim();
  if (!y) return 'yearRequired';
  if (!/^\d{4}$/.test(y) || Number(y) < 2000 || Number(y) > now + 1) return 'yearInvalid';
  return null;
}

export function buildIndexBody(employeeId: number, f: IndexForm) {
  return {
    employee_id: employeeId,
    year: Number(f.year.trim()),
    health_index: f.index,
    index_note: f.note.trim() || null,
  };
}
