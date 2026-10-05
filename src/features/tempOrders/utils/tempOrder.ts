// Vaqtinchalik buyruqlar — web v2 `features/temporders/useTempOrders.ts` va
// `TempOrdersPage` saqlash mantig'i porti. Tur KODLARI tarjima qilinmaydi (tabel
// ularni o'qiydi); faqat ko'rsatiladigan nomlar i18n'da.

import dayjs from 'dayjs';

export const TEMP_ORDER_TYPES = [
  'kasal',
  'mehnat_tatili',
  'xizmat_safari',
  'dekret',
  'haqsiz_tatil',
  'ishdan_ozod',
  'tolanmaydigan_tatil',
  'noaniq_sabab',
  'harbiy_xizmat',
  'progul',
  'malumotnoma',
  'ish_haqi_saqlangan',
  'malaka_oshirish',
  'oquv_tatil',
  'otgul',
  'boshqa_ishga_otkazish',
  'mehnat_tatilidan_chaqirish',
  'homiladorlik',
  'bola_parvarish',
  'qoshimcha_tatil',
  'vaqtincha_otkazish',
  'vaqtincha_boshatish',
  'ruxsat',
] as const;

/** v2 `ORDER_TYPES` bilan aynan (23 ta, o'sha tartibda). */
export type TempOrderType = (typeof TEMP_ORDER_TYPES)[number];

/** Xodimni arxivlaydi — faqat boshlanish sanasi. */
export const ARCHIVING_TYPES: string[] = ['ishdan_ozod', 'boshqa_ishga_otkazish'];
/** Soatlik ruxsat — bitta kun, vaqt oralig'i. */
export const HOURLY_TYPE = 'ruxsat';

export const isArchiving = (type: string) => ARCHIVING_TYPES.includes(type);
export const isHourly = (type: string) => type === HOURLY_TYPE;

/**
 * Ochiq muddat: server oxirgi sanasiz yozuvni 2099-12-31 bilan saqlaydi (`work_leave.py` —
 * arxivlash turlari; `order_act.py` — muddatsiz holatlar). Bu haqiqiy sana emas: ro'yxatda
 * «16.08 – 31.12.2099 · 26801 kun» chiqardi.
 */
export const OPEN_END_YEAR = 2099;

type RangeRow = { type?: string | null; start_date?: string | null; end_date?: string | null };

export function isOpenEnded(r: RangeRow): boolean {
  if (isArchiving(r.type ?? '')) return true;
  return !!r.end_date && Number(r.end_date.slice(0, 4)) >= OPEN_END_YEAR;
}

/**
 * Qator muddati (v2 `TempOrdersPage` ko'rinishi): `text` — sanalar, `days` — bir kundan uzun
 * oraliqda kunlar soni, `open` — «muddatsiz» belgisi kerak (arxivlash turida emas: u — voqea
 * sanasi, ishdan bo'shatish/o'tkazish).
 */
export function tempOrderRange(r: RangeRow): { text: string; days: number | null; open: boolean } {
  if (!r.start_date) return { text: '—', days: null, open: false };
  const s = dayjs(r.start_date);
  if (isOpenEnded(r)) return { text: s.format('DD.MM.YYYY'), days: null, open: !isArchiving(r.type ?? '') };
  if (!r.end_date) return { text: s.format('DD.MM.YYYY'), days: null, open: false };
  const e = dayjs(r.end_date);
  if (e.isSame(s, 'day')) {
    const hm = s.format('HH:mm') !== '00:00' ? ` ${s.format('HH:mm')}–${e.format('HH:mm')}` : '';
    return { text: `${s.format('DD.MM.YYYY')}${hm}`, days: null, open: false };
  }
  return {
    text: `${s.format('DD.MM')} – ${e.format('DD.MM.YYYY')}`,
    days: e.startOf('day').diff(s.startOf('day'), 'day') + 1,
    open: false,
  };
}

export type TempOrderForm = {
  employeeId: number | null;
  type: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  note: string;
};

export type TempOrderError =
  'employeeRequired' | 'startRequired' | 'endRequired' | 'endBeforeStart' | 'timeInvalid' | 'timeOrder';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateTempOrder(f: TempOrderForm, isEdit: boolean): TempOrderError | null {
  if (!isEdit && !f.employeeId) return 'employeeRequired';
  if (!f.start) return 'startRequired';
  if (isHourly(f.type)) {
    // Soatlik ruxsat — bitta sana, vaqt oralig'i; «HH:mm» satrlari leksik solishtiriladi.
    if (!TIME_RE.test(f.startTime) || !TIME_RE.test(f.endTime)) return 'timeInvalid';
    if (f.endTime <= f.startTime) return 'timeOrder';
    return null;
  }
  if (isArchiving(f.type)) return null;
  if (!f.end) return 'endRequired';
  if (f.end < f.start) return 'endBeforeStart';
  return null;
}

/** POST work-leaves/hr-create (v2: sana alohida, soatlik — vaqt alohida, izoh `note`). */
export function buildCreateBody(f: TempOrderForm) {
  const hourly = isHourly(f.type);
  return {
    employee_id: f.employeeId,
    type: f.type,
    start_date: f.start,
    end_date: isArchiving(f.type) ? null : hourly ? f.start : f.end,
    start_time: hourly ? `${f.startTime}:00` : null,
    end_time: hourly ? `${f.endTime}:00` : null,
    note: f.note.trim() || null,
  };
}

/** PATCH work-leaves/{id} (v2: datetime, izoh `description`). */
export function buildUpdateBody(f: TempOrderForm) {
  const hourly = isHourly(f.type);
  return {
    type: f.type,
    start_date: hourly ? `${f.start}T${f.startTime}:00` : `${f.start}T00:00:00`,
    end_date: isArchiving(f.type) ? null : hourly ? `${f.start}T${f.endTime}:00` : `${f.end}T23:59:59`,
    description: f.note.trim() || null,
  };
}
