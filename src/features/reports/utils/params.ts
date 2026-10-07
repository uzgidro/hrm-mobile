// Hisobot parametrlari — sof mantiq (web v2 `paramsUrl.ts` `defaultParams`, `ReportRunPage`
// `requiredMissing` va filial to'ldirish, `ReportParamsForm` `branchDeps`). URL sinxroni
// mobil'da yo'q (parametrlar ekran holatida) — qolgan qoidalar aynan v2.
import type { User } from '@/types';
import { findExecutiveBranchId, resolveEmployeeBranchId } from '@/utils/branch';
import { isMasterAdmin } from '@/utils/roles';
import type {
  DrillRef,
  ParamDef,
  ParamKind,
  ReportCatalogItem,
  ReportLang,
  ReportOption,
  ReportParams,
  RunBody,
} from './types';
import { foldText } from '@/utils/searchFold';

/** Mobil forma chiza oladigan turlar. Server yangi tur qo'shsa — u «Web versiyada». */
export const SUPPORTED_KINDS: readonly ParamKind[] = [
  'date_range',
  'month',
  'date',
  'branch_multi',
  'division_tree',
  'job_multi',
  'employee_multi',
  'enum',
  'bool',
  'int',
  'time_range',
  'text',
];

export const isSupportedKind = (kind: string): boolean => (SUPPORTED_KINDS as readonly string[]).includes(kind);

/**
 * Majburiy parametri mobil chiza olmaydigan turda bo'lsa — hisobot faqat web'da (yarim
 * forma yuborilmaydi). Ixtiyoriy noma'lum parametr shunchaki ko'rsatilmaydi (server default).
 */
export const isWebOnlyReport = (item: Pick<ReportCatalogItem, 'params'>): boolean =>
  item.params.some((p) => p.required && !isSupportedKind(p.kind));

export const visibleParams = (defs: ParamDef[]): ParamDef[] => defs.filter((d) => isSupportedKind(d.kind));

/** Qurilmaning MAHALLIY kalendar sanasi — `toISOString()` UTC (Toshkent yarim tunida kecha). */
export function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** v2 `defaultParams` (server `base.resolve_default` ko'zgusi). */
export function defaultParams(defs: ParamDef[], today: Date = new Date()): ReportParams {
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const out: ReportParams = {};
  for (const d of defs) {
    if (d.default === 'current_month') {
      out[d.name] =
        d.kind === 'date_range' ? { from: localISO(first), to: localISO(last) } : localISO(first).slice(0, 7);
    } else if (d.default === 'today') out[d.name] = localISO(today);
    else if (d.default === 'previous_month') {
      out[d.name] = localISO(new Date(today.getFullYear(), today.getMonth() - 1, 1)).slice(0, 7);
    } else if (d.default === 'twelve_months_ago') {
      out[d.name] = localISO(new Date(today.getFullYear(), today.getMonth() - 11, 1)).slice(0, 7);
    } else if (d.default != null) out[d.name] = d.default;
  }
  return out;
}

/**
 * v2 sarlavha filialining boshlang'ich qiymati (`useBranchInit`) — mobil'da sarlavha tanlagichi
 * yo'q, shu bois hisobot formasi shundan boshlanadi: sayt bosh admini (va ministr) — bosh filial
 * (v2 `1` ni seed qiladi; ministrda o'z filiali bo'lsa — o'sha), filialli admin — o'z filiali,
 * xodim — o'z filiali. Aniqlab bo'lmasa `undefined` — server ko'rish doirasi.
 */
export function reportHomeBranchId(user: User | null | undefined): number | undefined {
  if (!user) return undefined;
  if (user.type === 'admin') return user.admin?.organization_branch_id ?? undefined;
  const own = resolveEmployeeBranchId(user.employee);
  if (own != null) return own;
  return isMasterAdmin(user) ? findExecutiveBranchId() : undefined;
}

/**
 * Boshlang'ich qiymatlar: definitsiya defaultlari + v2 sarlavha filiali (`ReportRunPage`):
 * `branch_ids` (ko'p) bo'sh bo'lsa — `[filial]`, `branch_id` (KPI, bitta) — `filial`. Ilgari
 * `branch_ids` bo'sh qoldirilardi va tabel butun tashkilot bo'yicha (8 MB, 8–10 s) so'ralardi;
 * v2 esa sarlavha filialini qo'yadi. «Barcha filiallar» — tanlovni tozalash bilan.
 */
export function initialParams(defs: ParamDef[], ownBranchId: number | null | undefined, today?: Date): ReportParams {
  const next = defaultParams(defs, today);
  if (ownBranchId == null) return next;
  const has = (n: string) => defs.some((p) => p.name === n);
  if (has('branch_ids') && !(Array.isArray(next.branch_ids) && next.branch_ids.length)) next.branch_ids = [ownBranchId];
  if (has('branch_id') && next.branch_id == null) next.branch_id = ownBranchId;
  return next;
}

const isEmpty = (v: unknown) => v == null || v === '' || (Array.isArray(v) && v.length === 0);

/** v2 `requiredMissing`: oraliq ikkala chegarasi bilan; ro'yxat bo'sh emas. */
export function requiredMissing(defs: ParamDef[], params: ReportParams): boolean {
  return defs.some((d) => {
    if (!d.required) return false;
    const v = params[d.name];
    if (d.kind === 'date_range') {
      const r = (v ?? {}) as { from?: string; to?: string };
      return !(r.from && r.to);
    }
    return isEmpty(v);
  });
}

export type Range = { from?: string; to?: string };

/** «dan» «gacha» dan keyin (ISO satrlar leksik tartibda solishtiriladi). */
export const isRangeInvalid = (r: Range | null | undefined): boolean => !!(r?.from && r?.to && r.from > r.to);

const dayNo = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86_400_000;

/** Server qoidasi (`base.validate_params`): oraliq 366 kundan uzun bo'lmaydi. UTC kunlari — TZ'dan mustaqil. */
export const isRangeTooLong = (r: Range | null | undefined): boolean =>
  !!(r?.from && r?.to && dayNo(r.to) - dayNo(r.from) > 366);

/** Server `time_range` tekshiruvi: H:MM / HH:MM, 0–23 : 0–59. Bo'sh — server default. */
export function isTimeValid(s: string | null | undefined): boolean {
  if (!s) return true;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  return !!m && Number(m[1]) <= 23 && Number(m[2]) <= 59;
}

export type ParamError = 'range' | 'long' | 'time' | 'int';

/** Yuborishdan oldingi xatolar (server baribir 400 qaytaradi — mobil oldindan to'xtatadi). */
export function paramErrors(defs: ParamDef[], params: ReportParams): Record<string, ParamError> {
  const out: Record<string, ParamError> = {};
  for (const d of visibleParams(defs)) {
    const v = params[d.name];
    if (d.kind === 'date_range' && isRangeInvalid(v as Range)) out[d.name] = 'range';
    else if (d.kind === 'date_range' && isRangeTooLong(v as Range)) out[d.name] = 'long';
    if (d.kind === 'time_range') {
      const r = (v ?? {}) as Range;
      if (!isTimeValid(r.from) || !isTimeValid(r.to)) out[d.name] = 'time';
    }
    if (d.kind === 'int' && !d.options_source && v != null && v !== '' && !Number.isInteger(v)) out[d.name] = 'int';
  }
  return out;
}

export const canGenerate = (defs: ParamDef[], params: ReportParams): boolean =>
  !requiredMissing(defs, params) && Object.keys(paramErrors(defs, params)).length === 0;

/** v2 `branchDeps`: `depends_on` qiymatlari → options so'rovining `branch_ids`. */
export function branchDeps(def: ParamDef, all: ReportParams): (number | string)[] {
  const out: (number | string)[] = [];
  for (const dep of def.depends_on) {
    const v = all[dep];
    if (Array.isArray(v)) out.push(...(v as (number | string)[]));
    else if (v != null && v !== '') out.push(v as number | string);
  }
  return out;
}

/** Server faqat uz/ru biladi (v2 `currentLang`): ruscha — ru, qolgani (lotin, kirill, en) — uz. */
export const reportLang = (lng: string | null | undefined): ReportLang => (lng?.startsWith('ru') ? 'ru' : 'uz');

/** `POST reports/{code}/run` tanasi. `prefs: null` — server saqlangan sozlamalarni qo'llaydi. */
export function buildRunBody(params: ReportParams, lang: ReportLang, drill: DrillRef | null = null): RunBody {
  const clean: ReportParams = {};
  for (const [k, v] of Object.entries(params)) if (v !== undefined) clean[k] = v;
  return { params: clean, prefs: null, format: 'json', drill, lang };
}

/** Tanlov qisqa ko'rinishi: ikki nom + «+N». Nomi hali kelmagan qiymat — `#id`. */
export function selectionSummary(selected: (string | number)[], labels: Record<string, string>): string {
  if (!selected.length) return '';
  const names = selected.slice(0, 2).map((v) => labels[String(v)] ?? `#${v}`);
  const rest = selected.length - names.length;
  return rest > 0 ? `${names.join(', ')} +${rest}` : names.join(', ');
}

export type TreeNode = { branch: ReportOption; depts: ReportOption[] };

/**
 * Ikki daraja yetarli: server `divisions` manbai (`services/reports/options.py`) bo'limlarni
 * filialga TEKIS beradi (`parent` har doim `b<filial>`; bo'lim ostida bo'lim yo'q) — v2 ham shunday.
 */
/** v2 `DivisionTreeSelect` daraxti: filial → bo'limlar; qidiruv bo'lim nomini toraytiradi, filial nomi mos bo'lsa filial qoladi. */
export function divisionTree(options: ReportOption[], term: string): TreeNode[] {
  const byParent: Record<string, ReportOption[]> = {};
  for (const o of options) {
    if (o.is_branch) continue;
    const p = String(o.parent ?? '');
    (byParent[p] ??= []).push(o);
  }
  const q = foldText(term.trim());
  return options
    .filter((o) => o.is_branch)
    .map((b) => ({
      branch: b,
      depts: (byParent[String(b.value)] ?? []).filter((d) => !q || foldText(d.label).includes(q)),
    }))
    .filter((n) => !q || n.depts.length > 0 || foldText(n.branch.label).includes(q));
}

/** Filial tugunini belgilash = barcha bo'limlari (faqat bo'lim id'lari saqlanadi). */
export function toggleMany(value: (string | number)[], ids: (string | number)[], on: boolean): (string | number)[] {
  const key = new Set(ids.map(String));
  if (!on) return value.filter((v) => !key.has(String(v)));
  const have = new Set(value.map(String));
  return [...value, ...ids.filter((i) => !have.has(String(i)))];
}

export function toggleOne(value: (string | number)[], id: string | number): (string | number)[] {
  return value.some((v) => String(v) === String(id)) ? value.filter((v) => String(v) !== String(id)) : [...value, id];
}
