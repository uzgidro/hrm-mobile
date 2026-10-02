import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { TASKS_OVERDUE } from '@/api/urls';
import { ijroKeys, ijroTasksQuery, ijroSummaryQuery } from '../queries';
import { saveTask, deleteTask, setTaskCompleted } from '../mutations';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('ijro API (v2 useIjro)', () => {
  it("ro'yxat: qidiruv, holat; massiv yoki {items}", async () => {
    mock.onGet(TASKS_OVERDUE).replyOnce(200, [{ id: 1 }]).onGet(TASKS_OVERDUE).replyOnce(200, { items: [{ id: 2 }], total: 1 });
    expect(await (ijroTasksQuery({ search: 'hisobot', status: 'late' }).queryFn as () => Promise<unknown>)()).toEqual([{ id: 1 }]);
    expect(mock.history.get[0].params).toEqual({ search: 'hisobot', status: 'late' });
    expect(await (ijroTasksQuery({ search: '', status: '' }).queryFn as () => Promise<unknown>)()).toEqual([{ id: 2 }]);
    expect(mock.history.get[1].params).toEqual({});
  });
  it('xulosa', async () => {
    mock.onGet(`${TASKS_OVERDUE}/summary`).reply(200, { open: 1, late: 2, late_done: 3, done: 4, all: 10 });
    expect(await (ijroSummaryQuery('').queryFn as () => Promise<unknown>)()).toEqual({ open: 1, late: 2, late_done: 3, done: 4, all: 10 });
  });
  it('kalitlar', () => expect(ijroKeys.all).toEqual(['ijro']));
  it('saqlash / bajarildi / qayta ochish / o\u2019chirish', async () => {
    mock.onPost(TASKS_OVERDUE).reply(201, {});
    mock.onPatch(`${TASKS_OVERDUE}/3`).reply(200, {});
    mock.onDelete(`${TASKS_OVERDUE}/3`).reply(204);
    await saveTask(null, { task_index: 'A' });
    await saveTask(3, { task_index: 'B' });
    await setTaskCompleted(3, '2026-10-02');
    await setTaskCompleted(3, null);
    await deleteTask(3);
    expect(JSON.parse(mock.history.patch[1].data)).toEqual({ task_completed: '2026-10-02' });
    expect(JSON.parse(mock.history.patch[2].data)).toEqual({ task_completed: null });
    expect(mock.history.delete).toHaveLength(1);
  });
});
