import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { WORK_LEAVE_SIGN, WORK_LEAVE_REJECT } from '@/api/urls';
import { signLeave, rejectLeave } from '../mutations';

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
});
