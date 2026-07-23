import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { CHAIRMAN_TASKS, CHAIRMAN_TASK_DETAIL } from '@/api/urls';
import { createChairmanTask, updateChairmanTask, deleteChairmanTask } from '../mutations';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('chairman task request functions', () => {
  it('createChairmanTask POSTs the payload to the list endpoint', async () => {
    mock.onPost(CHAIRMAN_TASKS).reply(201, { id: 5, title: 'Yig\'ilish' });
    const created = await createChairmanTask({ title: "Yig'ilish", task_date: '2026-07-25' });
    expect(created).toEqual({ id: 5, title: "Yig'ilish" });
    expect(mock.history.post[0].url).toBe(CHAIRMAN_TASKS);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ title: "Yig'ilish", task_date: '2026-07-25' });
  });

  it('createChairmanTask includes optional fields when present', async () => {
    mock.onPost(CHAIRMAN_TASKS).reply(201, { id: 6 });
    await createChairmanTask({
      title: 'X', task_date: '2026-07-25', start_time: '09:00', end_time: '10:00',
      participants: 'A, B', color: '#0DA9AA',
    });
    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      title: 'X', task_date: '2026-07-25', start_time: '09:00', end_time: '10:00',
      participants: 'A, B', color: '#0DA9AA',
    });
  });

  it('updateChairmanTask PATCHes chairman-tasks/:id', async () => {
    mock.onPatch(CHAIRMAN_TASK_DETAIL(3)).reply(200, { id: 3 });
    const updated = await updateChairmanTask(3, { title: 'New' });
    expect(updated).toEqual({ id: 3 });
    expect(mock.history.patch[0].url).toBe(CHAIRMAN_TASK_DETAIL(3));
    expect(JSON.parse(mock.history.patch[0].data)).toEqual({ title: 'New' });
  });

  it('deleteChairmanTask DELETEs chairman-tasks/:id', async () => {
    mock.onDelete(CHAIRMAN_TASK_DETAIL(8)).reply(200, { detail: 'deleted' });
    await deleteChairmanTask(8);
    expect(mock.history.delete[0].url).toBe(CHAIRMAN_TASK_DETAIL(8));
  });
});
