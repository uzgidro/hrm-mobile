import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { NOTIFICATIONS_LIST } from '@/api/urls';
import { notificationKeys, notificationsListQuery } from '../queries';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('notificationKeys', () => {
  it('builds a hierarchical key tree so `all` is a prefix of list', () => {
    expect(notificationKeys.all).toEqual(['notifications']);
    expect(notificationKeys.list(5)).toEqual(['notifications', 'list', 5]);
    expect(notificationKeys.list()).toEqual(['notifications', 'list', null]);
    // all is a prefix of list → invalidating it matches the list
    expect(notificationKeys.list(5).slice(0, 1)).toEqual(notificationKeys.all);
  });

  it('exposes `all` as the exact key the push service invalidates', () => {
    // app/_layout.tsx invalidates `['notifications']` on foreground receipt.
    expect(notificationKeys.all).toEqual(['notifications']);
  });
});

describe('notificationsListQuery', () => {
  it('carries the list key with the employee id and always revalidates on mount', () => {
    const opts = notificationsListQuery(7);
    expect(opts.queryKey).toEqual(['notifications', 'list', 7]);
    expect(opts.refetchOnMount).toBe('always');
  });

  it('uses null for an undefined employee id', () => {
    expect(notificationsListQuery().queryKey).toEqual(['notifications', 'list', null]);
  });

  it('returns a bare array response as-is', async () => {
    mock.onGet(NOTIFICATIONS_LIST).reply(200, [{ id: 1 }, { id: 2 }]);
    const opts = notificationsListQuery();
    const data = await (opts.queryFn as () => Promise<unknown[]>)();
    expect(data).toHaveLength(2);
  });

  it('unwraps an { items } envelope', async () => {
    mock.onGet(NOTIFICATIONS_LIST).reply(200, { items: [{ id: 1 }] });
    const data = await (notificationsListQuery().queryFn as () => Promise<unknown[]>)();
    expect(data).toEqual([{ id: 1 }]);
  });

  it('falls back to an empty array when the envelope has no items', async () => {
    mock.onGet(NOTIFICATIONS_LIST).reply(200, {});
    const data = await (notificationsListQuery().queryFn as () => Promise<unknown[]>)();
    expect(data).toEqual([]);
  });

  it('GETs the notifications list endpoint', async () => {
    mock.onGet(NOTIFICATIONS_LIST).reply(200, []);
    await (notificationsListQuery(3).queryFn as () => Promise<unknown[]>)();
    expect(mock.history.get[0].url).toBe(NOTIFICATIONS_LIST);
  });
});
