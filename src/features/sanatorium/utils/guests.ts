// Pure helpers of the guests / bookings / rooms round: form validation, child rule, card share text,
// bulk check-in runner, occupancy cell tone, timeline kinds. No React, no network.
import { Env } from '@/config/env';
import type { IconName } from '@/components/Icon';
import type { Tone } from '@/ui/Chip';
import { formatUzPhone } from '@/utils/phone';

export const PASSPORT_RE = /^[A-Z]{2}\d{7}$/;
export const PHONE_RE = /^\+998\d{9}$/;

/** Text limits shared with the web forms (and the backend schema). */
export const LIMITS = { name: 255, short: 255, note: 2000, reason: 1000, family: 255 } as const;

export const clip = (s: string, max: number): string => (s.length > max ? s.slice(0, max) : s);

/** Passport as typed: two Latin letters, then up to seven digits (same rule as the web input). */
export function maskPassportInput(raw: string): string {
  const up = raw.toUpperCase();
  const letters = up.replace(/[^A-Z]/g, '').slice(0, 2);
  const digits = up.replace(/^[^0-9]*/, '').replace(/[^0-9]/g, '').slice(0, 7);
  return letters + digits;
}

/** Blank -> '' (no phone); a UZ number in any common shape -> `+998XXXXXXXXX`; anything else stays as typed. */
export function normalizePhoneInput(raw: string): string {
  const s = raw.trim();
  return s ? formatUzPhone(s) : '';
}

export type GuestFormErrors = { name?: string; passport?: string; phone?: string };

/**
 * Validation of the guest form (`guest`: passport / phone only checked when filled, name >= 3) and of
 * the walk-in request (`walkin`: name >= 5, passport and phone required). Values are i18n keys.
 */
export function validateGuestFields(
  v: { name: string; passport: string; phone: string },
  mode: 'guest' | 'walkin',
): GuestFormErrors {
  const e: GuestFormErrors = {};
  const name = v.name.trim();
  if (mode === 'walkin' ? name.length < 5 : name.length < 3) e.name = mode === 'walkin' ? 'sanatorium.nameShort5' : 'sanGuests.nameMin';
  const passport = v.passport.trim();
  if (mode === 'walkin' ? !PASSPORT_RE.test(passport.toUpperCase()) : passport !== '' && !PASSPORT_RE.test(passport.toUpperCase())) e.passport = 'sanGuests.passportBad';
  const phone = normalizePhoneInput(v.phone);
  if (mode === 'walkin' ? !PHONE_RE.test(phone) : phone !== '' && !PHONE_RE.test(phone)) e.phone = 'sanGuests.phoneBad';
  return e;
}

/** First error key of {@link validateGuestFields}, in form order. */
export const firstError = (e: GuestFormErrors): string | null => e.name ?? e.passport ?? e.phone ?? null;

/** A family member is a child by age (<= the settings limit); without a birth date the relation decides. */
export function isChildMember(age: number | null | undefined, relation: string | null | undefined, limit: number | null | undefined): boolean {
  if (age != null) return age <= (limit ?? 14);
  return relation === 'child';
}

/** Rooms that still have `need` free beds on the busiest night (the room being edited always stays). */
export function roomHasFree(capacity: number, occupancy: number[], need: number, isOwn = false): boolean {
  if (isOwn) return true;
  return Math.max(0, capacity - Math.max(0, ...occupancy)) >= Math.max(1, need);
}

/** Packages are offered for the chosen guest type (no list = every type); the picked one always stays. */
export function packageFitsType(p: { id: number; guest_types?: string[] | null }, type: string, pickedId: number | null): boolean {
  const types = p.guest_types ?? [];
  return types.length === 0 || types.includes(type) || p.id === pickedId;
}

/** Public cabinet page of the web app (the same host that serves the map viewer). */
export function guestCabinetUrl(): string {
  try {
    return `${new URL(Env.mapViewerUrl).origin}/sihatgoh-kabinet`;
  } catch {
    return 'https://hr.uzgidro.uz/sihatgoh-kabinet';
  }
}

export type CardShare = {
  name: string;
  loginCode?: string | null;
  password?: string | null;
  cabinetUrl?: string | null;
  contacts?: string | null;
  addresses?: string | null;
  workHours?: string | null;
  labels: { loginCode: string; password: string; cabinet: string };
};

/** Plain text of the guest card for the OS share sheet / clipboard. Empty parts are skipped. */
export function buildCardShareText(c: CardShare): string {
  const lines = [
    c.name,
    c.loginCode ? `${c.labels.loginCode}: ${c.loginCode}` : null,
    c.password ? `${c.labels.password}: ${c.password}` : null,
    c.cabinetUrl ? `${c.labels.cabinet}: ${c.cabinetUrl}` : null,
    c.contacts,
    c.addresses,
    c.workHours,
  ];
  return lines.filter((x): x is string => !!x && x.trim() !== '').join('\n');
}

export type BulkFailure = { id: number; error: string };
export type BulkResult = { ok: number[]; failed: BulkFailure[]; warnings: unknown[] };

/**
 * Runs `act` for every id one after another (never in parallel: the server checks the room per call).
 * A failure never stops the rest. `onProgress(done, total)` fires after each id.
 */
export async function runBulk(
  ids: number[],
  act: (id: number) => Promise<unknown>,
  errorText: (e: unknown) => string,
  onProgress?: (done: number, total: number) => void,
): Promise<BulkResult> {
  const out: BulkResult = { ok: [], failed: [], warnings: [] };
  let done = 0;
  for (const id of ids) {
    try {
      out.warnings.push(await act(id));
      out.ok.push(id);
    } catch (e) {
      out.failed.push({ id, error: errorText(e) });
    }
    done += 1;
    onProgress?.(done, ids.length);
  }
  return out;
}

export type CellTone = 'oos' | 'free' | 'partial' | 'full';
/** Colour class of one grid cell (used beds of a room on a day). */
export function cellTone(used: number, capacity: number, outOfService: boolean): CellTone {
  if (outOfService) return 'oos';
  if (used >= capacity) return 'full';
  return used > 0 ? 'partial' : 'free';
}

/** Icon + tone of every guest chronology kind (mirror of the web Timeline). */
export const TIMELINE_KINDS: Record<string, { icon: IconName; tone: Tone }> = {
  registered: { icon: 'user', tone: 'brand' },
  request_accepted: { icon: 'check', tone: 'success' },
  booked: { icon: 'calendar', tone: 'info' },
  checked_in: { icon: 'checkDouble', tone: 'success' },
  checked_out: { icon: 'logout', tone: 'neutral' },
  early_leave: { icon: 'logout', tone: 'warning' },
  cancelled: { icon: 'close', tone: 'danger' },
  no_show: { icon: 'close', tone: 'danger' },
  stay_changed: { icon: 'edit', tone: 'neutral' },
  payment: { icon: 'wallet', tone: 'success' },
  credentials: { icon: 'lock', tone: 'brand' },
  family: { icon: 'users', tone: 'brand' },
  appointment: { icon: 'clock', tone: 'info' },
  appointment_moved: { icon: 'clock', tone: 'warning' },
  appointment_done: { icon: 'checklist', tone: 'success' },
  referral: { icon: 'doc', tone: 'info' },
  nurse_notified: { icon: 'bell', tone: 'brand' },
  procedure: { icon: 'target', tone: 'info' },
  procedure_done: { icon: 'check', tone: 'success' },
};
export const timelineKind = (kind: string): { icon: IconName; tone: Tone } => TIMELINE_KINDS[kind] ?? { icon: 'clock', tone: 'neutral' };

/** Where «Arrive / settle» of a guest goes: the open stay, else the wizard with the booked stay or the guest. */
export function arriveTarget(
  guestId: number,
  stays: { id: number; status: string }[],
): { kind: 'stay'; id: number } | { kind: 'wizard'; params: { stay?: string; guest?: string } } {
  const live = stays.find((s) => s.status === 'booked' || s.status === 'checked_in');
  if (live?.status === 'checked_in') return { kind: 'stay', id: live.id };
  if (live) return { kind: 'wizard', params: { stay: String(live.id) } };
  return { kind: 'wizard', params: { guest: String(guestId) } };
}
