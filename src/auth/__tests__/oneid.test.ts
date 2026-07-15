import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../../api/client';
import { __resetAccessTokenCache } from '../../api/authToken';
import { SSO_EXCHANGE, USER_INFO } from '../../api/urls';
import { loginWithOneId, OneIdError } from '../oneid';

// Mock the native browser + deep-link parsing. openAuthSessionAsync's resolved
// value drives the flow (we deliberately don't use a Linking listener).
const mockOpenAuthSession = jest.fn();
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: (...args: unknown[]) => mockOpenAuthSession(...args),
}));
jest.mock('expo-linking', () => ({
  // Minimal query-string parser matching expo-linking's { queryParams } shape.
  parse: (url: string) => {
    const q = url.split('?')[1] ?? '';
    const queryParams: Record<string, string> = {};
    for (const pair of q.split('&')) {
      if (!pair) continue;
      const [k, v] = pair.split('=');
      queryParams[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
    }
    return { queryParams };
  },
}));

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(apiClient);
  __resetAccessTokenCache();
  mockOpenAuthSession.mockReset();
});
afterEach(() => mock.restore());

const USER = { id: 7, type: 'employee', legal_name: 'Ali' };

describe('loginWithOneId', () => {
  it('exchanges the one-time code and returns tokens + user on success', async () => {
    mockOpenAuthSession.mockResolvedValue({ type: 'success', url: 'hrm://auth/oneid?otc=CODE123' });
    mock.onPost(SSO_EXCHANGE).reply(200, { access_token: 'acc', refresh_token: 'ref' });
    mock.onGet(USER_INFO).reply(200, USER);

    const res = await loginWithOneId();

    expect(res).toEqual({ access_token: 'acc', refresh_token: 'ref', user: USER });
    // The exchange was called with the code parsed from the deep link.
    const exchangeCall = mock.history.post.find((c) => c.url === SSO_EXCHANGE);
    expect(JSON.parse(exchangeCall!.data)).toEqual({ otc: 'CODE123' });
    // auth/me fetched with an explicit Bearer (token not cached yet).
    const meCall = mock.history.get.find((c) => c.url === USER_INFO);
    expect(meCall!.headers?.Authorization).toBe('Bearer acc');
  });

  it('opens the backend /sso/login with flow=mobile and the deep-link redirect', async () => {
    mockOpenAuthSession.mockResolvedValue({ type: 'cancel' });
    await loginWithOneId();
    const [authUrl, returnUrl] = mockOpenAuthSession.mock.calls[0];
    expect(authUrl).toContain('/sso/login?flow=mobile');
    expect(authUrl).toContain(encodeURIComponent('hrm://auth/oneid'));
    expect(returnUrl).toBe('hrm://auth/oneid');
  });

  it('returns null when the user cancels the browser', async () => {
    mockOpenAuthSession.mockResolvedValue({ type: 'cancel' });
    expect(await loginWithOneId()).toBeNull();
  });

  it('returns null when the browser is dismissed', async () => {
    mockOpenAuthSession.mockResolvedValue({ type: 'dismiss' });
    expect(await loginWithOneId()).toBeNull();
  });

  it('throws OneIdError when the deep link carries an error', async () => {
    mockOpenAuthSession.mockResolvedValue({
      type: 'success',
      url: 'hrm://auth/oneid?error=employee_not_found',
    });
    await expect(loginWithOneId()).rejects.toBeInstanceOf(OneIdError);
  });

  it('throws OneIdError when success carries no code', async () => {
    mockOpenAuthSession.mockResolvedValue({ type: 'success', url: 'hrm://auth/oneid' });
    await expect(loginWithOneId()).rejects.toBeInstanceOf(OneIdError);
  });

  it('propagates a failed exchange (e.g. expired code → 401)', async () => {
    mockOpenAuthSession.mockResolvedValue({ type: 'success', url: 'hrm://auth/oneid?otc=STALE' });
    mock.onPost(SSO_EXCHANGE).reply(401, { code: 'invalid_or_expired_code' });
    await expect(loginWithOneId()).rejects.toBeTruthy();
  });
});
