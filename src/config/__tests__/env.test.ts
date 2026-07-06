import { Env } from '../env';

// Characterization tests for the env module's observable contract.
// Env is frozen at import time from the current process.env, so we assert the
// resulting values rather than trying to mutate process.env after load.
// In the test environment no EXPO_PUBLIC_* overrides are set, so these are the
// production defaults.

const HTTPS_URL = /^https:\/\/.+/;

describe('Env config', () => {
  it('is a frozen object', () => {
    expect(Object.isFrozen(Env)).toBe(true);
  });

  it('exposes apiUrl as a non-empty https URL with no trailing slash', () => {
    expect(typeof Env.apiUrl).toBe('string');
    expect(Env.apiUrl.length).toBeGreaterThan(0);
    expect(Env.apiUrl).toMatch(HTTPS_URL);
    expect(Env.apiUrl.endsWith('/')).toBe(false);
  });

  it('exposes onlyOfficeUrl as a non-empty https URL with no trailing slash', () => {
    expect(typeof Env.onlyOfficeUrl).toBe('string');
    expect(Env.onlyOfficeUrl.length).toBeGreaterThan(0);
    expect(Env.onlyOfficeUrl).toMatch(HTTPS_URL);
    expect(Env.onlyOfficeUrl.endsWith('/')).toBe(false);
  });

  it('equals the production defaults when no EXPO_PUBLIC_* override is set', () => {
    expect(Env.apiUrl).toBe('https://hr-api.uzgidro.uz');
    expect(Env.onlyOfficeUrl).toBe('https://doc-editor.uzgidro.uz');
  });
});
