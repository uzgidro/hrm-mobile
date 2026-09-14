import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { PUSH_TOKENS_ME, PUSH_TOKENS_TEST } from '@/api/urls';
import { fetchMyPushTokens, sendTestPush } from '../api/pushDiagnostics';

// Push tekshiruvi so'rovlari: o'z qurilmalari ro'yxati va sinov yuborish.
describe('push diagnostics requests', () => {
  const mock = new MockAdapter(apiClient);
  afterEach(() => mock.reset());

  it('reads the registered devices for the caller', async () => {
    mock.onGet(PUSH_TOKENS_ME).reply(200, { count: 1, tokens: [{ platform: 'android', token_tail: 'abc123' }] });
    const r = await fetchMyPushTokens();
    expect(r.count).toBe(1);
    expect(r.tokens[0].token_tail).toBe('abc123');
  });

  it('normalises an empty / malformed body (smoke: bo\'sh API javobi)', async () => {
    mock.onGet(PUSH_TOKENS_ME).reply(200, []);
    await expect(fetchMyPushTokens()).resolves.toEqual({ count: 0, tokens: [] });
  });

  it('sends the self-test with an empty body and returns the device count', async () => {
    mock.onPost(PUSH_TOKENS_TEST).reply((cfg) => {
      expect(cfg.data).toBeUndefined();
      return [200, { ok: true, tokens: 2 }];
    });
    await expect(sendTestPush()).resolves.toEqual({ ok: true, tokens: 2 });
  });
});
