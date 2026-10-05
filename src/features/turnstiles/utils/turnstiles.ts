// Turniketlar (web v2 TurnstilesPage + features/system/useSystemAdmin, useDevices, IsapiDeviceModal,
// IsapiTerminalPanel, TurnstileDoorsPanel, HikSyncModal) — sof mantiq: holat, qator matnlari, turniket /
// eshik / ISAPI terminal formalarining tekshiruvi va tanasi, qurilma javoblarining talqini (v2 bilan aynan).
//
// ⚠️ Maxfiylik: `GET /turnstiles` har qanday xodimga ochiq va `event_token` / `rtsp_stream_url` ni
// ataylab QAYTARMAYDI — bu ekran ularni na ko'rsatadi, na tahrirlaydi (v2). ISAPI terminal paroli hech
// qaysi javobda yo'q: forma maydoni doim bo'sh boshlanadi, bo'sh saqlash — «joriy parol qoladi».
import type { User } from '@/types';
import { canMonitorTerminals } from '@/utils/roles';

export interface TurnstileRow {
  id: number;
  acs_dev_index_code?: string | null;
  acs_dev_name?: string | null;
  display_name?: string | null;
  acs_dev_ip?: string | null;
  acs_dev_port?: number | null;
  acs_dev_code?: string | null;
  treaty_type?: string | null;
  /** HikCentral kodlashi: "1" — onlayn, qolgani (bo'sh ham) — javob bermayapti. */
  status?: string | null;
  locations?: { id: number; name?: string | null; organization_branch_id?: number | null }[] | null;
}

export interface TurnstileDoor {
  id: number;
  door_index_code?: string | null;
  acs_dev_index_code?: string | null;
  door_no?: string | null;
  door_name?: string | null;
  turnstile_id?: number | null;
  /** 'entrance' | 'exit' | null — davomat kelish/ketishni AYNAN shundan o'qiydi. */
  direction_type?: string | null;
}

/** `GET /isapi-devices` qatori — login bor, PAROL hech qachon qaytmaydi. */
export interface IsapiDevice {
  id: number;
  name?: string | null;
  ip?: string | null;
  port?: number | null;
  model?: string | null;
  username?: string | null;
  status?: string | null;
  branch_ids?: number[] | null;
}

export interface IsapiTestResult {
  online?: boolean;
  error?: string;
  model?: string;
  firmware_version?: string;
}
export interface IsapiPollResult {
  pulled?: number;
  created?: number;
  /** Qurilma qulfini davriy o'quvchi ushlab turgan — hech nima bajarilmadi (xato emas). */
  skipped?: string;
  detail?: string;
}
export interface IsapiUnknownUsers {
  total_on_device?: number;
  known?: number;
  unknown_count?: number;
  unknown?: string[];
}
export interface AccessList {
  id: number;
  privilege_group_id?: string | null;
  privilege_group_name?: string | null;
}

/** v2 `isOnline`: faqat "1" onlayn. */
export const isOnline = (status?: string | null) => status === '1';

export const turnstileName = (x: Pick<TurnstileRow, 'id' | 'display_name' | 'acs_dev_name'>) =>
  x.display_name || x.acs_dev_name || `#${x.id}`;

/** v2 qator osti: IP · manzillar (bo'sh bo'lsa «—»). */
export function turnstileSubtitle(x: TurnstileRow): string {
  const places = (x.locations ?? [])
    .map((l) => l.name)
    .filter(Boolean)
    .join(', ');
  return [x.acs_dev_ip, places].filter(Boolean).join(' · ') || '—';
}

/** Ro'yxatdagi (ya'ni qidiruv natijasidagi) onlayn qurilmalar soni — v2 «3 / 7 onlayn». */
export const onlineCount = (rows: TurnstileRow[]) => rows.filter((x) => isOnline(x.status)).length;

export const isIsapi = (x: Pick<TurnstileRow, 'treaty_type'>) => x.treaty_type === 'ISAPI';

/** v2 ulanish turlari ro'yxati (Combobox) — kodlar tarjima qilinmaydi. */
export const TREATY_TYPES = ['HikCentral', 'ISAPI'] as const;

/**
 * v2 `canRunHikSync`: HikCentral TO'LIQ sinxroni butun tashkilotni qayta yozadi — server faqat GLOBAL
 * tizim administratorini kiritadi. AKT xodimi va filialga bog'langan admin hisobi — yo'q (tugma 403 berardi).
 */
export function canRunHikSync(user?: User | null): boolean {
  if (!canMonitorTerminals(user)) return false;
  if ((user?.akt_branch_ids?.length ?? 0) > 0) return false;
  return !user?.admin?.organization_branch_id;
}

/** Ko'p tanlov ro'yxatiga qo'shadi / olib tashlaydi (tanlash tartibi saqlanadi). */
export const toggleId = (list: number[], id: number) =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

export type BuildResult = { ok: true; body: Record<string, unknown> } | { ok: false; error: string };

const digits = (v: string) => v.replace(/\D/g, '');

// ── Turniket formasi ─────────────────────────────────────────────────────────

export interface TurnstileForm {
  indexCode: string;
  name: string;
  ip: string;
  port: string;
  devCode: string;
  treatyType: string;
  locationIds: number[];
}

export const seedTurnstileForm = (r: TurnstileRow | null): TurnstileForm => ({
  indexCode: r?.acs_dev_index_code ?? '',
  name: r?.acs_dev_name ?? '',
  ip: r?.acs_dev_ip ?? '',
  port: r?.acs_dev_port != null ? String(r.acs_dev_port) : '',
  devCode: r?.acs_dev_code ?? '',
  treatyType: r?.treaty_type ?? '',
  locationIds: (r?.locations ?? []).map((l) => l.id),
});

/** v2 `TurnstileModal.submit`: indeks kodi → nom majburiy; bo'sh maydonlar `null`; manzillar ro'yxati. */
export function buildTurnstileBody(f: TurnstileForm): BuildResult {
  if (!f.indexCode.trim()) return { ok: false, error: 'turnstiles.codeRequired' };
  if (!f.name.trim()) return { ok: false, error: 'turnstiles.nameRequired' };
  const port = digits(f.port);
  return {
    ok: true,
    body: {
      acs_dev_index_code: f.indexCode.trim(),
      acs_dev_name: f.name.trim(),
      acs_dev_ip: f.ip.trim() || null,
      acs_dev_port: port ? Number(port) : null,
      acs_dev_code: f.devCode.trim() || null,
      treaty_type: f.treatyType.trim() || null,
      location_ids: f.locationIds,
    },
  };
}

// ── Eshiklar ─────────────────────────────────────────────────────────────────

export type Direction = 'entrance' | 'exit';

/** v2: «exit» bo'lmasa — kirish (Segmented qiymati); belgilanmagani alohida ogohlantiriladi. */
export const doorDirection = (d: Pick<TurnstileDoor, 'direction_type'>): Direction =>
  d.direction_type === 'exit' ? 'exit' : 'entrance';

export interface DoorForm {
  code: string;
  no: string;
  name: string;
  direction: Direction;
}

export const EMPTY_DOOR: DoorForm = { code: '', no: '', name: '', direction: 'entrance' };

/** v2 `TurnstileDoorsPanel.submitNew`: eshik kodi majburiy; qurilma kodi turniketdan ko'chiriladi. */
export function buildDoorBody(f: DoorForm, turnstileId: number, deviceIndexCode?: string | null): BuildResult {
  if (!f.code.trim()) return { ok: false, error: 'turnstiles.doorCodeRequired' };
  return {
    ok: true,
    body: {
      turnstile_id: turnstileId,
      door_index_code: f.code.trim(),
      acs_dev_index_code: deviceIndexCode ?? '',
      door_no: f.no.trim() || null,
      door_name: f.name.trim() || null,
      direction_type: f.direction,
    },
  };
}

// ── ISAPI terminal ───────────────────────────────────────────────────────────

export interface IsapiForm {
  name: string;
  ip: string;
  port: string;
  username: string;
  password: string;
  direction: Direction;
  branchId: number | null;
  locationIds: number[];
}

export const EMPTY_ISAPI: IsapiForm = {
  name: '',
  ip: '',
  port: '80',
  username: 'admin',
  password: '',
  direction: 'entrance',
  branchId: null,
  locationIds: [],
};

export const onlyDigits = digits;

/**
 * v2 `IsapiDeviceModal.submit`: IP → parol → kamida bitta manzil (turniket filialga AYNAN manzil orqali
 * bog'lanadi). Filial faqat manzillarni saralash uchun — tanaga kirmaydi. Port bo'sh — 80.
 */
export function buildIsapiBody(f: IsapiForm): BuildResult {
  if (!f.ip.trim()) return { ok: false, error: 'turnstiles.isapiIpRequired' };
  if (!f.password) return { ok: false, error: 'turnstiles.isapiPasswordRequired' };
  if (f.locationIds.length === 0) return { ok: false, error: 'turnstiles.isapiLocationRequired' };
  return {
    ok: true,
    body: {
      ip: f.ip.trim(),
      port: Number(digits(f.port)) || 80,
      name: f.name.trim() || null,
      direction_type: f.direction,
      location_ids: f.locationIds,
      username: f.username.trim() || null,
      password: f.password,
    },
  };
}

/** v2 `saveCredentials`: login majburiy; bo'sh parol — `null` (joriy parol qoladi). */
export function buildCredentialsBody(login: string, password: string): BuildResult {
  if (!login.trim()) return { ok: false, error: 'turnstiles.isapiLoginRequired' };
  return { ok: true, body: { username: login.trim(), password: password || null } };
}

/** v2 `runTest`: `online === false` — ulanmadi (sabab bilan), aks holda model + proshivka. */
export function isapiTestOutcome(res?: IsapiTestResult | null): { ok: boolean; text: string } {
  if (res?.online === false) return { ok: false, text: res.error || '' };
  return { ok: true, text: [res?.model, res?.firmware_version].filter(Boolean).join(' ') || '—' };
}

/** v2 `runPoll`: band qurilma — xato emas, ma'lumot; aks holda o'qilgan/yangi soni. */
export function isapiPollOutcome(
  res?: IsapiPollResult | null,
): { kind: 'busy'; detail: string | null } | { kind: 'done'; pulled: number; created: number } {
  if (res?.skipped) return { kind: 'busy', detail: res.detail || null };
  return { kind: 'done', pulled: res?.pulled ?? 0, created: res?.created ?? 0 };
}
