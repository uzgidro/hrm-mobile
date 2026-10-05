import { AxiosError } from 'axios';
import { getApiErrorMessage, toApiError } from '../errors';

function axiosErrorWith(data: unknown, status = 400): AxiosError {
  const err = new AxiosError('Request failed');
  err.response = { data, status, statusText: '', headers: {}, config: {} as any };
  return err;
}

describe('getApiErrorMessage', () => {
  it('reads a plain string `detail` (FastAPI error)', () => {
    expect(getApiErrorMessage(axiosErrorWith({ detail: 'Ruxsat yo‘q' }))).toBe('Ruxsat yo‘q');
  });

  it('reads the first msg of an array `detail` (FastAPI validation)', () => {
    const e = axiosErrorWith({ detail: [{ msg: 'field required', loc: ['body', 'x'] }] });
    expect(getApiErrorMessage(e)).toBe('field required');
  });

  it('falls back to a `message` field when there is no detail', () => {
    expect(getApiErrorMessage(axiosErrorWith({ message: 'Boom' }))).toBe('Boom');
  });

  it('uses the default fallback for an empty/omitted body', () => {
    // Tana bo'sh bo'lsa ham HOLAT KODI qo'shiladi — sababsiz "Xatolik" hech
    // narsa demaydi (foydalanuvchi hisoboti: kelishuvda "shunchaki Xato").
    expect(getApiErrorMessage(axiosErrorWith({}))).toBe('Xatolik yuz berdi (400)');
    expect(getApiErrorMessage(new Error('x'))).toBe('Xatolik yuz berdi');
    expect(getApiErrorMessage(null)).toBe('Xatolik yuz berdi');
  });

  it('honors a custom fallback', () => {
    expect(getApiErrorMessage(null, 'Saqlashda xatolik')).toBe('Saqlashda xatolik');
  });

  it('ignores a non-string array msg and uses the fallback', () => {
    const e = axiosErrorWith({ detail: [{ loc: ['x'] }] });
    expect(getApiErrorMessage(e)).toBe('Xatolik yuz berdi (400)');
  });

  // ── Sababsiz "Xatolik" ni bartaraf etuvchi holatlar ────────────────────────

  it('reads an OBJECT detail ({code, message})', () => {
    const e = axiosErrorWith({ detail: { code: 'x', message: 'Kelishuvchi emassiz' } }, 403);
    expect(getApiErrorMessage(e)).toBe('Kelishuvchi emassiz');
  });

  // v2 `errorMessage` GENERIC_CODES: o'ram kodlar uchun serverning aniq jumlasi — tarjima emas.
  it('shows the server sentence for a generic wrapper code (validation_error/bad_request/conflict)', () => {
    const v = axiosErrorWith({ code: 'validation_error', message: 'Bu doktor turi sizga biriktirilmagan' }, 422);
    expect(getApiErrorMessage(v)).toBe('Bu doktor turi sizga biriktirilmagan');
    const c = axiosErrorWith({ code: 'conflict', detail: 'Muddatlar kesishmoqda' }, 409);
    expect(getApiErrorMessage(c)).toBe('Muddatlar kesishmoqda');
    const b = axiosErrorWith({ detail: { code: 'bad_request', message: 'Noma\'lum davr turi' } }, 400);
    expect(getApiErrorMessage(b)).toBe("Noma'lum davr turi");
  });

  it('translates a generic code when the server sent only the bare i18n key', () => {
    const e = axiosErrorWith({ code: 'validation_error', message: 'errors.validation_error' }, 422);
    expect(getApiErrorMessage(e)).toBe("Kiritilgan ma'lumot noto'g'ri");
  });

  it('still translates a specific code over the server prose', () => {
    const e = axiosErrorWith({ code: 'forbidden', message: 'Access denied' }, 403);
    expect(getApiErrorMessage(e)).toBe("Ruxsat yo'q");
  });

  it('translates the *_not_found codes instead of the English server sentence (QA)', () => {
    const body = (code: string, message: string) => ({ code, i18n_key: `errors.${code}`, params: {}, message });
    expect(getApiErrorMessage(axiosErrorWith(body('letter_not_found', 'Letter not found'), 404))).toBe('Hujjat topilmadi');
    expect(getApiErrorMessage(axiosErrorWith(body('work_leave_not_found', 'Work leave not found'), 404))).toBe(
      'Ruxsatnoma topilmadi'
    );
    expect(getApiErrorMessage(axiosErrorWith(body('visitor_not_found', 'Visitor not found'), 404))).toBe('Mehmon topilmadi');
    expect(getApiErrorMessage(axiosErrorWith(body('workspace_not_found', 'Workspace not found'), 404))).toBe(
      'Loyiha topilmadi'
    );
  });

  it('shows the status when the gateway returns an HTML page (502/504)', () => {
    const e = axiosErrorWith('<html><body>502 Bad Gateway</body></html>', 502);
    expect(getApiErrorMessage(e)).toBe('Xatolik yuz berdi (502)');
  });

  it('shows a plain-text error body as-is', () => {
    expect(getApiErrorMessage(axiosErrorWith('upstream timed out', 504)))
      .toBe('upstream timed out');
  });

  it('says the server did not answer on a timeout', () => {
    const e = new AxiosError('timeout of 30000ms exceeded');
    e.code = 'ECONNABORTED';
    expect(getApiErrorMessage(e)).toMatch(/vaqt tugadi/i);
  });

  it('says there is no connection on a network error', () => {
    const e = new AxiosError('Network Error');
    e.code = 'ERR_NETWORK';
    expect(getApiErrorMessage(e)).toMatch(/Internet aloqasi/i);
  });
});

describe('toApiError', () => {
  it('captures status, message and detail', () => {
    const e = axiosErrorWith({ detail: 'nope' }, 403);
    const api = toApiError(e);
    expect(api.status).toBe(403);
    expect(api.message).toBe('nope');
    expect(api.detail).toBe('nope');
    expect(api.original).toBe(e);
  });

  it('handles non-axios errors', () => {
    const raw = new Error('local');
    const api = toApiError(raw);
    expect(api.status).toBeUndefined();
    expect(api.message).toBe('Xatolik yuz berdi');
    expect(api.original).toBe(raw);
  });
});
