import { storage } from '../../api/storage';
import {
  PIN_RECORD_KEY,
  BIOMETRICS_KEY,
  FAILED_ATTEMPTS_KEY,
  generateSalt,
  hashPin,
  verifyPin,
  readPinRecord,
  writePinRecord,
  clearPinRecord,
} from '../pin';

beforeEach(async () => {
  await storage.deleteItem(PIN_RECORD_KEY);
});

// The lock store persists against these exact keys — changing one silently
// orphans existing users' records, so pin them like lockPolicy pins its numbers.
it('keeps the storage key contract stable', () => {
  expect(PIN_RECORD_KEY).toBe('security_pin_v1');
  expect(BIOMETRICS_KEY).toBe('security_biometrics');
  expect(FAILED_ATTEMPTS_KEY).toBe('security_failed_attempts');
});

describe('hashPin', () => {
  it('is deterministic for the same pin + salt', async () => {
    expect(await hashPin('1234', 'abcd')).toBe(await hashPin('1234', 'abcd'));
  });

  it('produces a different hash for a different salt', async () => {
    expect(await hashPin('1234', 'abcd')).not.toBe(await hashPin('1234', 'dcba'));
  });

  it('produces a different hash for a different pin', async () => {
    expect(await hashPin('1234', 'abcd')).not.toBe(await hashPin('4321', 'abcd'));
  });
});

describe('verifyPin', () => {
  it('accepts the correct pin', async () => {
    const salt = await generateSalt();
    const record = { salt, hash: await hashPin('1234', salt) };
    expect(await verifyPin('1234', record)).toBe(true);
  });

  it('rejects a wrong pin', async () => {
    const salt = await generateSalt();
    const record = { salt, hash: await hashPin('1234', salt) };
    expect(await verifyPin('0000', record)).toBe(false);
  });
});

describe('generateSalt', () => {
  it('returns a 32-char hex string (16 random bytes)', async () => {
    const salt = await generateSalt();
    expect(salt).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('PIN record persistence', () => {
  it('round-trips: write → read → verify', async () => {
    await writePinRecord('1234');
    const record = await readPinRecord();
    expect(record).not.toBeNull();
    expect(await verifyPin('1234', record!)).toBe(true);
    expect(await verifyPin('0000', record!)).toBe(false);
  });

  it('clearPinRecord removes the record', async () => {
    await writePinRecord('1234');
    await clearPinRecord();
    expect(await readPinRecord()).toBeNull();
  });
});

describe('readPinRecord robustness', () => {
  it('returns null when no record is stored', async () => {
    expect(await readPinRecord()).toBeNull();
  });

  it('returns null (not throw) on corrupt JSON in storage', async () => {
    await storage.setItem(PIN_RECORD_KEY, '{not json');
    expect(await readPinRecord()).toBeNull();
  });

  it('returns null on a JSON record missing the hash field', async () => {
    await storage.setItem(PIN_RECORD_KEY, JSON.stringify({ salt: 'abcd' }));
    expect(await readPinRecord()).toBeNull();
  });

  it('returns null on a JSON record missing the salt field', async () => {
    await storage.setItem(PIN_RECORD_KEY, JSON.stringify({ hash: 'abcd' }));
    expect(await readPinRecord()).toBeNull();
  });

  it('returns null (not throw) when the storage read itself rejects', async () => {
    const SecureStore = require('expo-secure-store');
    jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('keychain error'));
    expect(await readPinRecord()).toBeNull();
  });
});
