// LMS integratsiyasi (web v2 `LmsPage` + `useLms`) — sof mantiq.
// ⚠️ API KALIT HECH QACHON QAYTMAYDI: server faqat `has_api_key` beradi; saqlashda bo'sh kalit
// «eskisi qolsin» degani — bo'sh satr yuborilsa ishlayotgan kalit o'chib ketardi.
import type { Tone } from '@/ui';

export interface LmsSyncStats {
  fetched?: number;
  created?: number;
  updated?: number;
  skipped?: number;
}

export interface LmsSettings {
  provider?: string | null;
  base_url?: string | null;
  has_api_key?: boolean;
  is_enabled?: boolean;
  auto_sync?: boolean;
  last_sync_at?: string | null;
  last_sync_status?: string | null;
  last_sync_message?: string | null;
  last_sync_stats?: LmsSyncStats | null;
  /** Shu build gaplasha oladigan platformalar. */
  providers?: string[];
}

export interface LmsSyncLog extends LmsSyncStats {
  id: number;
  started_at?: string | null;
  finished_at?: string | null;
  status?: string | null;
  triggered_by?: string | null;
  message?: string | null;
}

export interface LmsForm {
  provider: string;
  baseUrl: string;
  /** Faqat yangi kiritilgan kalit; bo'sh = o'zgarmaydi. */
  apiKey: string;
  enabled: boolean;
  autoSync: boolean;
}

/** v2 `useEffect([settings])`: kalit maydoni har doim bo'sh boshlanadi. */
export function seedLmsForm(s?: LmsSettings | null): LmsForm {
  return {
    provider: s?.provider || 'generic',
    baseUrl: s?.base_url || '',
    apiKey: '',
    enabled: !!s?.is_enabled,
    autoSync: !!s?.auto_sync,
  };
}

export function providerOptions(s?: LmsSettings | null): string[] {
  return s?.providers?.length ? s.providers : ['generic'];
}

/** PUT `lms/settings` tanasi — kalit faqat kiritilgan bo'lsa (v2 aynan). */
export function buildLmsBody(f: LmsForm) {
  const key = f.apiKey.trim();
  return {
    provider: f.provider,
    base_url: f.baseUrl.trim(),
    ...(key ? { api_key: key } : {}),
    is_enabled: f.enabled,
    auto_sync: f.autoSync,
  };
}

export const syncStatusTone = (status?: string | null): Tone => (status === 'ok' ? 'success' : 'danger');

/** v2: `status === 'ok'` — muvaffaqiyat (yangi/yangilangan soni bilan), aks holda server xabari. */
export function syncOutcome(r?: { status?: string; message?: string; created?: number; updated?: number } | null) {
  return r?.status === 'ok'
    ? { ok: true as const, created: r.created ?? 0, updated: r.updated ?? 0 }
    : { ok: false as const, message: r?.message || null };
}

/** Jurnal qatori o'ng tomoni: `+yangi / ~yangilangan` (v2). */
export const logCounts = (l: LmsSyncLog) => `+${l.created ?? 0} / ~${l.updated ?? 0}`;
