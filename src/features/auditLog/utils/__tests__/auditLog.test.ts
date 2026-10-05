import {
  EMPTY_AUDIT_FILTERS,
  FILTER_ACTIONS,
  actionMeta,
  auditParams,
  categoryTiles,
  describeDetails,
  foldedCount,
  isRangeInvalid,
  isSensitiveKey,
  maskSecrets,
  onlinePeaks,
  shortAgent,
  valueText,
} from '../auditLog';

const F = EMPTY_AUDIT_FILTERS;

describe('auditLog utils (v2 AuditLogPage)', () => {
  it("parametrlar: bo'shlari yuborilmaydi; noma'lum resurs va «Xatoliklar»siz status tashlanadi", () => {
    expect(auditParams(F, '  ')).toEqual({});
    expect(
      auditParams(
        {
          ...F,
          userId: 42,
          category: 'errors',
          status: '5xx',
          action: 'ERROR',
          resource: 'letter',
          branchId: 3,
          from: '2026-10-01',
          to: '2026-10-05',
        },
        ' Ali ',
      ),
    ).toEqual({
      user_id: 42,
      category: 'errors',
      status_group: '5xx',
      action: 'ERROR',
      resource_type: 'letter',
      organization_branch_id: 3,
      date_from: '2026-10-01',
      date_to: '2026-10-05',
      search: 'Ali',
    });
    expect(auditParams({ ...F, category: 'changes', status: '4xx', resource: 'hack' }, '')).toEqual({
      category: 'changes',
    });
    // Statistika toifa filtrisiz.
    expect(auditParams({ ...F, category: 'access' }, '', false)).toEqual({});
  });

  it("oraliq, filtr soni, amal yorlig'i, filtrlanadigan amallar faqat katta harfli", () => {
    expect(isRangeInvalid({ from: '2026-10-05', to: '2026-10-01' })).toBe(true);
    expect(isRangeInvalid({ from: '2026-10-01', to: '' })).toBe(false);
    expect(foldedCount({ ...F, userId: 1, from: '2026-10-01' })).toBe(2);
    expect(actionMeta('DELETE')).toEqual({ labelKey: 'actionDelete', tone: 'danger' });
    expect(actionMeta('SOMETHING')).toEqual({ labelKey: null, tone: 'neutral' });
    expect(FILTER_ACTIONS).toContain('PAGE_VIEW');
    expect(FILTER_ACTIONS).not.toContain('backup_created');
  });

  it("toifa plitkalari va onlayn cho'qqilar", () => {
    expect(categoryTiles({ access: 3, changes: 10, errors: 0 })).toEqual([
      ['changes', 10],
      ['access', 3],
    ]);
    expect(
      onlinePeaks([
        { day: '2026-10-04', peak_count: 40 },
        { day: '2026-10-05', peak_count: 12 },
      ]),
    ).toEqual({ today: 12, record: 40 });
    expect(onlinePeaks([])).toEqual({ today: 0, record: 0 });
  });

  it('qurilma: brauzer · OS, mobil ilova', () => {
    expect(shortAgent('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/128.0 Safari/537.36', 'App')).toBe(
      'Chrome 128 · Windows',
    );
    expect(shortAgent('okhttp/4.12.0 Android', 'Mobil ilova')).toBe('Mobil ilova · Android');
    expect(shortAgent(null, 'App')).toBe('—');
  });

  it("tafsilot: target nusxasi bilan eski → yangi, qolgani kalit: qiymat; o'chirishda nom", () => {
    const d = describeDetails({
      status: 'approved',
      description: 'Yangi izoh',
      type: 'vacation',
      target: { id: '7', label: 'vacation', type: 'vacation', status: 'pending', description: 'Eski izoh' },
    });
    expect(d.changes).toEqual([
      { key: 'status', from: 'pending', to: 'approved' },
      { key: 'description', from: 'Eski izoh', to: 'Yangi izoh' },
    ]);
    expect(d.fields).toEqual([{ key: 'type', value: 'vacation' }]);
    expect(d.snapshot).toEqual({ kind: 'target', label: 'vacation' });
    expect(d.raw).toContain('"target"');

    const del = describeDetails({ deleted: { id: '5', label: 'Ali Valiyev', legal_name: 'Ali Valiyev' } });
    expect(del.changes).toEqual([]);
    expect(del.fields).toEqual([]);
    expect(del.snapshot).toEqual({ kind: 'deleted', label: 'Ali Valiyev' });
  });

  it("tafsilot: tana yo'q — raw null; massiv tana — faqat raw; maskalangan qiymat o'zicha", () => {
    expect(describeDetails(null)).toEqual({ changes: [], fields: [], snapshot: null, raw: null });
    expect(describeDetails({}).raw).toBeNull();
    const arr = describeDetails([1, 2]);
    expect(arr.fields).toEqual([]);
    expect(arr.raw).toContain('1');
    expect(describeDetails({ password: '***', nested: { a: 1 } }).fields).toEqual([
      { key: 'password', value: '***' },
      { key: 'nested', value: '{"a":1}' },
    ]);
    expect(valueText('x'.repeat(250))).toHaveLength(201);
    expect(valueText(null)).toBe('—');
  });
  describe('maxfiy qiymatlarni maskalash (server api_key ni maskalamaydi)', () => {
    const M = '••••••';

    it("kalit nomi: snake/camel/katta harf; parol/token/sir/api kalit/JShShIR — oxiridagi bo'lak bo'yicha", () => {
      for (const k of [
        'password',
        'new_password',
        'newPassword',
        'PASSWORD',
        'pass',
        'access_token',
        'refreshToken',
        'token',
        'client_secret',
        'secret_key',
        'api_key',
        'apiKey',
        'API_KEY',
        'apikey',
        'api-key',
        'hik_api_key',
        'private_key',
        'privateKey',
        'pinfl',
        'PINFL',
      ]) {
        expect([k, isSensitiveKey(k)]).toEqual([k, true]);
      }
      for (const k of ['token_count', 'passport_number', 'pasport_series', 'bypass', 'keyboard', 'status', 'tokens_used']) {
        expect([k, isSensitiveKey(k)]).toEqual([k, false]);
      }
    });

    it("istalgan chuqurlikda, massivlarda; faqat satr/son — null, bo'sh satr, mantiqiy qiymat va server *** o'zicha", () => {
      expect(
        maskSecrets({
          provider: 'moodle',
          api_key: 'sk-live-123',
          has_api_key: true,
          token_count: 42,
          config: { nested: { apiKey: 'abc', url: 'https://x.uz' } },
          accounts: [{ login: 'kpp1', password: 'Qwerty123' }, { login: 'kpp2', password: null }],
          pinfl: 12345678901234,
          secret: '',
          token: '***',
          include_pinfl: false,
        }),
      ).toEqual({
        provider: 'moodle',
        api_key: M,
        has_api_key: true,
        token_count: 42,
        config: { nested: { apiKey: M, url: 'https://x.uz' } },
        accounts: [{ login: 'kpp1', password: M }, { login: 'kpp2', password: null }],
        pinfl: M,
        secret: '',
        token: '***',
        include_pinfl: false,
      });
      // Maxfiy kalit ostidagi obyekt — ichidagi barcha satr/sonlar.
      expect(maskSecrets({ token: { value: 'x', ttl: 60, ok: true } })).toEqual({ token: { value: M, ttl: M, ok: true } });
      // Xom (form-urlencoded) matndagi juftliklar.
      expect(maskSecrets({ _raw: 'username=ali&api_key=sk-1&password=p w' })).toEqual({
        _raw: `username=ali&api_key=${M}&password=${M} w`,
      });
      expect(maskSecrets('a=1&apiKey=zzz')).toBe(`a=1&apiKey=${M}`);
    });

    it("tafsilot: maydonlar, o'zgarish qatori va to'liq tana maskalanadi; kalit almashgani ko'rinadi", () => {
      const d = describeDetails({
        provider: 'generic',
        api_key: 'sk-NEW-secret',
        meta: { password: 'p@ss' },
        target: { id: '1', label: 'LMS', provider: 'moodle', api_key: 'sk-OLD-secret' },
      });
      expect(d.changes).toEqual([
        { key: 'provider', from: 'moodle', to: 'generic' },
        { key: 'api_key', from: M, to: M },
      ]);
      expect(d.fields).toEqual([{ key: 'meta', value: `{"password":"${M}"}` }]);
      expect(d.raw).not.toMatch(/sk-NEW|sk-OLD|p@ss/);
      expect(d.raw).toContain(M);
      // _body konverti ham.
      const b = describeDetails({ _body: { api_key: 'sk-1' } });
      expect(b.fields).toEqual([{ key: 'api_key', value: M }]);
      expect(b.raw).not.toContain('sk-1');
    });
  });
});
