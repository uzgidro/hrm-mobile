// Tiny base64 encoder for binary API responses (works on Hermes and web alike).
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = i + 1 < bytes.length ? bytes[i + 1]! : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2]! : 0;
    out += CHARS[a >> 2]! + CHARS[((a & 3) << 4) | (b >> 4)]!;
    out += i + 1 < bytes.length ? CHARS[((b & 15) << 2) | (c >> 6)]! : '=';
    out += i + 2 < bytes.length ? CHARS[c & 63]! : '=';
  }
  return out;
}
