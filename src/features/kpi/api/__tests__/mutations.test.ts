import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { KPI_TASKS, KPI_TASK_DETAIL, KPI_TASK_SUBMIT } from '@/api/urls';
import { addKpiTask, updateKpiTask, submitKpiTask, deleteKpiTask } from '../mutations';

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
