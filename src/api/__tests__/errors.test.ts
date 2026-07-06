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
    expect(getApiErrorMessage(axiosErrorWith({}))).toBe('Xatolik yuz berdi');
    expect(getApiErrorMessage(new Error('x'))).toBe('Xatolik yuz berdi');
    expect(getApiErrorMessage(null)).toBe('Xatolik yuz berdi');
  });

  it('honors a custom fallback', () => {
    expect(getApiErrorMessage(null, 'Saqlashda xatolik')).toBe('Saqlashda xatolik');
  });

  it('ignores a non-string array msg and uses the fallback', () => {
    const e = axiosErrorWith({ detail: [{ loc: ['x'] }] });
    expect(getApiErrorMessage(e)).toBe('Xatolik yuz berdi');
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
