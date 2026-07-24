import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { KPI_TASKS, KPI_TASK_DETAIL, KPI_TASK_SET_STATUS, KPI_TASK_SET_GRADE } from '@/api/urls';
import {
  addKpiTask, updateKpiTask, deleteKpiTask, setTaskStatus, setTaskGrade,
} from '../mutations';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('addKpiTask', () => {
  it('POSTs {entry_id, name} to kpi/tasks when no score is given', async () => {
    mock.onPost(KPI_TASKS).reply(200, { id: 7, entry_id: 3, name: 'did the thing' });
    const t = await addKpiTask(3, 'did the thing');
    expect(t.id).toBe(7);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ entry_id: 3, name: 'did the thing' });
  });

  it('POSTs {entry_id, name, score} when a score is given (comma decimal normalized)', async () => {
    mock.onPost(KPI_TASKS).reply(200, { id: 7 });
    await addKpiTask(3, 'x', '80,5');
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ entry_id: 3, name: 'x', score: 80.5 });
  });

  it('omits score when the input is empty or garbage (not sent as null)', async () => {
    mock.onPost(KPI_TASKS).reply(200, { id: 7 });
    await addKpiTask(3, 'x', '');
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ entry_id: 3, name: 'x' });
    mock.resetHistory();
    mock.onPost(KPI_TASKS).reply(200, { id: 7 });
    await addKpiTask(3, 'x', 'abc');
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ entry_id: 3, name: 'x' });
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

describe('deleteKpiTask', () => {
  it('DELETEs kpi/tasks/{id}', async () => {
    mock.onDelete(KPI_TASK_DETAIL(7)).reply(200, {});
    await expect(deleteKpiTask(7)).resolves.toBeUndefined();
    expect(mock.history.delete).toHaveLength(1);
  });
});

// ── Verifix task flow (replaces the old submit/review) ───────────────────────
describe('setTaskStatus', () => {
  it('POSTs {status_id} (int FK to the catalog) to kpi/tasks/{id}/set-status', async () => {
    mock.onPost(KPI_TASK_SET_STATUS(7)).reply(200, { id: 7, status_id: 3 });
    const t = await setTaskStatus(7, 3);
    expect(t.status_id).toBe(3);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ status_id: 3 });
  });
});

describe('setTaskGrade', () => {
  it('POSTs {score} (comma decimal normalized) to kpi/tasks/{id}/set-grade', async () => {
    mock.onPost(KPI_TASK_SET_GRADE(7)).reply(200, { id: 7, score: 80.5 });
    const t = await setTaskGrade(7, '80,5');
    expect(t.score).toBe(80.5);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ score: 80.5 });
  });

  it('POSTs {score: null} to clear a grade (empty input)', async () => {
    mock.onPost(KPI_TASK_SET_GRADE(7)).reply(200, { id: 7, score: null });
    await setTaskGrade(7, '');
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ score: null });
    mock.resetHistory();
    mock.onPost(KPI_TASK_SET_GRADE(7)).reply(200, { id: 7, score: null });
    await setTaskGrade(7, null);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ score: null });
  });
});
