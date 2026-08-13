// Test suite for OTA update service wrapper. expo-updates is native — fully
// mocked here. Each test sets the mock's return values, then drives the wrapper
// and asserts on reloadAsync / the info read.
import { applyPendingUpdateOnLaunch, getRunningOtaInfo } from '../otaUpdates';

const mockCheck = jest.fn();
const mockFetch = jest.fn();
const mockReload = jest.fn();

jest.mock('expo-updates', () => ({
  get isEnabled() { return true; },
  get isEmbeddedLaunch() { return (global as any).__embedded ?? false; },
  get updateId() { return (global as any).__updateId ?? null; },
  get createdAt() { return (global as any).__createdAt ?? null; },
  checkForUpdateAsync: (...a: unknown[]) => mockCheck(...a),
  fetchUpdateAsync: (...a: unknown[]) => mockFetch(...a),
  reloadAsync: (...a: unknown[]) => mockReload(...a),
}));

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));

// Ensure __DEV__ is false (production mode) for OTA gate checks
(global as any).__DEV__ = false;

describe('getRunningOtaInfo', () => {
  afterEach(() => {
    delete (global as any).__embedded;
    delete (global as any).__updateId;
    delete (global as any).__createdAt;
  });

  it('returns embedded when launched from the embedded bundle', () => {
    (global as any).__embedded = true;
    expect(getRunningOtaInfo().kind).toBe('embedded');
  });

  it('returns ota with short id + date when launched from an OTA bundle', () => {
    (global as any).__embedded = false;
    (global as any).__updateId = 'deadbeef-1111-2222-3333-444455556666';
    (global as any).__createdAt = new Date('2026-08-13T00:00:00Z');
    const info = getRunningOtaInfo();
    expect(info.kind).toBe('ota');
    expect(info.shortId).toBe('deadbeef');
    expect(info.date).toBe('13.08.2026');
  });
});

describe('applyPendingUpdateOnLaunch', () => {
  beforeEach(() => {
    mockCheck.mockReset();
    mockFetch.mockReset();
    mockReload.mockReset();
    mockReload.mockResolvedValue(undefined);
  });

  it('reloads when an update is available and fetched-new', async () => {
    mockCheck.mockResolvedValue({ isAvailable: true });
    mockFetch.mockResolvedValue({ isNew: true });
    await applyPendingUpdateOnLaunch();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it('does not fetch or reload when no update is available', async () => {
    mockCheck.mockResolvedValue({ isAvailable: false });
    await applyPendingUpdateOnLaunch();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockReload).not.toHaveBeenCalled();
  });

  it('does not reload when the fetch reports nothing new (rollback-to-embedded)', async () => {
    mockCheck.mockResolvedValue({ isAvailable: true });
    mockFetch.mockResolvedValue({ isNew: false });
    await applyPendingUpdateOnLaunch();
    expect(mockReload).not.toHaveBeenCalled();
  });

  it('swallows a check error and does not reload', async () => {
    mockCheck.mockRejectedValue(new Error('network'));
    await expect(applyPendingUpdateOnLaunch()).resolves.toBeUndefined();
    expect(mockReload).not.toHaveBeenCalled();
  });
});
