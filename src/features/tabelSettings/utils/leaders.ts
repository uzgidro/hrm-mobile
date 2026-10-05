// Filial rahbarlari (web v2 `BranchLeadersModal`) — sof mantiq: rollar ro'yxati (server
// `ALLOWED_LEADERSHIP_ROLES` bilan to'liq), saqlanmagan ro'yxat (qo'shish, rolni almashtirish, olib
// tashlash), dublikat tekshiruvi va saqlashdagi farq (avval olib tashlash, keyin qo'shish — v2 tartibi).

/**
 * ⚠️ To'liq bo'lsin (v2 izohi): ro'yxatda yo'q rol — hech kim yoqa olmaydigan modul (hamshira — sog'liq
 * ko'rigi, transport — avtopark, phone_editor — telefon ma'lumotnomasi). Kodlar tarjima qilinmaydi.
 */
export const LEADERSHIP_ROLES = [
  'director',
  'deputy',
  'chancellery',
  'accounting',
  'legal',
  'trip_approver',
  'akt',
  'transport',
  'transport_approver',
  'nurse',
  'hr',
  'lms_manager',
  'phone_editor',
] as const;
export type LeadershipRole = (typeof LEADERSHIP_ROLES)[number];

/** Rol kodi → i18n kaliti (`tabelSettings` nomlar fazosida). */
export const ROLE_LABEL_KEY: Record<LeadershipRole, string> = {
  director: 'tabelSettings.roleDirector',
  deputy: 'tabelSettings.roleDeputy',
  chancellery: 'tabelSettings.roleChancellery',
  accounting: 'tabelSettings.roleAccounting',
  legal: 'tabelSettings.roleLegal',
  trip_approver: 'tabelSettings.roleTripApprover',
  akt: 'tabelSettings.roleAkt',
  transport: 'tabelSettings.roleTransport',
  transport_approver: 'tabelSettings.roleTransportApprover',
  nurse: 'tabelSettings.roleNurse',
  hr: 'tabelSettings.roleHr',
  lms_manager: 'tabelSettings.roleLmsManager',
  phone_editor: 'tabelSettings.rolePhoneEditor',
};

/** Noma'lum (yangi server) rol — kodning o'zi ko'rinadi. */
export const roleLabelKey = (role: string): string | null =>
  (ROLE_LABEL_KEY as Record<string, string | undefined>)[role] ?? null;

/** `GET organization-branches/{id}/leaders` qatori. */
export interface BranchLeader {
  employee_id?: number | null;
  leadership_role: string;
  employee?: {
    id?: number;
    legal_name?: string | null;
    photo_path?: string | null;
    photo_thumb_path?: string | null;
    job_position?: { name?: string | null } | null;
  } | null;
}

export type PendingLeader = BranchLeader & { _new?: boolean };

export const leaderEmpId = (l: BranchLeader): number | undefined => l.employee_id ?? l.employee?.id ?? undefined;
export const leaderKey = (l: BranchLeader) => `${leaderEmpId(l)}:${l.leadership_role}`;

/** Xodim + rol juftligi ro'yxatda bormi (o'zidan tashqari). */
export function isDuplicate(list: PendingLeader[], empId: number, role: string, except?: PendingLeader): boolean {
  return list.some((l) => l !== except && leaderEmpId(l) === empId && l.leadership_role === role);
}

export type PendingResult = { ok: true; list: PendingLeader[] } | { ok: false; error: 'tabelSettings.leaderDup' };

export interface PickedEmployee {
  id: number;
  legal_name?: string | null;
  photo_path?: string | null;
  job_position?: { name?: string | null } | string | null;
}

/** v2 `addLeader`: dublikat bo'lsa rad etiladi, aks holda «yangi» belgisi bilan oxiriga qo'shiladi. */
export function addPending(list: PendingLeader[], emp: PickedEmployee, role: string): PendingResult {
  if (isDuplicate(list, emp.id, role)) return { ok: false, error: 'tabelSettings.leaderDup' };
  const jp = emp.job_position;
  return {
    ok: true,
    list: [
      ...list,
      {
        employee_id: emp.id,
        leadership_role: role,
        employee: {
          id: emp.id,
          legal_name: emp.legal_name,
          photo_path: emp.photo_path ?? null,
          job_position: jp && typeof jp === 'object' ? { name: jp.name } : null,
        },
        _new: true,
      },
    ],
  };
}

/** v2 `changeRole`: shu xodimda yangi rol allaqachon bo'lsa rad etiladi. */
export function changePendingRole(list: PendingLeader[], key: string, role: string): PendingResult {
  const row = list.find((l) => leaderKey(l) === key);
  if (!row) return { ok: true, list };
  const empId = leaderEmpId(row);
  if (empId != null && isDuplicate(list, empId, role, row)) return { ok: false, error: 'tabelSettings.leaderDup' };
  return { ok: true, list: list.map((l) => (l === row ? { ...l, leadership_role: role } : l)) };
}

export const removePending = (list: PendingLeader[], key: string) => list.filter((l) => leaderKey(l) !== key);

export function hasLeaderChanges(original: BranchLeader[], pending: PendingLeader[]): boolean {
  const o = new Set(original.map(leaderKey));
  const p = new Set(pending.map(leaderKey));
  if (o.size !== p.size) return true;
  for (const k of o) if (!p.has(k)) return true;
  return false;
}

export interface LeaderOp {
  employee_id: number;
  role: string;
}

/** Saqlash farqi: asl ro'yxatda bor, endi yo'q — o'chiriladi; yangi — qo'shiladi (xodimsiz qatorlar o'tkaziladi). */
export function leadersDiff(
  original: BranchLeader[],
  pending: PendingLeader[],
): { remove: LeaderOp[]; add: LeaderOp[] } {
  const oKeys = new Set(original.map(leaderKey));
  const pKeys = new Set(pending.map(leaderKey));
  const ops = (rows: BranchLeader[]) =>
    rows.flatMap((l) => {
      const id = leaderEmpId(l);
      return id ? [{ employee_id: id, role: l.leadership_role }] : [];
    });
  return {
    remove: ops(original.filter((l) => !pKeys.has(leaderKey(l)))),
    add: ops(pending.filter((l) => !oKeys.has(leaderKey(l)))),
  };
}
