import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { WORKSPACES_LIST, WORKSPACE_DETAIL, CARDS_LIST } from '@/api/urls';
import {
  projectKeys,
  getWorkspace,
  myWorkspacesQuery,
  workspaceDetailQuery,
  columnCardsQuery,
} from '../queries';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('projectKeys', () => {
  it('builds a hierarchical key tree so `all` is a prefix of every key', () => {
    expect(projectKeys.all).toEqual(['projects']);
    expect(projectKeys.myWorkspaces()).toEqual(['projects', 'mine']);
    expect(projectKeys.detail(9)).toEqual(['projects', 'detail', 9]);
    expect(projectKeys.cards(4)).toEqual(['projects', 'cards', 4]);
    // all is a prefix of each → invalidating it matches list, detail and cards
    expect(projectKeys.myWorkspaces().slice(0, 1)).toEqual(projectKeys.all);
    expect(projectKeys.detail(9).slice(0, 1)).toEqual(projectKeys.all);
    expect(projectKeys.cards(4).slice(0, 1)).toEqual(projectKeys.all);
  });
});

describe('myWorkspacesQuery', () => {
  it('carries the my-workspaces key', () => {
    expect(myWorkspacesQuery().queryKey).toEqual(['projects', 'mine']);
  });

  it('sends the only_member filter', async () => {
    mock.onGet(WORKSPACES_LIST).reply(200, []);
    await (myWorkspacesQuery().queryFn as () => Promise<unknown[]>)();
    expect(mock.history.get[0].params).toEqual({ only_member: true, exclude_member: false });
  });

  it('returns a bare array response as-is', async () => {
    mock.onGet(WORKSPACES_LIST).reply(200, [{ id: 1 }, { id: 2 }]);
    const data = await (myWorkspacesQuery().queryFn as () => Promise<unknown[]>)();
    expect(data).toHaveLength(2);
  });

  it('unwraps an { items } envelope', async () => {
    mock.onGet(WORKSPACES_LIST).reply(200, { items: [{ id: 1 }] });
    const data = await (myWorkspacesQuery().queryFn as () => Promise<unknown[]>)();
    expect(data).toEqual([{ id: 1 }]);
  });
});

describe('workspaceDetailQuery', () => {
  it('carries the detail key and always revalidates on mount', () => {
    const opts = workspaceDetailQuery(42);
    expect(opts.queryKey).toEqual(['projects', 'detail', 42]);
    expect(opts.refetchOnMount).toBe('always');
    expect(opts.enabled).toBe(true);
  });

  it('is disabled for a falsy id', () => {
    expect(workspaceDetailQuery(0).enabled).toBe(false);
  });

  it('fetches the workspace by id', async () => {
    mock.onGet(WORKSPACE_DETAIL(42)).reply(200, { id: 42, name: 'X' });
    const data = await (workspaceDetailQuery(42).queryFn as () => Promise<{ id: number }>)();
    expect(data.id).toBe(42);
  });
});

describe('columnCardsQuery', () => {
  it('carries the cards key and column filter, disabled for falsy id', () => {
    const opts = columnCardsQuery(4);
    expect(opts.queryKey).toEqual(['projects', 'cards', 4]);
    expect(opts.enabled).toBe(true);
    expect(columnCardsQuery(0).enabled).toBe(false);
  });

  it('always revalidates on mount (cards are externally mutable board content)', () => {
    expect(columnCardsQuery(4).refetchOnMount).toBe('always');
  });

  it('sends column_id and unwraps an { items } envelope', async () => {
    mock.onGet(CARDS_LIST).reply(200, { items: [{ id: 1 }] });
    const data = await (columnCardsQuery(4).queryFn as () => Promise<unknown[]>)();
    expect(mock.history.get[0].params).toEqual({ column_id: 4 });
    expect(data).toEqual([{ id: 1 }]);
  });

  it('returns a bare array response as-is', async () => {
    mock.onGet(CARDS_LIST).reply(200, [{ id: 1 }, { id: 2 }]);
    const data = await (columnCardsQuery(4).queryFn as () => Promise<unknown[]>)();
    expect(data).toHaveLength(2);
  });
});

describe('getWorkspace', () => {
  it('GETs the workspace by id and returns the body', async () => {
    mock.onGet(WORKSPACE_DETAIL(7)).reply(200, { id: 7, name: 'Y' });
    const ws = await getWorkspace(7);
    expect(ws).toEqual({ id: 7, name: 'Y' });
    expect(mock.history.get[0].url).toBe(WORKSPACE_DETAIL(7));
  });
});
