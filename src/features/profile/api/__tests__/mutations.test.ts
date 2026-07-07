import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { EMPLOYEE_DETAIL, EMPLOYEE_SELF_UPDATE, USER_INFO } from '@/api/urls';
import { getMyProfile, updateMyProfile, fetchCurrentUser } from '../mutations';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('profile request functions', () => {
  it('getMyProfile GETs employees/:id and returns the body', async () => {
    mock.onGet(EMPLOYEE_DETAIL(42)).reply(200, { id: 42, legal_name: 'Ali' });
    const emp = await getMyProfile(42);
    expect(emp).toEqual({ id: 42, legal_name: 'Ali' });
    expect(mock.history.get[0].url).toBe(EMPLOYEE_DETAIL(42));
  });

  it('updateMyProfile PATCHes the self-update endpoint with the exact payload', async () => {
    mock.onPatch(EMPLOYEE_SELF_UPDATE).reply(200, { ok: true });
    const payload = { legal_name: 'Ali', phone_number: '+998901234567' };
    const res = await updateMyProfile(payload);
    expect(res).toEqual({ ok: true });
    expect(mock.history.patch[0].url).toBe(EMPLOYEE_SELF_UPDATE);
    expect(JSON.parse(mock.history.patch[0].data)).toEqual(payload);
  });

  it('fetchCurrentUser GETs auth/me and returns the user body', async () => {
    mock.onGet(USER_INFO).reply(200, { id: 1, type: 'employee' });
    const user = await fetchCurrentUser();
    expect(user).toEqual({ id: 1, type: 'employee' });
    expect(mock.history.get[0].url).toBe(USER_INFO);
  });
});
