import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { LLM_SESSIONS, LLM_SESSION_MESSAGES, LLM_SESSION_CHAT, LLM_LARGE_LIST, LLM_SESSION_DETAIL } from '@/api/urls';
import { assistantKeys, assistantSessionsQuery, assistantMessagesQuery } from '../queries';
import {
  createAssistantSession,
  deleteAssistantSession,
  sendAssistantMessage,
  fetchLargeListPage,
  DEFAULT_SYSTEM_PROMPT,
} from '../mutations';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('assistantKeys', () => {
  it('roots at assistant and separates messages per session', () => {
    expect(assistantKeys.all).toEqual(['assistant']);
    expect(assistantKeys.sessions()).toEqual(['assistant', 'sessions']);
    expect(assistantKeys.messages(3)).toEqual(['assistant', 'messages', 3]);
    expect(assistantKeys.messages(3).slice(0, 1)).toEqual(assistantKeys.all);
  });
});

describe('assistantSessionsQuery', () => {
  it('fetches sessions and sorts newest (highest id) first', async () => {
    mock.onGet(LLM_SESSIONS).reply(200, [{ id: 1, name: 'old' }, { id: 5, name: 'new' }]);
    const data = await (assistantSessionsQuery().queryFn as () => Promise<any[]>)();
    expect(data.map((s) => s.id)).toEqual([5, 1]);
  });

  it('unwraps an { items } envelope', async () => {
    mock.onGet(LLM_SESSIONS).reply(200, { items: [{ id: 2 }] });
    const data = await (assistantSessionsQuery().queryFn as () => Promise<any[]>)();
    expect(data).toEqual([{ id: 2 }]);
  });
});

describe('assistantMessagesQuery', () => {
  it('ALWAYS requests visible_only=true (tool rows must not leak)', async () => {
    mock.onGet(LLM_SESSION_MESSAGES(7)).reply(200, []);
    await (assistantMessagesQuery(7).queryFn as () => Promise<unknown>)();
    expect(mock.history.get[0].params).toEqual({ visible_only: true });
  });

  it('sorts by sequence ascending', async () => {
    mock.onGet(LLM_SESSION_MESSAGES(7)).reply(200, [
      { id: 11, role: 'assistant', sequence: 2 },
      { id: 10, role: 'user', sequence: 1 },
    ]);
    const data = await (assistantMessagesQuery(7).queryFn as () => Promise<any[]>)();
    expect(data.map((m) => m.id)).toEqual([10, 11]);
  });
});

describe('session request functions', () => {
  it('createAssistantSession sends the default Uzbek system prompt', async () => {
    mock.onPost(LLM_SESSIONS).reply(200, { id: 9, name: 'New Chat' });
    const s = await createAssistantSession();
    expect(s.id).toBe(9);
    const body = JSON.parse(mock.history.post[0].data);
    expect(body).toEqual({ name: 'New Chat', system_prompt: DEFAULT_SYSTEM_PROMPT });
  });

  it('deleteAssistantSession hits the detail URL', async () => {
    mock.onDelete(LLM_SESSION_DETAIL(9)).reply(200, { detail: 'Session deleted' });
    await deleteAssistantSession(9);
    expect(mock.history.delete).toHaveLength(1);
  });

  it('sendAssistantMessage posts {message} and returns the response envelope', async () => {
    mock.onPost(LLM_SESSION_CHAT(9)).reply(200, { response: 'Salom!', interaction_id: 1, session_id: 9, status: 'completed' });
    const r = await sendAssistantMessage(9, 'salom');
    expect(r.response).toBe('Salom!');
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ message: 'salom' });
  });

  it('fetchLargeListPage passes offset/limit', async () => {
    mock.onGet(LLM_LARGE_LIST('ab12')).reply(200, { rows: [], offset: 15, next_offset: 30, total: 80, has_more: true });
    const page = await fetchLargeListPage('ab12', 15);
    expect(page.has_more).toBe(true);
    expect(mock.history.get[0].params).toEqual({ offset: 15, limit: 15 });
  });
});
