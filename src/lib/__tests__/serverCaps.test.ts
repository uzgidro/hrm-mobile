import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { WEEKEND_TABEL } from '@/api/urls';
import { useAuthStore } from '@/store/authStore';
import { canAccessPage } from '@/utils/roles';
import { CATALOG, visibleCatalog } from '@/utils/moduleCatalog';
import type { User } from '@/types';
import { isNotFound, probeWeekendTabel, setWeekendTabelSupported, weekendTabelSupported } from '../serverCaps';
import { navSettingsQuery } from '../navSettings';

const multi = (role: string): User =>
  ({ id: 5, type: 'employee', employee: { id: 50, is_multi_org_user: true, multi_org_employee_role: role } }) as User;
const hr = multi('hr');
const deputy = multi('deputy');
const ministr = multi('ministr');
const master = { id: 1, type: 'master-admin' } as User;
const plain = { id: 9, type: 'employee', employee: { id: 90 } } as User;

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
  setWeekendTabelSupported(undefined);
});
afterEach(() => {
  mock.restore();
  setWeekendTabelSupported(undefined);
  useAuthStore.setState({ user: null, isAuthenticated: false } as never);
});

describe('probeWeekendTabel (OTA ships before the backend)', () => {
  it('404 = an old server without the module; 422 / 403 / 200 = the route exists', async () => {
    mock.onGet(WEEKEND_TABEL).replyOnce(404, { detail: 'Not Found' });
    expect(await probeWeekendTabel()).toBe(false);
    mock.onGet(WEEKEND_TABEL).replyOnce(422, { detail: [] });
    expect(await probeWeekendTabel()).toBe(true);
    mock.onGet(WEEKEND_TABEL).replyOnce(404, {});
    expect(await probeWeekendTabel()).toBe(false);
    mock.onGet(WEEKEND_TABEL).replyOnce(403, {});
    expect(await probeWeekendTabel()).toBe(true);
    mock.onGet(WEEKEND_TABEL).replyOnce(200, {});
    expect(await probeWeekendTabel()).toBe(true);
  });

  it('5xx, 401 and a dead network leave the previous answer alone (never flips the menu on a blip)', async () => {
    setWeekendTabelSupported(true);
    mock.onGet(WEEKEND_TABEL).replyOnce(500, {});
    expect(await probeWeekendTabel()).toBe(true);
    mock.onGet(WEEKEND_TABEL).replyOnce(401, {});
    expect(await probeWeekendTabel()).toBe(true);
    mock.onGet(WEEKEND_TABEL).networkErrorOnce();
    expect(await probeWeekendTabel()).toBe(true);
    setWeekendTabelSupported(undefined);
    mock.onGet(WEEKEND_TABEL).networkErrorOnce();
    expect(await probeWeekendTabel()).toBeUndefined();
  });

  it('isNotFound only matches a 404 response', () => {
    expect(isNotFound({ response: { status: 404 } })).toBe(true);
    expect(isNotFound({ response: { status: 500 } })).toBe(false);
    expect(isNotFound(new Error('x'))).toBe(false);
    expect(isNotFound(null)).toBe(false);
  });
});

describe('module gate', () => {
  it('stays hidden until the server is proven to have it, then follows the web audience (ADMIN_HR_LEAD)', () => {
    for (const u of [hr, deputy, ministr, master]) expect(canAccessPage(u, 'weekendTabel')).toBe(false);
    setWeekendTabelSupported(false);
    expect(canAccessPage(hr, 'weekendTabel')).toBe(false);
    setWeekendTabelSupported(true);
    for (const u of [hr, deputy, ministr, master]) expect(canAccessPage(u, 'weekendTabel')).toBe(true);
    expect(canAccessPage(plain, 'weekendTabel')).toBe(false);
    expect(canAccessPage({ id: 3, type: 'admin' } as User, 'weekendTabel')).toBe(false);
  });

  it('is in the catalogue under the web module key, route /dam-olish-tabeli, and appears in the menu only when supported', () => {
    const entry = CATALOG.find((e) => e.page === 'weekendTabel');
    expect(entry).toMatchObject({ moduleKey: 'weekendTabel', route: '/dam-olish-tabeli', section: 'stats' });
    expect(visibleCatalog(hr).some((e) => e.page === 'weekendTabel')).toBe(false);
    setWeekendTabelSupported(true);
    expect(visibleCatalog(hr).some((e) => e.page === 'weekendTabel')).toBe(true);
    expect(weekendTabelSupported()).toBe(true);
  });
});

describe('navSettingsQuery carries the probe', () => {
  const run = () => (navSettingsQuery().queryFn as () => Promise<unknown>)();

  it('HR-ish users probe once per settings fetch; an old server hides the module', async () => {
    useAuthStore.setState({ user: hr, isAuthenticated: true } as never);
    mock.onGet('system-settings').reply(200, { values: {} });
    mock.onGet(WEEKEND_TABEL).reply(404, {});
    await run();
    expect(mock.history.get.filter((r) => r.url === WEEKEND_TABEL)).toHaveLength(1);
    expect(canAccessPage(hr, 'weekendTabel')).toBe(false);
    mock.onGet(WEEKEND_TABEL).reply(422, {});
    await run();
    expect(canAccessPage(hr, 'weekendTabel')).toBe(true);
  });

  it('other users never probe (they would only get a 403)', async () => {
    useAuthStore.setState({ user: plain, isAuthenticated: true } as never);
    mock.onGet('system-settings').reply(200, { values: {} });
    await run();
    expect(mock.history.get.filter((r) => r.url === WEEKEND_TABEL)).toHaveLength(0);
  });
});
