import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { PHONE_DIRECTORY } from '@/api/urls';
import { phoneDirectoryQuery, directoryKeys } from '../queries';
import type { PhoneDirectoryEntry } from '@/types';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('directoryKeys', () => {
  it('keeps the stable prefix', () => {
    expect(directoryKeys.all).toEqual(['phone-directory']);
  });

  // Har ko'lam ALOHIDA keshlanishi shart — aks holda filial almashtirilganda
  // react-query eski ko'lamning ma'lumotini qaytarardi.
  it('gives each scope its own key', () => {
    expect(directoryKeys.scope(null)).toEqual(['phone-directory', 'all']);
    expect(directoryKeys.scope(14)).toEqual(['phone-directory', 14]);
    expect(directoryKeys.scope(1)).not.toEqual(directoryKeys.scope(2));
  });
});

describe('phoneDirectoryQuery', () => {
  it('fetches the directory and returns the array', async () => {
    const rows: PhoneDirectoryEntry[] = [
      { id: 1, legal_name: 'Ali Valiyev', internal_phone_number: '101' },
    ];
    mock.onGet(PHONE_DIRECTORY).reply(200, rows);
    const opts = phoneDirectoryQuery();
    expect(opts.queryKey).toEqual(directoryKeys.scope(null));
    const data = await (opts.queryFn as () => Promise<PhoneDirectoryEntry[]>)();
    expect(data).toHaveLength(1);
    expect(data[0].legal_name).toBe('Ali Valiyev');
  });

  it('unwraps an { items } envelope', async () => {
    mock.onGet(PHONE_DIRECTORY).reply(200, { items: [{ id: 1, legal_name: 'A' }] });
    expect(await (phoneDirectoryQuery().queryFn as () => Promise<PhoneDirectoryEntry[]>)()).toHaveLength(1);
  });

  it('defaults a null/non-array response to []', async () => {
    mock.onGet(PHONE_DIRECTORY).reply(200, null);
    expect(await (phoneDirectoryQuery().queryFn as () => Promise<PhoneDirectoryEntry[]>)()).toEqual([]);
  });

  // Ko'lam bo'yicha yuklash (audit 2026-09-07): butun tashkilot o'rniga faqat
  // kerakli filial so'raladi.
  it('sends branch_id when a branch is given', async () => {
    let sent: Record<string, unknown> | undefined;
    mock.onGet(PHONE_DIRECTORY).reply((cfg) => {
      sent = cfg.params as Record<string, unknown>;
      return [200, []];
    });
    await (phoneDirectoryQuery(14).queryFn as () => Promise<PhoneDirectoryEntry[]>)();
    expect(sent).toEqual({ branch_id: 14 });
  });

  // `null` = butun tashkilot; parametr UMUMAN yuborilmasligi kerak, chunki
  // `branch_id=null` backendda 422 beradi.
  it('omits branch_id for the whole organisation', async () => {
    let sent: Record<string, unknown> | undefined = { touched: true };
    mock.onGet(PHONE_DIRECTORY).reply((cfg) => {
      sent = cfg.params as Record<string, unknown> | undefined;
      return [200, []];
    });
    await (phoneDirectoryQuery(null).queryFn as () => Promise<PhoneDirectoryEntry[]>)();
    expect(sent).toBeUndefined();
  });
});
