// The media viewer receives its URL as a route param. expo-router decodes a
// param value once on the way to the screen, so a URL that carries its own
// %-escapes (a MinIO presigned video link: `public%2C%20max-age…`,
// `X-Amz-Credential=…%2F…`) arrived altered — real spaces appeared, the
// signature no longer matched and `isTrustedAppUrl` refused the URL, so every
// video guide showed "Yuklab bo'lmadi" (2026-11-14).
//
// The URL is therefore wrapped once more on push and unwrapped on read. The
// marker keeps this correct whichever way the router behaves, and a plain
// https URL (a deep link `hrm://media?url=…`) still passes through unchanged.
const MARK = 'u:';

export function encodeMediaUrl(url: string): string {
  return MARK + encodeURIComponent(url);
}

export function decodeMediaUrl(raw?: string | string[]): string {
  const value = (Array.isArray(raw) ? raw[0] : raw) ?? '';
  if (!value.startsWith(MARK)) return value;
  const body = value.slice(MARK.length);
  // Still wrapped (the router left it as is) → unwrap; already unwrapped → keep.
  if (/^https?%3A/i.test(body)) {
    try {
      return decodeURIComponent(body);
    } catch {
      return '';
    }
  }
  return body;
}
