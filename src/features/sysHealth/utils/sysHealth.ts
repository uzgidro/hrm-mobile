// Tizim holati (web v2 `SystemHealthPage` + `SystemOpsPanel`) — sof mantiq.
// Server: `system/ops/*`, faqat sayt master-admini (`_require_master_admin`).
import type { Tone } from '@/ui';

export interface OpsState {
  mode?: string | null;
  mode_label?: string | null;
  reason?: string | null;
  changed_at?: string | null;
  changed_by_name?: string | null;
}

export interface SysCheck {
  component: string;
  status: string;
  detail?: string | null;
  severity?: string | null;
}

export interface Diagnostics {
  mode?: string;
  checks?: SysCheck[];
  failed?: number;
  critical?: number;
  healthy?: boolean;
  elapsed_ms?: number;
  checked_at?: string;
}

export interface Incident {
  id: number;
  kind?: string | null;
  title?: string | null;
  severity?: string | null;
  message?: string | null;
  detected_at?: string | null;
  resolved_at?: string | null;
  acknowledged?: boolean | null;
  duration_seconds?: number | null;
}

/** Serverning ma'lum rejimlari (`models/system_ops.py` MODES). */
export const OPS_MODES = ['running', 'maintenance', 'recovery'] as const;
/** `models/system_ops.py` `kind`: detected · shutdown · recovery (E3) · restore (zaxira nusxadan, E1). */
export const INCIDENT_KINDS = ['shutdown', 'recovery', 'detected', 'restore'] as const;

/** Server tarjimasi bo'lgan komponent nomlari (v2 `sysHealth.comp_*`). */
export const KNOWN_COMPONENTS = [
  'database',
  'db_connections',
  'redis',
  'minio',
  'celery',
  'disk',
  'storage',
  'worker',
  'migrations',
  'branch_topology',
] as const;

/**
 * Umumiy holat. ⚠️ v2 izohi: so'rov yiqilsa «soz» DEYILMAYDI — bilmaslik soz degani emas.
 */
export function overallStatus(isError: boolean, data?: Diagnostics | null): 'failed' | 'healthy' | 'degraded' {
  if (isError) return 'failed';
  return data?.healthy !== false ? 'healthy' : 'degraded';
}

/** v2: ok → yashil, ogohlantirish → sariq, qolgani (kritik) → qizil. */
export function checkTone(c: Pick<SysCheck, 'status' | 'severity'>): Tone {
  if (c.status === 'ok') return 'success';
  return c.severity === 'warning' ? 'warning' : 'danger';
}

export type OpsAction = 'shutdown' | 'enter' | 'run' | 'resume';

/** v2 `SystemOpsPanel`: ishlayotganda faqat to'xtatish; aks holda tiklash/qaytarish. */
export function opsActions(mode?: string | null): OpsAction[] {
  const m = mode || 'running';
  if (m === 'running') return ['shutdown'];
  return m === 'recovery' ? ['run', 'resume'] : ['enter', 'run', 'resume'];
}

/** Server `ShutdownIn.reason`: 3..1000 belgi (bo'shliqsiz). */
export const REASON_MIN = 3;
export const REASON_MAX = 1000;
export const isReasonValid = (reason: string) => reason.trim().length >= REASON_MIN;

export const shutdownBody = (reason: string, force: boolean) => ({ reason: reason.trim(), force });

export type TxAction = 'keep' | 'rollback';
export const recoveryBody = (tx: TxAction) => ({ tx_action: tx, repair: true });

/** Tiklash natijasi: server `ok: false` qaytarsa — muammolar qolgan (v2 `recoveryProblems`). */
export function recoveryHasProblems(data: unknown): boolean {
  return !!data && typeof data === 'object' && (data as { ok?: unknown }).ok === false;
}

/** v2 hisobotni so'zma-so'z ko'rsatadi — bu ishga tushirish nimaga tekkanining yagona qaydi. */
export function prettyReport(data: unknown): string {
  try {
    return JSON.stringify(data ?? {}, null, 2) ?? '';
  } catch {
    return String(data);
  }
}

/** v2 `Math.round(duration_seconds / 60)` daqiqa; yo'q bo'lsa `null`. */
export function incidentMinutes(sec?: number | null): number | null {
  return sec == null || !Number.isFinite(Number(sec)) ? null : Math.round(Number(sec) / 60);
}

export const incidentResolved = (i: Pick<Incident, 'resolved_at'>) => !!i.resolved_at;
