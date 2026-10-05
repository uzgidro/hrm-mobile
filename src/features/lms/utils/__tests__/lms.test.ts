import { buildLmsBody, logCounts, providerOptions, seedLmsForm, syncOutcome, syncStatusTone } from '../lms';

describe('lms utils (v2 LmsPage)', () => {
  it("forma serverdan to'ladi, kalit maydoni har doim bo'sh", () => {
    expect(
      seedLmsForm({ provider: 'moodle', base_url: 'https://ailm.uz', has_api_key: true, is_enabled: true }),
    ).toEqual({ provider: 'moodle', baseUrl: 'https://ailm.uz', apiKey: '', enabled: true, autoSync: false });
    expect(seedLmsForm(null).provider).toBe('generic');
  });

  it("bo'sh kalit yuborilmaydi (eskisi qoladi), kiritilgani qirqib yuboriladi", () => {
    const base = { provider: 'generic', baseUrl: ' https://x.uz ', apiKey: '  ', enabled: true, autoSync: true };
    expect(buildLmsBody(base)).toEqual({
      provider: 'generic',
      base_url: 'https://x.uz',
      is_enabled: true,
      auto_sync: true,
    });
    expect(buildLmsBody({ ...base, apiKey: ' k3y ' })).toMatchObject({ api_key: 'k3y' });
  });

  it('platformalar, holat rangi, sinxron natijasi', () => {
    expect(providerOptions({ providers: ['generic', 'moodle'] })).toEqual(['generic', 'moodle']);
    expect(providerOptions({})).toEqual(['generic']);
    expect(syncStatusTone('ok')).toBe('success');
    expect(syncStatusTone('error')).toBe('danger');
    expect(syncOutcome({ status: 'ok', created: 2 })).toEqual({ ok: true, created: 2, updated: 0 });
    expect(syncOutcome({ status: 'error', message: 'Timeout' })).toEqual({ ok: false, message: 'Timeout' });
    expect(logCounts({ id: 1, created: 3 })).toBe('+3 / ~0');
  });
});
