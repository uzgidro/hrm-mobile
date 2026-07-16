import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { KPI_TASKS, KPI_TASK_DETAIL, KPI_TASK_SUBMIT, KPI_TASK_REVIEW } from '@/api/urls';
import {
  addKpiTask, updateKpiTask, submitKpiTask, deleteKpiTask, reviewKpiTask,
} from '../mutations';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('addKpiTask', () => {
  it('POSTs {entry_id, name} to kpi/tasks (name only — no score from the owner)', async () => {
    mock.onPost(KPI_TASKS).reply(200, { id: 7, entry_id: 3, name: 'did the thing' });
    const t = await addKpiTask(3, 'did the thing');
    expect(t.id).toBe(7);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ entry_id: 3, name: 'did the thing' });
  });
});

describe('updateKpiTask', () => {
  it('PATCHes {name} to kpi/tasks/{id}', async () => {
    mock.onPatch(KPI_TASK_DETAIL(7)).reply(200, { id: 7, name: 'renamed' });
    const t = await updateKpiTask(7, 'renamed');
    expect(t.name).toBe('renamed');
    expect(JSON.parse(mock.history.patch[0].data)).toEqual({ name: 'renamed' });
  });
});

describe('submitKpiTask', () => {
  it('POSTs to kpi/tasks/{id}/submit with no body', async () => {
    mock.onPost(KPI_TASK_SUBMIT(7)).reply(200, { id: 7, status: 'submitted' });
    const t = await submitKpiTask(7);
    expect(t.status).toBe('submitted');
  });
});

describe('deleteKpiTask', () => {
  it('DELETEs kpi/tasks/{id}', async () => {
    mock.onDelete(KPI_TASK_DETAIL(7)).reply(200, {});
    await expect(deleteKpiTask(7)).resolves.toBeUndefined();
    expect(mock.history.delete).toHaveLength(1);
  });
});

describe('reviewKpiTask (supervisor)', () => {
  it('confirm sends {action, score} with score coerced to a number (0 fallback)', async () => {
    mock.onPost(KPI_TASK_REVIEW(7)).reply(200, { id: 7, status: 'confirmed', score: 80 });
    const t = await reviewKpiTask(7, { action: 'confirm', score: 80 });
    expect(t.status).toBe('confirmed');
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ action: 'confirm', score: 80 });

    mock.resetHistory();
    mock.onPost(KPI_TASK_REVIEW(7)).reply(200, { id: 7, status: 'confirmed', score: 0 });
    await reviewKpiTask(7, { action: 'confirm' });
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ action: 'confirm', score: 0 });
  });

  it('confirm normalizes a comma decimal (RU/UZ keyboards) to a number', async () => {
    mock.onPost(KPI_TASK_REVIEW(7)).reply(200, { id: 7, status: 'confirmed', score: 80.5 });
    await reviewKpiTask(7, { action: 'confirm', score: '80,5' });
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ action: 'confirm', score: 80.5 });
  });

  it('reject sends {action, review_note} (null when empty — web parity)', async () => {
    mock.onPost(KPI_TASK_REVIEW(7)).reply(200, { id: 7, status: 'rejected' });
    await reviewKpiTask(7, { action: 'reject', review_note: 'not enough' });
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ action: 'reject', review_note: 'not enough' });

    mock.resetHistory();
    mock.onPost(KPI_TASK_REVIEW(7)).reply(200, { id: 7, status: 'rejected' });
    await reviewKpiTask(7, { action: 'reject' });
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ action: 'reject', review_note: null });
  });
});
