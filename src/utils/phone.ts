// Uzbekistan phone helpers. Stored numbers are inconsistent (`+998944113196`,
// `998944113196`, `944113196`), so every place that shows or dials an employee
// phone goes through here. Keep the rule in sync with the backend normalizer.

/** Fixed prefix of the phone inputs (the user cannot delete it). */
export const UZ_PHONE_PREFIX = '+998';

/** Canonical `+998XXXXXXXXX` for 9 national digits or 12 digits starting with 998; otherwise null. */
function canonicalUz(raw: string): string | null {
  const digits = raw.replace(/\D+/g, '');
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`;
  return null;
}

/** Display form: `+998XXXXXXXXX` (no spaces); junk / foreign / extensions come back trimmed, unchanged. */
export function formatUzPhone(raw?: string | null): string {
  const s = (raw ?? '').trim();
  if (!s) return '';
  return canonicalUz(s) ?? s;
}

/** Dial URL: `tel:+998XXXXXXXXX`; non-UZ values dial their raw digits (leading + kept). Empty -> ''. */
export function telUrl(raw?: string | null): string {
  const s = (raw ?? '').trim();
  if (!s) return '';
  const uz = canonicalUz(s);
  if (uz) return `tel:${uz}`;
  const digits = s.replace(/\D+/g, '');
  if (!digits) return '';
  return `tel:${s.startsWith('+') ? '+' : ''}${digits}`;
}

/** Digits (max 9) a user typed after the fixed `+998` prefix; tolerates pasted full numbers. */
export function uzPhoneInputDigits(text: string): string {
  let d = text.replace(/\D+/g, '');
  if (d.startsWith('998') && d.length > 9) d = d.slice(3);
  return d.slice(0, 9);
}

/** Text shown in a prefixed input for the stored value (`+998` + up to 9 digits). */
export function uzPhoneInputValue(stored?: string | null): string {
  const s = (stored ?? '').trim();
  const canon = s ? canonicalUz(s) : null;
  if (canon) return canon;
  return UZ_PHONE_PREFIX + (s ? uzPhoneInputDigits(s) : '');
}

/** Typed text -> value for the form: prefix is forced, only 9 digits kept. */
export function uzPhoneFromInput(text: string): string {
  // Typing over the prefix (e.g. deleting "+998") must not eat user digits as a new prefix.
  if (UZ_PHONE_PREFIX.startsWith(text)) return UZ_PHONE_PREFIX; // backspace into the prefix
  const body = text.startsWith(UZ_PHONE_PREFIX) ? text.slice(UZ_PHONE_PREFIX.length) : text;
  return UZ_PHONE_PREFIX + uzPhoneInputDigits(body);
}

/** True when the input holds only the prefix (treated as "no phone"). */
export function isUzPhoneEmpty(v: string): boolean {
  return v.replace(/\D+/g, '') === '998' || v.trim() === '';
}
