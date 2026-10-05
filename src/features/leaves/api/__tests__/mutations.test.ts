import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { WORK_LEAVES, WORK_LEAVE_SIGN, WORK_LEAVE_REJECT, WORK_LEAVE_DETAIL, WORK_LEAVE_REOPEN } from '@/api/urls';
import { signLeave, rejectLeave, createLeave, deleteLeave, reopenLeave, afterLeaveDeleted } from '../mutations';
import { leaveKeys } from '../queries';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('leave request functions', () => {
  it('signLeave POSTs the sign endpoint for the given id', async () => {
    mock.onPost(WORK_LEAVE_SIGN(5)).reply(200, { id: 5, status: 'signed' });
    const data = await signLeave(5);
    expect(data).toEqual({ id: 5, status: 'signed' });
    expect(mock.history.post[0].url).toBe(WORK_LEAVE_SIGN(5));
  });

  it('rejectLeave POSTs the reject endpoint with a { rejection_reason } body', async () => {
    mock.onPost(WORK_LEAVE_REJECT(8)).reply(200, { id: 8, status: 'rejected' });
    const data = await rejectLeave(8, 'sabab');
    expect(data).toEqual({ id: 8, status: 'rejected' });
    expect(mock.history.post[0].url).toBe(WORK_LEAVE_REJECT(8));
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ rejection_reason: 'sabab' });
  });

  it('createLeave POSTs the work-leaves endpoint with the request payload', async () => {
    mock.onPost(WORK_LEAVES).reply(201, { id: 42 });
    const payload = {
      type: "Ta'til",
      start_date: '2026-07-10T09:00:00.000Z',
      end_date: '2026-07-10T18:00:00.000Z',
      description: 'sabab',
      assigned_signer_ids: [3],
    };
    const data = await createLeave(payload);
    expect(data).toEqual({ id: 42 });
    expect(mock.history.post[0].url).toBe(WORK_LEAVES);
    expect(JSON.parse(mock.history.post[0].data)).toEqual(payload);
  });

  it('deleteLeave DELETEs the detail endpoint for the given id', async () => {
    mock.onDelete(WORK_LEAVE_DETAIL(7)).reply(204);
    await deleteLeave(7);
    expect(mock.history.delete[0].url).toBe(WORK_LEAVE_DETAIL(7));
  });
});

describe('reopen (web v2 useLeaveMutations.reopen)', () => {
  it('reopenLeave POSTs work-leaves/{id}/reopen with a { reason } body', async () => {
    mock.onPost(WORK_LEAVE_REOPEN(9)).reply(200, { id: 9, status: 'pending' });
    const data = await reopenLeave(9, 'Xato tasdiqlangan');
    expect(data).toEqual({ id: 9, status: 'pending' });
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ reason: 'Xato tasdiqlangan' });
  });
});

// QA 2026-10-05: after «So'rov o'chirildi» came a second, English toast
// «Work leave not found» — the prefix invalidation refetched the still-open
// detail of the record that had just been deleted (GET → 404).
describe('afterLeaveDeleted', () => {
  it('drops the deleted detail (no refetch → no 404) and still refreshes the lists', async () => {
    // gcTime Infinity: no 5-min gc timer on the detached query keeps jest alive.
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    mock.onGet(WORK_LEAVE_DETAIL(7)).reply(404, { code: 'work_leave_not_found' });
    mock.onGet(WORK_LEAVES).reply(200, []);
    qc.setQueryData(leaveKeys.detail(7), { id: 7 });
    qc.setQueryData(leaveKeys.detail(8), { id: 8 });
    qc.setQueryData([...leaveKeys.all, 'list', 'mine', {}], []);
    // Active observers — exactly what an open detail screen / list hold.
    const unsubs = [
      new QueryObserver(qc, { queryKey: leaveKeys.detail(7), queryFn: () => apiClient.get(WORK_LEAVE_DETAIL(7)).then((r) => r.data), staleTime: Infinity }).subscribe(() => {}),
      new QueryObserver(qc, { queryKey: [...leaveKeys.all, 'list', 'mine', {}], queryFn: () => apiClient.get(WORK_LEAVES).then((r) => r.data), staleTime: Infinity }).subscribe(() => {}),
    ];

    await afterLeaveDeleted(qc, 7);

    expect(qc.getQueryCache().find({ queryKey: leaveKeys.detail(7), exact: true })).toBeUndefined();
    expect(mock.history.get.filter((r) => r.url === WORK_LEAVE_DETAIL(7))).toHaveLength(0);
    expect(mock.history.get.filter((r) => r.url === WORK_LEAVES)).toHaveLength(1); // list refreshed
    expect(qc.getQueryState(leaveKeys.detail(8))?.isInvalidated).toBe(true); // other details only marked stale
    unsubs.forEach((u) => u());
    qc.clear();
  });
});
