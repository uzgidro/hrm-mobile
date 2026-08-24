import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import {
  ORDER_ACTS,
  ORDER_ACT_DOCUMENTS,
  ORDER_ACT_DECREE_APPROVE,
  ORDER_ACT_DECREE_REJECT,
  ORDER_ACT_DECREE_RESUBMIT,
  ORDER_ACT_DECREE_FORWARD,
  ORDER_ACT_DECREE_CONFIRM_SUBMISSION,
  ORDER_ACT_DECREE_REGISTER,
  ORDER_ACT_DECREE_ACKNOWLEDGE,
  ORDER_ACT_DECREE_ASSIGN_FAMILIARIZERS,
  ORDER_ACT_DECREE_SUBMIT,
  ORDER_ACT_DETAIL,
} from '@/api/urls';
import {
  approveDecree,
  rejectDecree,
  resubmitDecree,
  forwardDecree,
  submitDecree,
  updateOrder,
  acknowledgeDecree,
  registerDecree,
  assignFamiliarizers,
  createOrder,
  confirmSubmissionDecree,
} from '../mutations';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

// Kirituvchi shaxs tasdig'i (pending_submitter) — mobilда bu amal yo'q edi.
describe('confirmSubmissionDecree', () => {
  it('TANASIZ POST bilan confirm-submission ga boradi', async () => {
    mock.onPost(ORDER_ACT_DECREE_CONFIRM_SUBMISSION(6)).reply(200, { id: 6, status: 'pending_approval' });
    const data = await confirmSubmissionDecree(6);
    expect(data).toEqual({ id: 6, status: 'pending_approval' });
    expect(mock.history.post[0].url).toBe(ORDER_ACT_DECREE_CONFIRM_SUBMISSION(6));
  });
});

describe('decree workflow request functions', () => {
  it('approveDecree POSTs the approve endpoint with an empty {} body', async () => {
    mock.onPost(ORDER_ACT_DECREE_APPROVE(5)).reply(200, { id: 5, status: 'approved' });
    const data = await approveDecree(5);
    expect(data).toEqual({ id: 5, status: 'approved' });
    expect(mock.history.post[0].url).toBe(ORDER_ACT_DECREE_APPROVE(5));
    expect(JSON.parse(mock.history.post[0].data)).toEqual({});
  });

  it('rejectDecree POSTs the reject endpoint with a { comment } body', async () => {
    mock.onPost(ORDER_ACT_DECREE_REJECT(8)).reply(200, { id: 8 });
    const data = await rejectDecree(8, 'sabab');
    expect(data).toEqual({ id: 8 });
    expect(mock.history.post[0].url).toBe(ORDER_ACT_DECREE_REJECT(8));
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ comment: 'sabab' });
  });

  it('resubmitDecree POSTs the resubmit endpoint', async () => {
    mock.onPost(ORDER_ACT_DECREE_RESUBMIT(3)).reply(200, { ok: true });
    await resubmitDecree(3);
    expect(mock.history.post[0].url).toBe(ORDER_ACT_DECREE_RESUBMIT(3));
  });

  it('forwardDecree POSTs the forward-to-leadership endpoint', async () => {
    mock.onPost(ORDER_ACT_DECREE_FORWARD(4)).reply(200, { ok: true });
    await forwardDecree(4);
    expect(mock.history.post[0].url).toBe(ORDER_ACT_DECREE_FORWARD(4));
  });

  it('acknowledgeDecree POSTs the acknowledge endpoint', async () => {
    mock.onPost(ORDER_ACT_DECREE_ACKNOWLEDGE(6)).reply(200, { ok: true });
    await acknowledgeDecree(6);
    expect(mock.history.post[0].url).toBe(ORDER_ACT_DECREE_ACKNOWLEDGE(6));
  });

  it('registerDecree POSTs { act_number } when a number is provided', async () => {
    mock.onPost(ORDER_ACT_DECREE_REGISTER(7)).reply(200, { ok: true });
    await registerDecree(7, 42);
    expect(mock.history.post[0].url).toBe(ORDER_ACT_DECREE_REGISTER(7));
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ act_number: 42 });
  });

  it('registerDecree POSTs an empty {} body when no number is provided', async () => {
    mock.onPost(ORDER_ACT_DECREE_REGISTER(7)).reply(200, { ok: true });
    await registerDecree(7);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({});
  });

  it('assignFamiliarizers POSTs { employee_ids } to the assign endpoint', async () => {
    mock.onPost(ORDER_ACT_DECREE_ASSIGN_FAMILIARIZERS(11)).reply(200, { id: 11 });
    const data = await assignFamiliarizers(11, [3, 7, 9]);
    expect(data).toEqual({ id: 11 });
    expect(mock.history.post[0].url).toBe(ORDER_ACT_DECREE_ASSIGN_FAMILIARIZERS(11));
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ employee_ids: [3, 7, 9] });
  });

  it('assignFamiliarizers sends an empty list as { employee_ids: [] }', async () => {
    mock.onPost(ORDER_ACT_DECREE_ASSIGN_FAMILIARIZERS(11)).reply(200, {});
    await assignFamiliarizers(11, []);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ employee_ids: [] });
  });
});

describe('createOrder', () => {
  it('POSTs the payload and returns the new order id when there are no files', async () => {
    mock.onPost(ORDER_ACTS).reply(201, { id: 100 });
    const payload = {
      category_id: 1,
      summary: null,
      description: 'x',
      submitter_id: null,
      familiarizer_department_ids: [],
      assigned_signers: [],
      organization_branch_id: 9,
    };
    const id = await createOrder(payload);
    expect(id).toBe(100);
    expect(mock.history.post[0].url).toBe(ORDER_ACTS);
    expect(JSON.parse(mock.history.post[0].data)).toEqual(payload);
    // no documents upload attempted
    expect(mock.history.post.filter((r) => r.url === ORDER_ACT_DOCUMENTS(100))).toHaveLength(0);
  });

  it('uploads attached files as multipart to the documents endpoint after create', async () => {
    mock.onPost(ORDER_ACTS).reply(201, { id: 200 });
    mock.onPost(ORDER_ACT_DOCUMENTS(200)).reply(200, {});
    const payload = {
      category_id: 1,
      summary: null,
      description: 'x',
      submitter_id: null,
      familiarizer_department_ids: [],
      assigned_signers: [],
      organization_branch_id: 9,
    };
    const id = await createOrder(payload, [{ uri: 'file:///a.pdf', name: 'a.pdf', mimeType: 'application/pdf' }]);
    expect(id).toBe(200);
    const docReq = mock.history.post.find((r) => r.url === ORDER_ACT_DOCUMENTS(200));
    expect(docReq).toBeTruthy();
    expect(docReq!.data instanceof FormData).toBe(true);
  });

  it('still resolves (and calls onFilesError) when the file upload fails', async () => {
    mock.onPost(ORDER_ACTS).reply(201, { id: 300 });
    mock.onPost(ORDER_ACT_DOCUMENTS(300)).reply(500);
    const onFilesError = jest.fn();
    const payload = {
      category_id: 1,
      summary: null,
      description: 'x',
      submitter_id: null,
      familiarizer_department_ids: [],
      assigned_signers: [],
      organization_branch_id: 9,
    };
    const id = await createOrder(payload, [{ uri: 'file:///a.pdf', name: 'a.pdf' }], onFilesError);
    expect(id).toBe(300);
    expect(onFilesError).toHaveBeenCalledTimes(1);
  });
});


// Regression: bu ikki amal mobilда yo'q edi — mobilда yaratilgan buyruq DRAFTда
// qolib ketardi va uni tahrirlab ham bo'lmasdi.
describe('submitDecree (qoralamani oqimga yuborish)', () => {
  it('TANASIZ POST decree/submit', async () => {
    mock.onPost(ORDER_ACT_DECREE_SUBMIT(31)).reply(200, { id: 31, status: 'pending_approval' });
    const data = await submitDecree(31);
    expect(data).toEqual({ id: 31, status: 'pending_approval' });
    expect(mock.history.post[0].url).toBe(ORDER_ACT_DECREE_SUBMIT(31));
    expect(mock.history.post[0].data).toBeUndefined();
  });
});

describe('updateOrder (tahrirlash)', () => {
  it('PATCH /order-acts/{id} qiladi', async () => {
    mock.onPatch(ORDER_ACT_DETAIL(32)).reply(200, { id: 32 });
    const id = await updateOrder(32, { description: 'tuzatildi' });
    expect(id).toBe(32);
    expect(mock.history.patch[0].url).toBe(ORDER_ACT_DETAIL(32));
    expect(JSON.parse(mock.history.patch[0].data)).toEqual({ description: 'tuzatildi' });
    expect(mock.history.post).toHaveLength(0);
  });

  it('fayllar berilsa ularni documents endpointiga yuklaydi', async () => {
    mock.onPatch(ORDER_ACT_DETAIL(33)).reply(200, { id: 33 });
    mock.onPost(ORDER_ACT_DOCUMENTS(33)).reply(200, {});
    await updateOrder(33, { description: 'x' }, [{ uri: 'file:///a.pdf', name: 'a.pdf' }]);
    const up = mock.history.post.find((r) => r.url === ORDER_ACT_DOCUMENTS(33));
    expect(up).toBeTruthy();
    expect(up!.data instanceof FormData).toBe(true);
  });
});
