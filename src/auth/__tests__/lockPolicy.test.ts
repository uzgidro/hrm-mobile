import {
  PIN_LENGTH,
  MAX_ATTEMPTS,
  RELOCK_AFTER_MS,
  shouldRelock,
  attemptsRemaining,
  isValidPin,
} from '../lockPolicy';

describe('lock policy constants', () => {
  it('pins the policy numbers the rest of the feature relies on', () => {
    expect(PIN_LENGTH).toBe(4);
    expect(MAX_ATTEMPTS).toBe(5);
    expect(RELOCK_AFTER_MS).toBe(60_000);
  });
});

describe('shouldRelock', () => {
  const NOW = 1_700_000_000_000;

  it('never relocks when the app was not backgrounded (null)', () => {
    expect(shouldRelock(null, NOW)).toBe(false);
  });

  it('does not relock just under the threshold (59 999 ms elapsed)', () => {
    expect(shouldRelock(NOW - 59_999, NOW)).toBe(false);
  });

  it('relocks at exactly the threshold (60 000 ms elapsed)', () => {
    expect(shouldRelock(NOW - RELOCK_AFTER_MS, NOW)).toBe(true);
  });

  it('relocks past the threshold (60 001 ms elapsed)', () => {
    expect(shouldRelock(NOW - 60_001, NOW)).toBe(true);
  });

  it('does not relock when no time has elapsed', () => {
    expect(shouldRelock(NOW, NOW)).toBe(false);
  });
});

describe('attemptsRemaining', () => {
  it('gives the full allowance with no failed attempts', () => {
    expect(attemptsRemaining(0)).toBe(5);
  });

  it('counts down as attempts fail', () => {
    expect(attemptsRemaining(3)).toBe(2);
  });

  it('reaches zero at the max', () => {
    expect(attemptsRemaining(5)).toBe(0);
  });

  it('clamps at zero when failures exceed the max', () => {
    expect(attemptsRemaining(7)).toBe(0);
  });

  it('treats a non-finite count (corrupt storage → NaN) as no failures', () => {
    expect(attemptsRemaining(Number.NaN)).toBe(5);
  });
});

describe('isValidPin', () => {
  it('accepts exactly four digits', () => {
    expect(isValidPin('1234')).toBe(true);
  });

  it('rejects a too-short pin', () => {
    expect(isValidPin('123')).toBe(false);
  });

  it('rejects a too-long pin', () => {
    expect(isValidPin('12345')).toBe(false);
  });

  it('rejects non-digit characters', () => {
    expect(isValidPin('12a4')).toBe(false);
  });

  it('rejects the empty string', () => {
    expect(isValidPin('')).toBe(false);
  });
});
