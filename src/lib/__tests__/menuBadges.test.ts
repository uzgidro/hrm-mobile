import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { MENU_BADGES } from '@/api/urls';
import { useAuthStore } from '@/store/authStore';
import { EMPTY_BADGES, menuBadgesQuery, type MenuBadges } from '../menuBadges';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => {
  mock.restore();
  useAuthStore.setState({ user: null, isAuthenticated: false } as never);
});

const setUser = (type: string) =>
  useAuthStore.setState({ user: { id: 1, type } as never, isAuthenticated: true } as never);

// Server mehmonga `notifications/menu-badges` ni yopadi (403 guest_forbidden, `_GUEST_ALLOWED_EXACT`):
// 60 s polling real QA'da 148 ta konsol xatosini bergan.
describe('menuBadgesQuery — mehmon', () => {
  it("mehmon: so'rov yo'q, bo'sh raqamlar, polling yo'q, javob darrov eskiradi", async () => {
    setUser('guest');
    const q = menuBadgesQuery();
    const data = await (q.queryFn as () => Promise<MenuBadges>)();
    expect(mock.history.get).toEqual([]);
    expect(data).toEqual(EMPTY_BADGES);
    const interval = q.refetchInterval as (query: unknown) => number | false;
    expect(interval({})).toBe(false);
    const stale = q.staleTime as (query: { state: { data: unknown } }) => number;
    expect(stale({ state: { data } })).toBe(0);
  });

  it("xodim: so'raladi va har 60 s yangilanadi", async () => {
    setUser('employee');
    mock.onGet(MENU_BADGES).reply(200, { letters: 2 });
    const q = menuBadgesQuery();
    expect(await (q.queryFn as () => Promise<MenuBadges>)()).toMatchObject({ letters: 2, orders: 0 });
    expect((q.refetchInterval as (query: unknown) => number | false)({})).toBe(60_000);
    const stale = q.staleTime as (query: { state: { data: unknown } }) => number;
    expect(stale({ state: { data: { ...EMPTY_BADGES, letters: 2 } } })).toBe(60_000);
  });
});
