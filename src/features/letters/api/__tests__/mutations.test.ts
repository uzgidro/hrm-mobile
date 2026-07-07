import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { LETTER_CREATE, LETTER_SIGN, LETTER_REJECT, LETTER_UPLOAD_ATTACHMENT } from '@/api/urls';
import { signLetter, rejectLetter, createLetter } from '../mutations';

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
