import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import {
  LETTER_CREATE, LETTER_SIGN, LETTER_REJECT, LETTER_UPLOAD_ATTACHMENT,
  LETTER_SUBMIT_REPORT, LETTER_RESET_REPORT, LETTER_UPLOAD_REPORT,
} from '@/api/urls';
import { signLetter, rejectLetter, createLetter, submitReport, resetReport, uploadReport } from '../mutations';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('letter sign/reject request functions', () => {
  it('signLetter POSTs the sign endpoint with an empty body', async () => {
    mock.onPost(LETTER_SIGN(5)).reply(200, { id: 5, status: 'signed' });
    const data = await signLetter(5);
    expect(data).toEqual({ id: 5, status: 'signed' });
    expect(mock.history.post[0].url).toBe(LETTER_SIGN(5));
    // no request body sent (matches the old apiClient.post(LETTER_SIGN(id)))
    expect(mock.history.post[0].data).toBeUndefined();
  });

  it('rejectLetter POSTs the reject endpoint with an empty body', async () => {
    mock.onPost(LETTER_REJECT(8)).reply(200, { id: 8, status: 'rejected' });
    const data = await rejectLetter(8);
    expect(data).toEqual({ id: 8, status: 'rejected' });
    expect(mock.history.post[0].url).toBe(LETTER_REJECT(8));
    expect(mock.history.post[0].data).toBeUndefined();
  });
});

describe('createLetter', () => {
  it('POSTs the payload and returns the new letter id when there are no files', async () => {
    mock.onPost(LETTER_CREATE).reply(201, { id: 100 });
    const payload = { letter_type: 'explanatory', organization_branch_id: 9 };
    const id = await createLetter(payload);
    expect(id).toBe(100);
    expect(mock.history.post[0].url).toBe(LETTER_CREATE);
    expect(JSON.parse(mock.history.post[0].data)).toEqual(payload);
    // no attachment upload attempted
    expect(mock.history.post.filter((r) => r.url === LETTER_UPLOAD_ATTACHMENT(100))).toHaveLength(0);
  });

  it('uploads a single attachment as multipart to the upload-attachment endpoint after create', async () => {
    mock.onPost(LETTER_CREATE).reply(201, { id: 200 });
    mock.onPost(LETTER_UPLOAD_ATTACHMENT(200)).reply(200, {});
    const id = await createLetter({ letter_type: 'application' }, [
      { uri: 'file:///a.pdf', name: 'a.pdf', mimeType: 'application/pdf' },
    ]);
    expect(id).toBe(200);
    const upReq = mock.history.post.find((r) => r.url === LETTER_UPLOAD_ATTACHMENT(200));
    expect(upReq).toBeTruthy();
    expect(upReq!.data instanceof FormData).toBe(true);
  });

  it('still resolves (and calls onFilesError) when the attachment upload fails', async () => {
    mock.onPost(LETTER_CREATE).reply(201, { id: 300 });
    mock.onPost(LETTER_UPLOAD_ATTACHMENT(300)).reply(500);
    const onFilesError = jest.fn();
    const id = await createLetter({ letter_type: 'business_trip' }, [{ uri: 'file:///a.pdf', name: 'a.pdf' }], onFilesError);
    expect(id).toBe(300);
    expect(onFilesError).toHaveBeenCalledTimes(1);
  });
});

describe('trip report request functions', () => {
  it('submitReport POSTs the 4-field body, empty strings normalized to null (report_content kept)', async () => {
    mock.onPost(LETTER_SUBMIT_REPORT(5)).reply(200, { id: 5, status: 'report_submitted' });
    const data = await submitReport(5, {
      report_date: '2026-07-16',
      report_summary: '',
      report_task: 'inspection',
      report_content: 'went and did the thing',
    });
    expect(data).toEqual({ id: 5, status: 'report_submitted' });
    expect(mock.history.post[0].url).toBe(LETTER_SUBMIT_REPORT(5));
    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      report_date: '2026-07-16',
      report_summary: null,
      report_task: 'inspection',
      report_content: 'went and did the thing',
    });
  });

  it('submitReport sends report_number is never included (auto-assigned by backend)', async () => {
    mock.onPost(LETTER_SUBMIT_REPORT(5)).reply(200, {});
    await submitReport(5, { report_content: 'x' });
    const body = JSON.parse(mock.history.post[0].data);
    expect(body).not.toHaveProperty('report_number');
    expect(body.report_content).toBe('x');
    // omitted optional fields go out as null (web parity)
    expect(body.report_date).toBeNull();
  });

  it('resetReport POSTs the reset endpoint with an empty body', async () => {
    mock.onPost(LETTER_RESET_REPORT(9)).reply(200, { id: 9, status: 'management_approved' });
    const data = await resetReport(9);
    expect(data).toEqual({ id: 9, status: 'management_approved' });
    expect(mock.history.post[0].data).toBeUndefined();
  });

  it('uploadReport posts a single file as multipart', async () => {
    mock.onPost(LETTER_UPLOAD_REPORT(11)).reply(200, { id: 11, status: 'report_submitted' });
    await uploadReport(11, { uri: 'file:///r.pdf', name: 'r.pdf', mimeType: 'application/pdf' });
    const req = mock.history.post.find((r) => r.url === LETTER_UPLOAD_REPORT(11));
    expect(req).toBeTruthy();
    expect(req!.data instanceof FormData).toBe(true);
  });
});
