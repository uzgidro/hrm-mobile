import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { supportListServerParams, supportSummaryQuery } from '../queries';

let mock: MockAdapter;
beforeEach(() => { mock = new MockAdapter(apiClient); });
afterEach(() => mock.restore());

describe('supportListServerParams', () => {
  it('maps scope/status/search and sends only the non-default sort', () => {
    expect(supportListServerParams({ scope: 'mine', status: 'open', search: ' uge ', sort: 'priority' }))
      .toEqual({ mine: true, status: 'open', search: 'uge', sort: 'priority' });
    expect(supportListServerParams({ scope: 'queue', status: 'all', sort: 'recent' }))
      .toEqual({ mine: undefined, status: undefined, search: undefined, sort: undefined });
  });
});

describe('supportSummaryQuery (web v2 folder counts)', () => {
  it('asks support-tickets/summary with the same scope and search as the list', async () => {
    const body = { all: 5, new: 2, taken: 1, done: 2, unread: 1, can_create: false };
    mock.onGet('support-tickets/summary').reply(200, body);
    const q = supportSummaryQuery('mine', ' printer ');
    expect(q.queryKey).toEqual(['support-tickets', 'summary', 'mine', 'printer']);
    expect(await (q.queryFn as () => Promise<unknown>)()).toEqual(body);
    expect(mock.history.get[0].params).toEqual({ mine: true, search: 'printer' });
  });

  it('the queue scope omits `mine`', async () => {
    mock.onGet('support-tickets/summary').reply(200, { all: 0, new: 0, taken: 0, done: 0, unread: 0 });
    await (supportSummaryQuery('queue').queryFn as () => Promise<unknown>)();
    expect(mock.history.get[0].params).toEqual({ mine: undefined, search: undefined });
  });
});
