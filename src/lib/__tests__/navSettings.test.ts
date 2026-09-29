import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { canAccessPage, setNavOverrides } from '@/utils/roles';
import type { User } from '@/types';
import { navSettingsQuery, readNavOverrides } from '../navSettings';

let mock: MockAdapter;
beforeEach(() => { mock = new MockAdapter(apiClient); });
afterEach(() => { mock.restore(); setNavOverrides(undefined); });

const employee: User = { id: 1, type: 'employee', employee: { id: 1, legal_name: 'X' } as User['employee'] };

describe('readNavOverrides', () => {
  it('picks nav.modules out of the settings payload, ignoring junk', () => {
    expect(readNavOverrides({ values: { 'nav.modules': { news: { enabled: false } } } })).toEqual({ news: { enabled: false } });
    expect(readNavOverrides({ values: { 'nav.modules': [] } })).toBeUndefined();
    expect(readNavOverrides({ values: {} })).toBeUndefined();
    expect(readNavOverrides(undefined)).toBeUndefined();
  });
});

describe('navSettingsQuery', () => {
  it('stores the matrix so canAccessPage follows the master admin (web v2)', async () => {
    mock.onGet('system-settings').reply(200, { values: { 'nav.modules': { news: { enabled: false } } }, schema: [] });
    expect(canAccessPage(employee, 'news')).toBe(true);
    await (navSettingsQuery().queryFn as () => Promise<unknown>)();
    expect(canAccessPage(employee, 'news')).toBe(false);
  });
});
