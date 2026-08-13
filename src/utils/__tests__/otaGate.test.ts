import { shouldRunOtaGate, withTimeout, OTA_GATE_TIMEOUT_MS } from '../otaGate';

describe('shouldRunOtaGate', () => {
  it('runs when OTA is enabled on a native platform in a production build', () => {
    expect(shouldRunOtaGate({ isEnabled: true, platformOS: 'android', isDev: false })).toBe(true);
    expect(shouldRunOtaGate({ isEnabled: true, platformOS: 'ios', isDev: false })).toBe(true);
  });
  it('never runs on web', () => {
    expect(shouldRunOtaGate({ isEnabled: true, platformOS: 'web', isDev: false })).toBe(false);
  });
  it('never runs in a dev build (OTA disabled in dev-client)', () => {
    expect(shouldRunOtaGate({ isEnabled: true, platformOS: 'android', isDev: true })).toBe(false);
  });
  it('never runs when expo-updates reports disabled', () => {
    expect(shouldRunOtaGate({ isEnabled: false, platformOS: 'android', isDev: false })).toBe(false);
  });
});

describe('withTimeout', () => {
  it('resolves to the promise value when it wins the race', async () => {
    const out = await withTimeout(Promise.resolve('done'), 50, 'fallback');
    expect(out).toBe('done');
  });
  it('resolves to the fallback when the timeout wins', async () => {
    const slow = new Promise<string>((r) => setTimeout(() => r('late'), 1000));
    const out = await withTimeout(slow, 10, 'fallback');
    expect(out).toBe('fallback');
  });
  it('resolves to the fallback when the inner promise rejects', async () => {
    const out = await withTimeout(Promise.reject(new Error('boom')), 50, 'fallback');
    expect(out).toBe('fallback');
  });
  it('exports a 10s default timeout', () => {
    expect(OTA_GATE_TIMEOUT_MS).toBe(10000);
  });
});
