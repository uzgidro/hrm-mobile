import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { VISITORS_LIST, VISITOR_DETAIL, EMPLOYEE_VALIDATE_PHOTO } from '@/api/urls';
import {
  createVisitor,
  updateVisitor,
  deleteVisitor,
  validateVisitorPhoto,
} from '../mutations';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('visitor request functions', () => {
  it('createVisitor POSTs the payload to the list endpoint', async () => {
    mock.onPost(VISITORS_LIST).reply(201, { id: 10, legal_name: 'Ali' });
    const created = await createVisitor({ legal_name: 'Ali' });
    expect(created).toEqual({ id: 10, legal_name: 'Ali' });
    expect(mock.history.post[0].url).toBe(VISITORS_LIST);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ legal_name: 'Ali' });
  });

  it('updateVisitor PATCHes visitors/:id', async () => {
    mock.onPatch(VISITOR_DETAIL(3)).reply(200, { id: 3 });
    const updated = await updateVisitor(3, { legal_name: 'B' });
    expect(updated).toEqual({ id: 3 });
    expect(mock.history.patch[0].url).toBe(VISITOR_DETAIL(3));
  });

  it('deleteVisitor DELETEs visitors/:id', async () => {
    mock.onDelete(VISITOR_DETAIL(8)).reply(204);
    await expect(deleteVisitor(8)).resolves.toBeUndefined();
    expect(mock.history.delete[0].url).toBe(VISITOR_DETAIL(8));
  });
});

describe('validateVisitorPhoto', () => {
  it('reports accepted:false with a message when the terminal rejects', async () => {
    mock.onPost(EMPLOYEE_VALIDATE_PHOTO).reply(200, { accepted: false, message: 'no face' });
    expect(await validateVisitorPhoto('base64')).toEqual({ accepted: false, message: 'no face' });
  });

  it('treats a missing accepted flag as accepted', async () => {
    mock.onPost(EMPLOYEE_VALIDATE_PHOTO).reply(200, {});
    expect((await validateVisitorPhoto('base64')).accepted).toBe(true);
  });
});
