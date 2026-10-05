import MockAdapter from 'axios-mock-adapter';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { VISITORS_LIST, VISITOR_DETAIL, EMPLOYEE_VALIDATE_PHOTO } from '@/api/urls';
import {
  createVisitor,
  updateVisitor,
  deleteVisitor,
  validateVisitorPhoto,
  afterVisitorDeleted,
} from '../mutations';
import { visitorKeys } from '../queries';

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

// QA 2026-10-05: the still-open detail of a just-deleted record was refetched
// by the prefix invalidation (GET → 404 → error toast).
describe('afterVisitorDeleted', () => {
  it('drops the deleted detail (no refetch → no 404) and still refreshes the list', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    const listKey = visitorKeys.list(undefined, undefined, 'all');
    mock.onGet(VISITOR_DETAIL(3)).reply(404, { detail: 'not found' });
    mock.onGet(VISITORS_LIST).reply(200, []);
    qc.setQueryData(visitorKeys.detail(3), { id: 3 });
    qc.setQueryData(listKey, []);
    const unsubs = [
      new QueryObserver(qc, {
        queryKey: visitorKeys.detail(3),
        queryFn: () => apiClient.get(VISITOR_DETAIL(3)).then((r) => r.data),
        staleTime: Infinity,
      }).subscribe(() => {}),
      new QueryObserver(qc, {
        queryKey: listKey,
        queryFn: () => apiClient.get(VISITORS_LIST).then((r) => r.data),
        staleTime: Infinity,
      }).subscribe(() => {}),
    ];

    await afterVisitorDeleted(qc, 3);

    expect(qc.getQueryCache().find({ queryKey: visitorKeys.detail(3), exact: true })).toBeUndefined();
    expect(mock.history.get.filter((r) => r.url === VISITOR_DETAIL(3))).toHaveLength(0);
    expect(mock.history.get.filter((r) => r.url === VISITORS_LIST)).toHaveLength(1);
    unsubs.forEach((u) => u());
    qc.clear();
  });
});
