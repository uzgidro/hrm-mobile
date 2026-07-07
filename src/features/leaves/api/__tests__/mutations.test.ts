import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { WORK_LEAVES, WORK_LEAVE_SIGN, WORK_LEAVE_REJECT } from '@/api/urls';
import { signLeave, rejectLeave, createLeave } from '../mutations';

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
});
