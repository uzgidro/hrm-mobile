import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { EMPLOYEES_BIRTHDAYS } from '@/api/urls';
import { birthdayKeys, birthdaysListQuery } from '../queries';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('birthdayKeys', () => {
  it('builds a hierarchical key tree so `all` is a prefix of the list', () => {
    expect(birthdayKeys.all).toEqual(['birthdays']);
    // NOTE: the home-tab prefetch (app/(tabs)/index.tsx) inlines this exact
    // shape so the Team screen's birthday card reads the warmed entry. If this
    // shape changes, update that prefetch key too.
    expect(birthdayKeys.list(5)).toEqual(['birthdays', 'list', 5]);
    expect(birthdayKeys.list()).toEqual(['birthdays', 'list', null]);
    // all is a prefix of the list → invalidating it matches every branch's list.
    expect(birthdayKeys.list(5).slice(0, 1)).toEqual(birthdayKeys.all);
  });
});

describe('birthdaysListQuery', () => {
  it('carries the list key and keeps the 1-hour staleTime', () => {
    expect(birthdaysListQuery(7).queryKey).toEqual(['birthdays', 'list', 7]);
    expect(birthdaysListQuery().queryKey).toEqual(['birthdays', 'list', null]);
    expect(birthdaysListQuery(7).staleTime).toBe(60 * 60 * 1000);
  });

  it('hits the EMPLOYEES_BIRTHDAYS endpoint', async () => {
    mock.onGet(EMPLOYEES_BIRTHDAYS).reply(200, []);
    await (birthdaysListQuery(7).queryFn as () => Promise<unknown[]>)();
    expect(mock.history.get[0].url).toBe(EMPLOYEES_BIRTHDAYS);
  });

  it('sends organization_branch_id only when provided', async () => {
    mock.onGet(EMPLOYEES_BIRTHDAYS).reply(200, []);
    await (birthdaysListQuery(3).queryFn as () => Promise<unknown[]>)();
    expect(mock.history.get[0].params).toEqual({ organization_branch_id: 3 });

    mock.resetHistory();
    await (birthdaysListQuery().queryFn as () => Promise<unknown[]>)();
    expect(mock.history.get[0].params).toEqual({});
  });

  it('returns a bare-array response as-is', async () => {
    mock.onGet(EMPLOYEES_BIRTHDAYS).reply(200, [{ id: 1 }, { id: 2 }]);
    const data = await (birthdaysListQuery(3).queryFn as () => Promise<unknown[]>)();
    expect(data).toHaveLength(2);
  });

  it('unwraps an { items } envelope', async () => {
    mock.onGet(EMPLOYEES_BIRTHDAYS).reply(200, { items: [{ id: 1 }] });
    const data = await (birthdaysListQuery().queryFn as () => Promise<unknown[]>)();
    expect(data).toEqual([{ id: 1 }]);
  });
});
