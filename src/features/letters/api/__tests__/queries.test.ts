import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { LETTERS_LIST, LETTER_DETAIL } from '@/api/urls';
import { letterKeys, lettersListQuery, letterDetailQuery } from '../queries';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('letterKeys', () => {
  it('keeps `all` equal to the legacy ["letters"] key so existing invalidations still prefix-match', () => {
    expect(letterKeys.all).toEqual(['letters']);
  });

  it('builds the list key identical to the old tab key ["letters", tab]', () => {
    expect(letterKeys.list('action')).toEqual(['letters', 'action']);
    expect(letterKeys.list('all')).toEqual(['letters', 'all']);
  });

  it('places the detail under `all` so a single invalidate refreshes list + detail', () => {
    expect(letterKeys.detail(42)).toEqual(['letters', 'detail', 42]);
    expect(letterKeys.detail(42).slice(0, 1)).toEqual(letterKeys.all);
    expect(letterKeys.list('mine').slice(0, 1)).toEqual(letterKeys.all);
  });
});

describe('lettersListQuery', () => {
  it('sends assigned_signer for the action tab', async () => {
    const opts = lettersListQuery('action');
    expect(opts.queryKey).toEqual(['letters', 'action']);
    mock.onGet(LETTERS_LIST).reply(200, []);
    await (opts.queryFn as () => Promise<unknown[]>)();
    expect(mock.history.get[0].params).toEqual({ assigned_signer: true });
  });

  it('sends signer for the mine tab and no params for the all tab', async () => {
    mock.onGet(LETTERS_LIST).reply(200, []);
    await (lettersListQuery('mine').queryFn as () => Promise<unknown[]>)();
    expect(mock.history.get[0].params).toEqual({ signer: true });
    mock.resetHistory();
    await (lettersListQuery('all').queryFn as () => Promise<unknown[]>)();
    expect(mock.history.get[0].params).toEqual({});
  });

  it('returns a bare array and unwraps an { items } envelope', async () => {
    mock.onGet(LETTERS_LIST).reply(200, [{ id: 1 }, { id: 2 }]);
    expect(await (lettersListQuery('all').queryFn as () => Promise<unknown[]>)()).toHaveLength(2);
    mock.resetHistory();
    mock.onGet(LETTERS_LIST).reply(200, { items: [{ id: 3 }] });
    expect(await (lettersListQuery('all').queryFn as () => Promise<unknown[]>)()).toEqual([{ id: 3 }]);
  });
});

describe('letterDetailQuery', () => {
  it('carries the detail key and always revalidates on mount', () => {
    const opts = letterDetailQuery(42);
    expect(opts.queryKey).toEqual(['letters', 'detail', 42]);
    expect(opts.refetchOnMount).toBe('always');
    expect(opts.enabled).toBe(true);
  });

  it('is disabled for a falsy id', () => {
    expect(letterDetailQuery(0).enabled).toBe(false);
    expect(letterDetailQuery(undefined as unknown as number).enabled).toBe(false);
  });

  it('fetches the letter by id', async () => {
    mock.onGet(LETTER_DETAIL(42)).reply(200, { id: 42, status: 'pending' });
    const data = await (letterDetailQuery(42).queryFn as unknown as () => Promise<{ id: number }>)();
    expect(data.id).toBe(42);
  });
});
