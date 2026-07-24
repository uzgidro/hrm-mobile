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
  it('is a stable single key', () => {
    expect(directoryKeys.all).toEqual(['phone-directory']);
  });
});

describe('phoneDirectoryQuery', () => {
  it('fetches the directory and returns the array', async () => {
    const rows: PhoneDirectoryEntry[] = [
      { id: 1, legal_name: 'Ali Valiyev', internal_phone_number: '101' },
    ];
    mock.onGet(PHONE_DIRECTORY).reply(200, rows);
    const opts = phoneDirectoryQuery();
    expect(opts.queryKey).toEqual(directoryKeys.all);
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
});
