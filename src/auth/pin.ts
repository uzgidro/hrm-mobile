// App-lock PIN persistence + hashing. The PIN is never stored raw: we keep a
// { salt, hash } record where hash = SHA-256(salt + ':' + pin). Salted SHA-256
// (no KDF) is adequate here because the record lives in SecureStore (device
// keychain, not readable off-device) and the real brute-force control is the
// lock store's 5-failed-attempts force-logout — not hash hardness. That
// argument does NOT hold on web (storage falls back to localStorage), which is
// why the lock feature is native-only — lockStore short-circuits on web.
//
// All security-related storage keys live here so lockStore imports them from
// one place.
import * as Crypto from 'expo-crypto';
import { storage } from '../api/storage';
import { LEGACY_PIN_LENGTH } from './lockPolicy';

export const PIN_RECORD_KEY = 'security_pin_v1';
export const BIOMETRICS_KEY = 'security_biometrics';
export const FAILED_ATTEMPTS_KEY = 'security_failed_attempts';

interface PinRecord {
  salt: string;
  hash: string;
  /** PIN uzunligi. Maydonsiz (2026-10-09 gacha) yozuvlar — 4 raqamli. */
  len: number;
}

// 16 random bytes as a 32-char hex string.
export async function generateSalt(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, salt + ':' + pin);
}

export async function verifyPin(pin: string, record: Pick<PinRecord, 'salt' | 'hash'>): Promise<boolean> {
  return (await hashPin(pin, record.salt)) === record.hash;
}

// Corrupt / missing / malformed / unreadable record → null (caller treats it
// as "no PIN set"). SecureStore reads can reject — this must never throw: it
// runs on the startup path.
export async function readPinRecord(): Promise<PinRecord | null> {
  try {
    const raw = await storage.getItem(PIN_RECORD_KEY);
    if (!raw) return null;
    const record = JSON.parse(raw) as Partial<PinRecord>;
    if (typeof record.salt !== 'string' || typeof record.hash !== 'string') return null;
    const len = typeof record.len === 'number' && record.len > 0 ? record.len : LEGACY_PIN_LENGTH;
    return { salt: record.salt, hash: record.hash, len };
  } catch {
    return null;
  }
}

export async function writePinRecord(pin: string): Promise<void> {
  const salt = await generateSalt();
  const hash = await hashPin(pin, salt);
  await storage.setItem(PIN_RECORD_KEY, JSON.stringify({ salt, hash, len: pin.length }));
}

export async function clearPinRecord(): Promise<void> {
  await storage.deleteItem(PIN_RECORD_KEY);
}
