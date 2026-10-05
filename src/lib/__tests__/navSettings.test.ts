import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { canAccessPage, setNavOverrides } from '@/utils/roles';
import type { User } from '@/types';
import { useAuthStore } from '@/store/authStore';
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

describe('navSettingsQuery — mehmon', () => {
  // Server mehmonga `system-settings` ni yopadi (403 guest_forbidden) — har ochilishda xato yog'ilardi.
  afterEach(() => useAuthStore.setState({ user: null, isAuthenticated: false } as never));

  it("mehmon uchun so'rov yubormaydi, standartlar qoladi; javob darrov eskiradi (keyingi hisob o'zinikini oladi)", async () => {
    useAuthStore.setState({ user: { id: 9, type: 'guest' } as never, isAuthenticated: true } as never);
    const q = navSettingsQuery();
    const data = await (q.queryFn as () => Promise<unknown>)();
    expect(mock.history.get).toEqual([]);
    expect(readNavOverrides(data as never)).toBeUndefined();
    const stale = q.staleTime as (query: { state: { data: unknown } }) => number;
    expect(stale({ state: { data } })).toBe(0);
    expect(stale({ state: { data: { values: {} } } })).toBe(10 * 60_000);
  });
});
