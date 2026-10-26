import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { fetchChronoCalendar, fetchChronoSummary, fetchChronoTask, fetchChronoTasks } from '../api/queries';
import {
  addFiles,
  buildForm,
  comment,
  createTask,
  decideExtension,
  decideStep,
  decideTask,
  deleteTask,
  requestExtension,
  saveSteps,
  setDeadline,
  submitStep,
  submitTask,
  updateTask,
} from '../api/mutations';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

const task = { id: 5, steps: [], members: [] };

describe('queries', () => {
  it('lists with only the filters that are set', async () => {
    mock.onGet('task-chronology').reply(200, { items: [{ id: 1 }], total: 1 });
    expect(await fetchChronoTasks('', '', false)).toEqual([{ id: 1 }]);
    expect(mock.history.get[0].params).toEqual({});
    await fetchChronoTasks('hisobot', 'late', true);
    expect(mock.history.get[1].params).toEqual({ search: 'hisobot', status: 'late', mine: true });
  });

  it('summary, calendar and one task', async () => {
    mock.onGet('task-chronology/summary').reply(200, { all: 3, can_manage: true });
    mock.onGet('task-chronology/calendar').reply(200, [{ task_id: 1 }]);
    mock.onGet('task-chronology/5').reply(200, task);
    expect((await fetchChronoSummary('', true)).all).toBe(3);
    expect(mock.history.get[0].params).toEqual({ mine: true });
    expect(await fetchChronoCalendar('2026-10-26', '2026-12-06', false)).toEqual([{ task_id: 1 }]);
    expect(mock.history.get[1].params).toEqual({ date_from: '2026-10-26', date_to: '2026-12-06' });
    expect((await fetchChronoTask(5)).id).toBe(5);
  });
});

describe('writes', () => {
  it('task, tree and members go to their own routes', async () => {
    mock.onPost('task-chronology').reply(200, task);
    mock.onPatch('task-chronology/5').reply(200, task);
    mock.onPut('task-chronology/5/steps').reply(200, task);
    mock.onDelete('task-chronology/5').reply(200, { detail: 'ok' });
    await createTask({ title: 'T', member_ids: [1], steps: [] });
    await updateTask(5, { member_ids: [1, 2] });
    await saveSteps(5, [{ key: 'n1', title: 'A', assignee_id: 1, deadline: '2026-11-01', parent: null }]);
    await deleteTask(5);
    expect(JSON.parse(mock.history.put[0].data).steps[0]).toMatchObject({ key: 'n1', parent: null });
    expect(JSON.parse(mock.history.patch[0].data)).toEqual({ member_ids: [1, 2] });
    expect(mock.history.delete).toHaveLength(1);
  });

  it('decisions carry a note (null when empty)', async () => {
    mock.onPost(/steps\/7\/(approve|reject|reopen)$/).reply(200, task);
    mock.onPost(/task-chronology\/5\/(approve|reject|reopen)$/).reply(200, task);
    await decideStep(7, 'reject', 'Jadval yo‘q');
    await decideStep(7, 'approve');
    await decideTask(5, 'approve', '');
    expect(mock.history.post.map((r) => [r.url, JSON.parse(r.data)])).toEqual([
      ['task-chronology/steps/7/reject', { note: 'Jadval yo‘q' }],
      ['task-chronology/steps/7/approve', { note: null }],
      ['task-chronology/5/approve', { note: null }],
    ]);
  });

  it('deadlines: request, decide, move', async () => {
    mock.onPost(/./).reply(200, task);
    await requestExtension(7, '2026-11-20', 'Hamkor kechikdi');
    await decideExtension(3, 'approve', { deadline: '2026-11-18' });
    await decideExtension(3, 'reject', { note: 'Yetarli' });
    await setDeadline(7, '2026-11-25', 'Rahbar topshirig‘i');
    expect(mock.history.post.map((r) => [r.url, JSON.parse(r.data)])).toEqual([
      ['task-chronology/steps/7/extension-requests', { requested_deadline: '2026-11-20', reason: 'Hamkor kechikdi' }],
      ['task-chronology/extension-requests/3/approve', { deadline: '2026-11-18', note: null }],
      ['task-chronology/extension-requests/3/reject', { deadline: null, note: 'Yetarli' }],
      ['task-chronology/steps/7/deadline', { deadline: '2026-11-25', reason: 'Rahbar topshirig‘i' }],
    ]);
  });

  it('multipart: hand-in, comment with mentions, files', async () => {
    mock.onPost(/./).reply(200, task);
    const file = { uri: 'file:///tmp/a.pdf', name: 'a.pdf', mimeType: 'application/pdf' };
    await submitStep(7, 'tayyor', [file]);
    await submitTask(5, '', []);
    await comment(5, { stepId: 7, text: '@Ali qarang', files: [], mentionIds: [11, 12] });
    await addFiles(5, [file]);
    const urls = mock.history.post.map((r) => r.url);
    expect(urls).toEqual([
      'task-chronology/steps/7/submit',
      'task-chronology/5/submit',
      'task-chronology/5/comments',
      'task-chronology/5/files',
    ]);
    expect(mock.history.post.every((r) => r.data instanceof FormData)).toBe(true);
  });

  it('buildForm sends text, extra fields and every file under «files»', async () => {
    const append = jest.spyOn(FormData.prototype, 'append').mockImplementation(() => undefined);
    try {
      await buildForm('salom', [{ uri: 'file:///x.zip', name: 'x.zip' }], { step_id: '7', mention_ids: '1,2' });
      expect(append.mock.calls.map((c) => c[0])).toEqual(['text', 'step_id', 'mention_ids', 'files']);
      expect(append.mock.calls[3][1]).toMatchObject({ name: 'x.zip', type: 'application/octet-stream' });
    } finally {
      append.mockRestore();
    }
  });
});
