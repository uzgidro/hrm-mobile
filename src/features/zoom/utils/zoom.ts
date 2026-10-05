// Zoom yig'ilishlari — sof mantiq (web v2 `ZoomPage` + `features/zoom/{useZoom,invitation}.ts`).
// Holat KODLARI (pending | approved | rejected | cancelled | ended) va takrorlash turlari
// serverniki — tarjima qilinmaydi, faqat yorliq. Vaqtlar Toshkent bo'yicha (server
// `TASHKENT_TZ` = UTC+5, yozgi vaqt yo'q) — qurilma mintaqasiga bog'liq emas.
import dayjs, { type Dayjs } from 'dayjs';
import type { TFunction } from 'i18next';
import type { Tone } from '@/ui';

export interface ZoomConfig {
  enabled: boolean;
  can_request: boolean;
  can_approve: boolean;
  /** true → so'rov emas, yig'ilish darhol ochiladi (tasdiq bosqichi yo'q). */
  auto_approve: boolean;
  max_concurrent: number;
  timezone?: string;
}

interface Person {
  id?: number;
  legal_name?: string | null;
  photo_path?: string | null;
  photo_thumb_path?: string | null;
}

export interface ZoomRecurrence {
  type: 'daily' | 'weekly' | 'monthly';
  interval: number;
  /** ISO: 1=Du … 7=Ya. */
  weekdays: number[];
  count: number;
}

export interface ZoomMeeting {
  id: number;
  status: string;
  topic?: string | null;
  agenda?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  duration_minutes?: number | null;
  join_url?: string | null;
  passcode?: string | null;
  reject_reason?: string | null;
  requested_by?: Person | null;
  approved_by?: Person | null;
  is_started?: boolean;
  can_approve?: boolean | null;
  can_manage?: boolean | null;
  zoom_meeting_id?: number | string | null;
  recording_mode?: string | null;
  /** Zoom bo'yicha JONLI (webhook + poll) — qizil nuqta; `status` dan mustaqil. */
  is_live?: boolean;
  live_since?: string | null;
  participant_count?: number | null;
  started_at?: string | null;
  started_by?: Person | null;
  recording_started_at?: string | null;
  source?: string | null;
  series_id?: number | null;
  recurrence?: Partial<ZoomRecurrence> | null;
  series_index?: number | null;
  series_total?: number | null;
}

export interface ZoomPage {
  items: ZoomMeeting[];
  total: number;
  page: number;
  size: number;
}

export interface ZoomLiveSummary {
  live_count: number;
  max_concurrent: number;
  is_full: boolean;
  meetings: { id: number; topic?: string | null }[];
}

export interface ZoomBusySlot {
  id: number;
  topic?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  requested_by?: string | null;
}

export interface ZoomAvailability {
  date: string;
  max_concurrent: number;
  meetings: ZoomBusySlot[];
  overlapping_count: number;
  is_free: boolean;
  next_free_at?: string | null;
}

export interface ZoomStartResult {
  start_url: string;
  /** off | armed | started | failed — so'ralgan yozuv bilan nima bo'ldi. */
  recording: string;
  warning?: string | null;
}

// ── Toshkent vaqti ─────────────────────────────────────────────────────────

const TASHKENT_OFFSET_MS = 5 * 3600_000;
const HAS_ZONE = /([zZ]|[+-]\d{2}:?\d{2})$/;

/**
 * Server vaqti → Toshkent «devor soati» `YYYY-MM-DDTHH:mm:ss`. Mintaqasiz satr Toshkent
 * deb olinadi (server `assume_tashkent`). Natija qurilma mintaqasidan mustaqil.
 */
export function tashkentWall(iso?: string | null): string | null {
  if (!iso) return null;
  let s = iso
    .trim()
    .replace(' ', 'T')
    .replace(/(\.\d{3})\d+/, '$1');
  if (!HAS_ZONE.test(s)) s += '+05:00';
  const ms = Date.parse(s);
  if (Number.isNaN(ms)) return null;
  return new Date(ms + TASHKENT_OFFSET_MS).toISOString().slice(0, 19);
}

/** v2 `inTashkent`: devor soati dayjs sifatida (formatlash uchun). */
export function inTashkent(iso?: string | null): Dayjs | null {
  const w = tashkentWall(iso);
  return w ? dayjs(w) : null;
}

/** Hozirgi Toshkent sanasi `YYYY-MM-DD`. */
export function tashkentToday(now: number = Date.now()): string {
  return new Date(now + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
}

/** Kun sarlavhasi: «Bugun / Ertaga / Kecha» kaliti yoki null (sana bilan yoziladi). */
export function dayLabelKey(day: string, today: string): 'today' | 'tomorrow' | 'yesterday' | null {
  if (!day) return null;
  if (day === today) return 'today';
  const base = dayjs(today);
  if (day === base.add(1, 'day').format('YYYY-MM-DD')) return 'tomorrow';
  if (day === base.subtract(1, 'day').format('YYYY-MM-DD')) return 'yesterday';
  return null;
}

/** Qator vaqti: «10:00 – 11:00 · 60 daq». */
export function timeRangeText(m: ZoomMeeting, t: TFunction): string {
  const start = inTashkent(m.start_at);
  const end = inTashkent(m.end_at);
  let s = start ? start.format('HH:mm') : '—';
  if (end) s += ` – ${end.format('HH:mm')}`;
  if (m.duration_minutes) s += ` · ${m.duration_minutes} ${t('zoom.min')}`;
  return s;
}

// ── Taklifnoma ─────────────────────────────────────────────────────────────

/** 98498148442 → «984 9814 8442» (Zoom o'zi shunday yozadi). */
export function formatMeetingId(id?: number | string | null): string {
  const s = String(id ?? '');
  return s.length === 11 ? `${s.slice(0, 3)} ${s.slice(3, 7)} ${s.slice(7)}` : s;
}

/**
 * v2 `buildInvitation`: Zoom'ning «Copy Meeting Invitation» bloki — mavzu, vaqt, havola,
 * raqam va parol. Parol havolada ham bor, lekin alohida qator: dial-in uchun kerak.
 */
export function buildInvitation(m: ZoomMeeting, t: TFunction): string {
  const when = inTashkent(m.start_at)?.format('DD.MM.YYYY HH:mm') ?? '';
  const lines = [
    t('zoom.invHeader'),
    '',
    `${t('zoom.invTopic')}: ${m.topic || ''}`,
    `${t('zoom.invTime')}: ${when}`,
    '',
    `${t('zoom.invJoin')}:`,
    m.join_url || '',
    '',
    `${t('zoom.invId')}: ${formatMeetingId(m.zoom_meeting_id)}`,
  ];
  if (m.passcode) lines.push(`${t('zoom.invPasscode')}: ${m.passcode}`);
  return lines.join('\n');
}

// ── Holatlar va amallar ────────────────────────────────────────────────────

export type ZoomScope = 'active' | 'archive';
export const ZOOM_STATUSES = ['pending', 'approved', 'rejected', 'cancelled', 'ended'] as const;

export const STATUS_TONE: Record<string, Tone> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
  ended: 'neutral',
};

export function statusTone(status?: string | null): Tone {
  return STATUS_TONE[status ?? ''] ?? 'neutral';
}

/** Faol ro'yxat serverda faqat pending/approved (va tugamagan) — boshqa holat filtri bo'sh beradi. */
export function statusesForScope(scope: ZoomScope): readonly string[] {
  return scope === 'active' ? ['pending', 'approved'] : ZOOM_STATUSES;
}

const CLOSED = ['cancelled', 'ended', 'rejected'];
export const isClosed = (status?: string | null) => CLOSED.includes(status ?? '');

/** Huquqlar faqat serverning qator bayroqlaridan (`can_manage` / `can_approve`) — v2 aynan. */
export function meetingActions(m: ZoomMeeting) {
  const open = !isClosed(m.status);
  const pending = !!m.can_approve && m.status === 'pending';
  const managedApproved = !!m.can_manage && m.status === 'approved';
  return {
    join: !!m.join_url && open,
    passcode: !!m.passcode && open,
    approve: pending,
    reject: pending,
    start: managedApproved,
    hostKey: managedApproved,
    cancel: !!m.can_manage && open,
    cancelSeries: managedApproved && !!m.series_id,
  };
}

/** Bekor tugmasi yorlig'i: boshlangan/jonli — «Tugatish», seriya kuni — «Shu kunni…». */
export function cancelLabelKey(m: ZoomMeeting): string {
  if (m.is_live || m.is_started) return 'zoom.finish';
  return m.series_id ? 'zoom.cancelThisDay' : 'common.cancel';
}

/** «Boshlash» natijasi: yozuv bilan nima bo'lgani toastda aytiladi (armed/failed bir xil ko'rinmasin). */
export function startOutcome(r: Pick<ZoomStartResult, 'recording' | 'warning'>): {
  kind: 'success' | 'error';
  key: string;
  params?: Record<string, string>;
} {
  if (r.recording === 'failed')
    return { kind: 'error', key: 'zoom.recordingFailed', params: { reason: r.warning || '' } };
  if (r.recording === 'armed') return { kind: 'success', key: 'zoom.recordingArmed' };
  if (r.recording === 'started') return { kind: 'success', key: 'zoom.recordingStarted' };
  return { kind: 'success', key: 'zoom.startOpened' };
}

/** Jonli chip rangi: limit to'lgan — qizil, jonli bor — yashil, aks holda neytral. */
export function liveTone(live: Pick<ZoomLiveSummary, 'is_full' | 'live_count'>): Tone {
  if (live.is_full) return 'danger';
  return live.live_count > 0 ? 'success' : 'neutral';
}

/** Server `ZoomMeetingReject.reason` min_length=2 (bo'shliqsiz). */
export const isValidReason = (reason: string) => reason.trim().length >= 2;

// ── Takrorlash ─────────────────────────────────────────────────────────────

/** «Har kuni» / «har 2 haftada (Du, Cho)» — seriya badge'i uchun. */
export function recurrenceLabel(rec: Partial<ZoomRecurrence> | null | undefined, t: TFunction): string {
  if (!rec) return '';
  const n = rec.interval && rec.interval > 1 ? rec.interval : null;
  if (rec.type === 'daily') return n ? t('zoom.everyNDays', { n }) : t('zoom.repeatDaily');
  if (rec.type === 'weekly') {
    const days = (rec.weekdays || []).map((d) => t(`zoom.wd${d}`)).join(', ');
    const base = n ? t('zoom.everyNWeeks', { n }) : t('zoom.repeatWeekly');
    return days ? `${base} (${days})` : base;
  }
  return n ? t('zoom.everyNMonths', { n }) : t('zoom.repeatMonthly');
}

/** Sana → ISO hafta kuni (1=Du … 7=Ya). */
export function isoWeekday(date: string): number {
  return ((dayjs(date).day() + 6) % 7) + 1;
}

/**
 * v2 `expandRecurrence` — server `expand_recurrence` bilan bir xil qoida (faqat ko'rinish):
 * kunlik/oylik boshlanishdan qadam; haftalik tanlangan kunlar (boshlanish kuni doim) bo'yicha.
 */
export function expandRecurrence(startLocal: string, rec: ZoomRecurrence): string[] {
  const start = dayjs(startLocal);
  if (!start.isValid() || rec.count < 2) return [];
  const count = Math.min(rec.count, 50);
  const step = Math.max(rec.interval || 1, 1);
  const out: Dayjs[] = [start];
  if (rec.type === 'daily') {
    while (out.length < count) out.push(out[out.length - 1]!.add(step, 'day'));
  } else if (rec.type === 'weekly') {
    const days = new Set(rec.weekdays);
    days.add(((start.day() + 6) % 7) + 1);
    const sorted = [...days].sort((a, b) => a - b);
    const monday = start.subtract((start.day() + 6) % 7, 'day');
    let week = 0;
    while (out.length < count && week < 400) {
      const base = monday.add(week * step, 'week');
      for (const d of sorted) {
        const cand = base.add(d - 1, 'day');
        if (cand.isAfter(start) && out.length < count) out.push(cand);
      }
      week += 1;
    }
  } else {
    let i = 0;
    while (out.length < count && i < 720) {
      i += step;
      const cand = start.add(i, 'month');
      if (cand.date() === start.date()) out.push(cand);
    }
  }
  return out.map((d) => d.format('YYYY-MM-DDTHH:mm:ss'));
}

/** Ko'rinish matni: dastlabki 6 kun «DD.MM», ko'p bo'lsa « … oxirgi DD.MM.YYYY». */
export function previewDays(dates: string[]): string {
  const head = dates
    .slice(0, 6)
    .map((d) => dayjs(d).format('DD.MM'))
    .join(', ');
  return dates.length > 6 ? `${head} … ${dayjs(dates[dates.length - 1]).format('DD.MM.YYYY')}` : head;
}

// ── Yaratish formasi ───────────────────────────────────────────────────────

export type Repeat = 'none' | ZoomRecurrence['type'];
export const REPEATS: Repeat[] = ['none', 'daily', 'weekly', 'monthly'];

export interface ZoomForm {
  topic: string;
  /** Toshkent sanasi `YYYY-MM-DD`. */
  date: string;
  /** Toshkent vaqti `HH:mm`. */
  time: string;
  duration: number;
  agenda: string;
  record: boolean;
  waitingRoom: boolean;
  repeat: Repeat;
  interval: string;
  weekdays: number[];
  count: string;
}

/** v2 formaning boshlang'ich vaqti. */
export const DEFAULT_START_TIME = '10:00';
const SLOT_MS = 30 * 60_000;

/**
 * Formaning boshlang'ich sana/vaqti (Toshkent devor soati). v2 bugun 10:00 ni beradi — u
 * hali oldinda bo'lsa shunday qoladi; o'tib ketgan bo'lsa «hozir + 30 daqiqa», keyingi
 * :00 / :30 ga yaxlitlangan (yarim tundan oshsa — ertangi kun). `now` — UTC epoch ms.
 */
export function defaultZoomStart(now: number = Date.now()): { date: string; time: string } {
  const today = tashkentToday(now);
  const tenAm = Date.parse(`${today}T${DEFAULT_START_TIME}:00Z`) - TASHKENT_OFFSET_MS;
  const slot = Math.ceil((now + SLOT_MS) / SLOT_MS) * SLOT_MS;
  // Toshkent UTC+5:00 — butun soat, shuning uchun UTC'dagi :00/:30 chegarasi Toshkentda ham :00/:30.
  const at = Math.max(tenAm, slot);
  const wall = new Date(at + TASHKENT_OFFSET_MS).toISOString();
  return { date: wall.slice(0, 10), time: wall.slice(11, 16) };
}

export function initialZoomForm(today: string, time: string = DEFAULT_START_TIME): ZoomForm {
  return {
    topic: '',
    date: today,
    time,
    duration: 60,
    agenda: '',
    record: false,
    waitingRoom: false,
    repeat: 'none',
    interval: '1',
    weekdays: [],
    count: '10',
  };
}

/** Mintaqasiz satr — server uni Toshkent vaqti deb oladi; bandlik so'rovi ham, yaratish ham SHU satr. */
export function startAtOf(form: Pick<ZoomForm, 'date' | 'time'>): string | null {
  return form.date && form.time ? `${form.date}T${form.time}:00` : null;
}

/** Davomiylik «soat + daqiqa»: 10 daqiqadan 24 soatgacha (v2 DurationPicker). */
export const DUR_HOURS = Array.from({ length: 25 }, (_, h) => h);
export const DUR_MINUTES = [0, 10, 15, 30, 45];
export function composeDuration(hours: number, minutes: number): number {
  return Math.min(Math.max(hours * 60 + minutes, 10), 24 * 60);
}
export function splitDuration(total: number): { hours: number; minutes: number } {
  const v = Number.isFinite(total) && total > 0 ? total : 60;
  return { hours: Math.floor(v / 60), minutes: v % 60 };
}

export function buildRecurrence(form: ZoomForm): ZoomRecurrence | null {
  if (form.repeat === 'none') return null;
  return {
    type: form.repeat,
    interval: Math.min(Math.max(Number(form.interval) || 1, 1), 12),
    weekdays: form.repeat === 'weekly' ? [...form.weekdays].sort((a, b) => a - b) : [],
    count: Number(form.count) || 0,
  };
}

export function validateZoomForm(form: ZoomForm): 'topicRequired' | 'durationRange' | 'repeatCountRange' | null {
  if (form.topic.trim().length < 2) return 'topicRequired';
  if (!form.duration || form.duration < 5 || form.duration > 1440) return 'durationRange';
  const rec = buildRecurrence(form);
  if (rec && (rec.count < 2 || rec.count > 50)) return 'repeatCountRange';
  return null;
}

/** v2 `submit`: `join_before_host` doim true (host — texnik akkaunt). */
export function buildCreateBody(form: ZoomForm) {
  return {
    topic: form.topic.trim(),
    start_at: startAtOf(form),
    duration_minutes: form.duration,
    agenda: form.agenda.trim() || null,
    record: form.record,
    waiting_room: form.waitingRoom,
    join_before_host: true,
    recurrence: buildRecurrence(form),
  };
}

// ── Bandlik (availability) ─────────────────────────────────────────────────

/** v2 `useZoomAvailability.enabled`: aniq boshlanish + 5..1440 daqiqa. */
export function canProbe(startAt: string | null, minutes: number): startAt is string {
  return !!startAt && minutes >= 5 && minutes <= 1440;
}

/**
 * Faqat formadagi JORIY oraliqqa tegishli javob ishonchli: debounce tugaguncha ekrandagi
 * javob ESKI oraliq haqida va yangi oraliq uchun tugmani o'chirmasligi kerak.
 */
export function currentVerdict(
  availability: ZoomAvailability | null | undefined,
  probe: { start: string | null; minutes: number },
  current: { start: string | null; minutes: number },
): ZoomAvailability | null {
  return availability && probe.start === current.start && probe.minutes === current.minutes ? availability : null;
}

/** Litsenziya limiti to'lgani ANIQ bo'lsa yuborilmaydi (server 409 qaytarardi). */
export const submitBlocked = (verdict: ZoomAvailability | null) => verdict?.is_free === false;
