import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import {
  LETTER_CREATE, LETTER_SIGN, LETTER_REJECT, LETTER_UPLOAD_ATTACHMENT,
  LETTER_SUBMIT_REPORT, LETTER_RESET_REPORT, LETTER_UPLOAD_REPORT,
  LETTER_CONFIRM_RETURN, LETTER_SELF_CONFIRM_RETURN, LETTER_RETURN_DATE, LETTER_SUBMIT_TRIP,
  LETTER_APPROVE_REPORT, LETTER_APPROVE_GUVOHNOMA,
  LETTER_CONFIRM_REGISTRATION,
  LETTER_AGREE, LETTER_DISAGREE, LETTER_SUBMIT_AGREEMENT, LETTER_SEND_TO_REGISTRY,
  LETTER_APPROVE_TRIP_REGISTRATION,
  LETTER_RETURN, LETTER_RETURN_REPORT, LETTER_CANCEL_TRIP, LETTER_DETAIL,
} from '@/api/urls';
import {
  signLetter, rejectLetter, createLetter, submitReport, resetReport, uploadReport,
  confirmReturn, selfConfirmReturn, updateReturnDate, submitTrip, approveReport, approveGuvohnoma,
  confirmRegistration, agreeLetter, disagreeLetter, submitAgreementLetter, sendLetterToRegistry,
  approveTripRegistration,
  returnLetter, returnReport, cancelTrip, deleteLetter,
} from '../mutations';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('selfConfirmReturn (xodim safarni O\'ZI yakunlaydi)', () => {
  it('TANASIZ POST yuboradi — qaytish sanasini SERVER (Face ID) qo\'yadi', async () => {
    mock.onPost(LETTER_SELF_CONFIRM_RETURN(7)).reply(200, { id: 7, is_trip_confirmed: true });
    const data = await selfConfirmReturn(7);
    expect(data).toEqual({ id: 7, is_trip_confirmed: true });
    expect(mock.history.post[0].url).toBe(LETTER_SELF_CONFIRM_RETURN(7));
    // Sana YUBORILMAYDI: mijoz uni tanlay olsa "hali qaytmasdan" yakunlash
    // mumkin bo'lardi — server turniket sanasini o'zi qo'yadi.
    expect(mock.history.post[0].data).toBe('{}');
  });

  it('server Face ID shartini bajarmasa 400 ni yuqoriga uzatadi', async () => {
    mock.onPost(LETTER_SELF_CONFIRM_RETURN(8)).reply(400, {
      code: 'face_id_required',
      message: "Safarni yakunlash uchun avval o'z filialingiz turniketidan (Face ID) o'ting",
    });
    await expect(selfConfirmReturn(8)).rejects.toBeDefined();
  });
});

describe('updateReturnDate (KADR kelgan sanani tuzatadi)', () => {
  it('PATCH bilan faqat return_date yuboradi', async () => {
    mock.onPatch(LETTER_RETURN_DATE(9)).reply(200, { id: 9, actual_return_date: '2026-08-17' });
    const data = await updateReturnDate(9, '2026-08-17');
    expect(data).toEqual({ id: 9, actual_return_date: '2026-08-17' });
    expect(mock.history.patch[0].url).toBe(LETTER_RETURN_DATE(9));
    expect(JSON.parse(mock.history.patch[0].data)).toEqual({ return_date: '2026-08-17' });
  });
});

// BILDIRGI/ARIZA kelishuv oqimi — mobilда umuman yo'q edi (imzo tugmasi esa
// backendда 400 `use_agreement_flow` berardi).
describe('kelishuv (agreement) so\'rovlari', () => {
  it('agree/disagree izohni tanada yuboradi (backend uni MAJBURIY qiladi)', async () => {
    mock.onPost(LETTER_AGREE(3)).reply(200, { id: 3, status: 'signed' });
    await agreeLetter(3, 'Kelishildi');
    expect(mock.history.post[0].url).toBe(LETTER_AGREE(3));
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ comment: 'Kelishildi' });

    mock.onPost(LETTER_DISAGREE(3)).reply(200, { id: 3, status: 'rejected' });
    await disagreeLetter(3, 'Xato bor');
    expect(JSON.parse(mock.history.post[1].data)).toEqual({ comment: 'Xato bor' });
  });

  it('submit-agreement va send-to-registry TANASIZ POST', async () => {
    mock.onPost(LETTER_SUBMIT_AGREEMENT(4)).reply(200, { id: 4, status: 'pending_agreement' });
    mock.onPost(LETTER_SEND_TO_REGISTRY(4)).reply(200, { id: 4, status: 'pending_registration' });
    await submitAgreementLetter(4);
    await sendLetterToRegistry(4);
    expect(mock.history.post[0].url).toBe(LETTER_SUBMIT_AGREEMENT(4));
    expect(mock.history.post[0].data).toBeUndefined();
    expect(mock.history.post[1].url).toBe(LETTER_SEND_TO_REGISTRY(4));
  });
});

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

describe('confirmReturn request function', () => {
  it('confirmReturn POSTs { return_date, note } to the confirm-return endpoint', async () => {
    mock.onPost(LETTER_CONFIRM_RETURN(5)).reply(200, { id: 5, is_trip_confirmed: true });
    const data = await confirmReturn(5, { return_date: '2026-07-20', note: 'keldi' });
    expect(data).toEqual({ id: 5, is_trip_confirmed: true });
    expect(mock.history.post[0].url).toBe(LETTER_CONFIRM_RETURN(5));
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ return_date: '2026-07-20', note: 'keldi' });
  });

  it('confirmReturn omits note when not provided (sends null)', async () => {
    mock.onPost(LETTER_CONFIRM_RETURN(5)).reply(200, {});
    await confirmReturn(5, { return_date: '2026-07-20' });
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ return_date: '2026-07-20', note: null });
  });
});

describe('confirmRegistration request function', () => {
  it('POSTs the edited number + date to the confirm-registration endpoint', async () => {
    mock.onPost(LETTER_CONFIRM_REGISTRATION(8)).reply(200, { id: 8, status: 'registered' });
    const data = await confirmRegistration(8, { registered_number: '17-1', registered_date: '2026-07-20' });
    expect(data).toEqual({ id: 8, status: 'registered' });
    expect(mock.history.post[0].url).toBe(LETTER_CONFIRM_REGISTRATION(8));
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ registered_number: '17-1', registered_date: '2026-07-20' });
  });

  it('omits an empty number so the backend keeps the auto-assigned value', async () => {
    mock.onPost(LETTER_CONFIRM_REGISTRATION(8)).reply(200, {});
    await confirmRegistration(8, { registered_number: '', registered_date: null });
    expect(JSON.parse(mock.history.post[0].data)).toEqual({});
  });
});

describe('submitTrip', () => {
  it('POSTs the submit-trip endpoint with an empty body (draft → pending)', async () => {
    mock.onPost(LETTER_SUBMIT_TRIP(9)).reply(200, { id: 9, status: 'pending' });
    const data = await submitTrip(9);
    expect(data).toEqual({ id: 9, status: 'pending' });
    expect(mock.history.post[0].url).toBe(LETTER_SUBMIT_TRIP(9));
    expect(mock.history.post[0].data).toBeUndefined();
  });
});

describe('trip approve request functions (leadership)', () => {
  it('approveReport POSTs approve-report with an empty body', async () => {
    mock.onPost(LETTER_APPROVE_REPORT(4)).reply(200, { id: 4, status: 'report_guvohnoma_review' });
    await approveReport(4);
    expect(mock.history.post[0].url).toBe(LETTER_APPROVE_REPORT(4));
    expect(mock.history.post[0].data).toBeUndefined();
  });

  it('approveGuvohnoma POSTs approve-guvohnoma with an empty body', async () => {
    mock.onPost(LETTER_APPROVE_GUVOHNOMA(4)).reply(200, { id: 4, status: 'report_approved' });
    await approveGuvohnoma(4);
    expect(mock.history.post[0].url).toBe(LETTER_APPROVE_GUVOHNOMA(4));
    expect(mock.history.post[0].data).toBeUndefined();
  });
});


// Devonxona ro'yxatidan keyingi RAHBAR tasdig'i — mobilda umuman yo'q edi.
describe('approveTripRegistration', () => {
  it('TANASIZ POST yuboradi (registered_pending_rahbar → management_approved)', async () => {
    mock.onPost(LETTER_APPROVE_TRIP_REGISTRATION(11)).reply(200, { id: 11, status: 'management_approved' });
    const data = await approveTripRegistration(11);
    expect(data).toEqual({ id: 11, status: 'management_approved' });
    expect(mock.history.post[0].url).toBe(LETTER_APPROVE_TRIP_REGISTRATION(11));
  });
});


// Devonxona/KADR amallari — mobilда umuman yo'q edi.
describe('devonxona / KADR amallari', () => {
  it('returnLetter sababni tanada yuboradi (backend uni MAJBURIY qiladi)', async () => {
    mock.onPost(LETTER_RETURN(12)).reply(200, { id: 12, status: 'returned' });
    const data = await returnLetter(12, 'Raqam xato');
    expect(data).toEqual({ id: 12, status: 'returned' });
    expect(mock.history.post[0].url).toBe(LETTER_RETURN(12));
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ reason: 'Raqam xato' });
  });

  it('returnReport sababni tanada yuboradi', async () => {
    mock.onPost(LETTER_RETURN_REPORT(13)).reply(200, { id: 13, status: 'report_returned' });
    await returnReport(13, "Hisobot to'liq emas");
    expect(mock.history.post[0].url).toBe(LETTER_RETURN_REPORT(13));
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ reason: "Hisobot to'liq emas" });
  });

  it('cancelTrip sabab IXTIYORIY — bo\'sh izohda BO\'SH tana yuboradi', async () => {
    mock.onPost(LETTER_CANCEL_TRIP(14)).reply(200, { id: 14, status: 'cancelled' });
    await cancelTrip(14, '   ');
    expect(JSON.parse(mock.history.post[0].data)).toEqual({});

    mock.resetHistory();
    await cancelTrip(14, 'Safar bekor');
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ reason: 'Safar bekor' });
  });

  it('deleteLetter DELETE /letters/{id} chaqiradi', async () => {
    mock.onDelete(LETTER_DETAIL(15)).reply(200, { detail: 'Letter deleted successfully' });
    await deleteLetter(15);
    expect(mock.history.delete[0].url).toBe(LETTER_DETAIL(15));
  });
});
