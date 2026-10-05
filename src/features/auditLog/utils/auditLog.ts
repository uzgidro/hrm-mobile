// Audit jurnali (web v2 `AuditLogPage` + `useAuditLogs` + `OnlineNowStrip`) — sof mantiq.
// Faqat o'qish. Ro'yxat serverda sahifalanadi (`audit-logs`, fastapi-pagination: items/total/page/
// size/pages), toifa sonlari `audit-logs/stats` dan (toifa filtrisiz — v2 bilan bir xil to'plam).
import type { Tone } from '@/ui';

export interface AuditLog {
  id: number;
  action?: string | null;
  method?: string | null;
  endpoint?: string | null;
  resource_type?: string | null;
  resource_id?: string | null;
  user_id?: number | null;
  employee_name?: string | null;
  /** Amal TEGIZGAN yozuvning filiali. */
  organization_branch_name?: string | null;
  /** Amalni bajargan xodim o'sha paytda ishlagan filial. */
  actor_branch_name?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  /** Middleware saqlagan so'rov tanasi (parol/token allaqachon `***`) + `target`/`deleted` nusxasi. */
  details?: unknown;
  created_at?: string | null;
}

export interface AuditPage {
  items: AuditLog[];
  total: number;
  page: number;
  pages: number;
}

export interface AuditStats {
  total: number;
  byCategory: Record<string, number>;
}

export interface OnlineUser {
  user_id: number;
  name?: string | null;
  organization_branch_name?: string | null;
  devices?: { ip_address?: string | null; user_agent?: string | null; last_seen?: string | null }[];
}

export interface OnlineDay {
  day: string;
  peak_count: number;
}

/** Jurnal o'qiladigan beshta savol (server `category` parametri). */
export const AUDIT_CATEGORIES = ['changes', 'access', 'activity', 'errors', 'system'] as const;
/** Statistikada serverning toifasiz amallari `other` ostida keladi. */
export const STAT_CATEGORIES = [...AUDIT_CATEGORIES, 'other'] as const;

/** Middleware yozadigan `resource_type` qiymatlari (v2 `AUDIT_RESOURCE_TYPES`; noma'lumi server 422). */
export const AUDIT_RESOURCE_TYPES = [
  'employee',
  'letter',
  'order_act',
  'work_leave',
  'department',
  'job_position',
  'organization_branch',
  'visitor',
  'invitation',
  'document',
  'card',
  'vehicle',
  'holiday',
  'news_post',
  'support_ticket',
  'permission_group',
  'medical_checkup',
  'chairman_task',
  'admin',
  'auth',
  'session',
  'hierarchy',
  'staff_position',
  'work_schedule_day',
  'duty_day',
  'location',
  'master_admin',
  'multi_modal_user',
  'module_responsible',
  'medical_specialty',
  'kpi',
  'health_check',
  'zoom_meeting',
  'video_guide',
  'task_overdue',
  'folder',
  'llm',
  'attendance',
  'turnstile',
  'dashboard',
  'routing',
  'work_plan',
  'training',
  'inspection',
  'dictionary',
  'service_request',
  'custom_field',
  'vacancy_application',
  'learning',
  'report',
  'export',
  'registration',
  'system',
  'statistics',
  'notification',
  'monitoring',
] as const;

/** v2 `ACTION_META`: amal kodi → yorliq kaliti + ton. Kodlar tarjima qilinmaydi — faqat yorlig'i. */
export const ACTION_META: Record<string, { labelKey: string; tone: Tone }> = {
  CREATE: { labelKey: 'actionCreate', tone: 'success' },
  UPDATE: { labelKey: 'actionUpdate', tone: 'warning' },
  DELETE: { labelKey: 'actionDelete', tone: 'danger' },
  VIEW: { labelKey: 'actionView', tone: 'info' },
  PAGE_VIEW: { labelKey: 'actionPageView', tone: 'neutral' },
  LOGIN: { labelKey: 'actionLogin', tone: 'brand' },
  ERROR: { labelKey: 'actionError', tone: 'danger' },
  LOGOUT: { labelKey: 'actionLogout', tone: 'neutral' },
  EXPORT: { labelKey: 'actionExport', tone: 'info' },
  SEARCH: { labelKey: 'actionSearch', tone: 'neutral' },
  ASK: { labelKey: 'actionAsk', tone: 'brand' },
  EMAIL: { labelKey: 'actionEmail', tone: 'info' },
  EMAIL_FAIL: { labelKey: 'actionEmailFail', tone: 'danger' },
  PASSWORD: { labelKey: 'actionPassword', tone: 'warning' },
  attendance_period_lock: { labelKey: 'actionPeriodLock', tone: 'warning' },
  attendance_period_unlock: { labelKey: 'actionPeriodUnlock', tone: 'warning' },
  backup_created: { labelKey: 'actionBackup', tone: 'neutral' },
  backup_deleted: { labelKey: 'actionBackupDeleted', tone: 'danger' },
  system_emergency_shutdown: { labelKey: 'actionShutdown', tone: 'danger' },
  system_resume: { labelKey: 'actionResume', tone: 'success' },
  system_recovery: { labelKey: 'actionRecovery', tone: 'success' },
};

/** Server filtr qiymatini katta harfga o'tkazadi — kichik harfli tizim hodisalari filtrlanmaydi (v2). */
export const FILTER_ACTIONS = Object.keys(ACTION_META).filter((a) => a === a.toUpperCase());

export const isKnownResource = (r?: string | null): r is string =>
  !!r && (AUDIT_RESOURCE_TYPES as readonly string[]).includes(r);

export interface AuditFilters {
  /** Aktyorning `users.id` si — xodim id EMAS. */
  userId: number | null;
  userLabel: string;
  category: string;
  action: string;
  resource: string;
  branchId: number | null;
  /** '4xx' | '5xx' — faqat «Xatoliklar» toifasida. */
  status: string;
  from: string;
  to: string;
}

export const EMPTY_AUDIT_FILTERS: AuditFilters = {
  userId: null,
  userLabel: '',
  category: '',
  action: '',
  resource: '',
  branchId: null,
  status: '',
  from: '',
  to: '',
};

/** Teskari oraliq — server 422; so'rov umuman yuborilmaydi. */
export const isRangeInvalid = (f: Pick<AuditFilters, 'from' | 'to'>) => !!f.from && !!f.to && f.from > f.to;

/** «Filtrlar» ostidagi tanlovlar soni (v2 `foldedCount`). */
export function foldedCount(f: AuditFilters): number {
  return [f.userId, f.category, f.action, f.resource, f.branchId, f.status, f.from, f.to].filter(
    (v) => v != null && v !== '',
  ).length;
}

/**
 * So'rov parametrlari. Server 422 beradigan qiymatlar yuborilmaydi (v2): noma'lum resurs turi,
 * «Xatoliklar»dan tashqaridagi status guruhi. Filial berilmasa — barcha filiallar (jurnal sarlavha
 * filialiga ergashmaydi; mobil `apiClient` filial qo'shmaydi).
 */
export function auditParams(f: AuditFilters, search: string, withCategory = true): Record<string, string | number> {
  const p: Record<string, string | number> = {};
  if (f.userId != null) p.user_id = f.userId;
  if (f.action) p.action = f.action;
  if (withCategory && f.category) p.category = f.category;
  if (f.category === 'errors' && (f.status === '4xx' || f.status === '5xx')) p.status_group = f.status;
  if (isKnownResource(f.resource)) p.resource_type = f.resource;
  if (f.from) p.date_from = f.from;
  if (f.to) p.date_to = f.to;
  const q = search.trim();
  if (q) p.search = q;
  if (f.branchId != null) p.organization_branch_id = f.branchId;
  return p;
}

export function actionMeta(a?: string | null): { labelKey: string | null; tone: Tone } {
  const m = a ? ACTION_META[a] : undefined;
  return m ? { labelKey: m.labelKey, tone: m.tone } : { labelKey: null, tone: 'neutral' };
}

/** Toifa plitkalari: noldan katta, kamayish tartibida (v2). */
export function categoryTiles(byCategory: Record<string, number>): [string, number][] {
  return Object.entries(byCategory)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
}

/** v2 `OnlineNowStrip`: bugungi eng yuqori — oxirgi kun, rekord — davr maksimumi. */
export function onlinePeaks(rows: OnlineDay[]): { today: number; record: number } {
  return {
    today: rows[rows.length - 1]?.peak_count ?? 0,
    record: rows.reduce((m, r) => Math.max(m, r.peak_count ?? 0), 0),
  };
}

/** v2 `shortAgent`: «Chrome 128 · Windows» — telefonni ofis kompyuteridan ajratishga yetadi. */
export function shortAgent(ua: string | null | undefined, appLabel: string): string {
  if (!ua) return '—';
  const v = (re: RegExp) => re.exec(ua)?.[1];
  const browser = v(/Edg\/(\d+)/)
    ? `Edge ${v(/Edg\/(\d+)/)}`
    : v(/OPR\/(\d+)/)
      ? `Opera ${v(/OPR\/(\d+)/)}`
      : v(/YaBrowser\/(\d+)/)
        ? `Yandex ${v(/YaBrowser\/(\d+)/)}`
        : v(/Chrome\/(\d+)/)
          ? `Chrome ${v(/Chrome\/(\d+)/)}`
          : v(/Firefox\/(\d+)/)
            ? `Firefox ${v(/Firefox\/(\d+)/)}`
            : /Version\/(\d+).*Safari/.test(ua)
              ? `Safari ${v(/Version\/(\d+)/)}`
              : /okhttp|Expo|Dart|CFNetwork/i.test(ua)
                ? appLabel
                : (ua.split(' ')[0] ?? ua);
  const os = /Android/.test(ua)
    ? 'Android'
    : /iPhone|iPad|iOS/.test(ua)
      ? 'iOS'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Mac OS/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : '';
  return os ? `${browser} · ${os}` : browser;
}

// ── Yozuv tafsiloti: o'zgarishlar matn sifatida ────────────────────────────

const MAX_VALUE = 200;

/** Qiymatni bir qatorli matnga: bo'sh — «—», obyekt — ixcham JSON, uzuni qisqartiriladi. */
export function valueText(v: unknown): string {
  if (v == null || v === '') return '—';
  let s: string;
  if (typeof v === 'string') s = v;
  else if (typeof v === 'number' || typeof v === 'boolean') s = String(v);
  else {
    try {
      s = JSON.stringify(v);
    } catch {
      s = String(v);
    }
  }
  return s.length > MAX_VALUE ? `${s.slice(0, MAX_VALUE)}…` : s;
}

const isPlain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const SNAPSHOT_META = new Set(['id', 'label']);
const ENVELOPE = new Set(['target', 'deleted', '_body']);

export interface AuditDetails {
  /** Old → new: middleware oldindan olgan `target` nusxasi va yuborilgan qiymat farq qilsa. */
  changes: { key: string; from: string; to: string }[];
  /** Qolgan yuborilgan maydonlar (`key: value`); maxfiylar server tomonidan `***`. */
  fields: { key: string; value: string }[];
  /** Tahrir/o'chirishdan oldingi yozuv nomi (`target`/`deleted` `label`). */
  snapshot: { kind: 'target' | 'deleted'; label: string } | null;
  /** To'liq tana (v2 `<pre>`); tana bo'lmasa `null`. */
  raw: string | null;
}

/**
 * Server `details` ni o'qiladigan ko'rinishga keltiradi. UPDATE/DELETE da middleware yozuvning
 * OLDINGI holatidan qisqa nusxa qo'shadi (`target` / `deleted`) — u bilan yuborilgan tanadagi bir
 * xil kalitlar solishtirilib «kalit: eski → yangi» qatorlari olinadi; qolganlari «kalit: qiymat».
 */
export function describeDetails(details: unknown): AuditDetails {
  const empty = details == null || (isPlain(details) && Object.keys(details).length === 0);
  if (empty) return { changes: [], fields: [], snapshot: null, raw: null };
  let raw: string;
  try {
    raw = JSON.stringify(details, null, 2) ?? String(details);
  } catch {
    raw = String(details);
  }
  if (!isPlain(details)) return { changes: [], fields: [], snapshot: null, raw };

  const kind = isPlain(details.deleted) ? 'deleted' : isPlain(details.target) ? 'target' : null;
  const snap = kind ? (details[kind] as Record<string, unknown>) : null;
  const body = isPlain(details._body)
    ? details._body
    : Object.fromEntries(Object.entries(details).filter(([k]) => !ENVELOPE.has(k)));

  const changes: AuditDetails['changes'] = [];
  const fields: AuditDetails['fields'] = [];
  for (const [key, value] of Object.entries(body)) {
    if (snap && !SNAPSHOT_META.has(key) && key in snap && valueText(snap[key]) !== valueText(value)) {
      changes.push({ key, from: valueText(snap[key]), to: valueText(value) });
    } else {
      fields.push({ key, value: valueText(value) });
    }
  }
  const label = snap?.label;
  return {
    changes,
    fields,
    snapshot: kind && label != null && label !== '' ? { kind, label: valueText(label) } : null,
    raw,
  };
}
