import MockAdapter from 'axios-mock-adapter';
import { Platform } from 'react-native';
import { apiClient } from '@/api/client';
import { SUPPORT_TICKETS, SUPPORT_TICKET_RATE, SUPPORT_TICKET_REOPEN } from '@/api/urls';
import { createTicket, rateTicket, reopenTicket } from '../mutations';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('support ticket request functions', () => {
  it('createTicket POSTs multipart FormData with the required fields', async () => {
    mock.onPost(SUPPORT_TICKETS).reply(201, { id: 42, status: 'open' });
    const ticket = await createTicket({ priority: 'normal', description: 'printer ishlamayapti' });
    expect(ticket).toEqual({ id: 42, status: 'open' });
    const req = mock.history.post[0];
    expect(req.url).toBe(SUPPORT_TICKETS);
    expect(req.data instanceof FormData).toBe(true);
  });

  it('createTicket attaches files under the `files` field', async () => {
    mock.onPost(SUPPORT_TICKETS).reply(201, { id: 43 });
    await createTicket(
      { priority: 'urgent', description: 'x', uge_number: 'UGE-1', room_number: '204' },
      [{ uri: 'file:///a.jpg', name: 'a.jpg', mimeType: 'image/jpeg' }],
    );
    const req = mock.history.post[0];
    expect(req.data instanceof FormData).toBe(true);
    expect(req.headers?.['Content-Type']).toBe('multipart/form-data');
  });

  // QA (web): `{ uri, name, type }` obyekti brauzer FormData'sida "[object Object]"
  // matniga aylanib, server 422 qaytarardi. Vebda haqiqiy Blob ketishi kerak.
  it('createTicket on web sends a real Blob part (not "[object Object]")', async () => {
    const realOS = Platform.OS;
    const realFetch = global.fetch;
    Platform.OS = 'web';
    global.fetch = jest.fn(async () => ({ blob: async () => new Blob(['jpeg']) })) as unknown as typeof fetch;
    try {
      mock.onPost(SUPPORT_TICKETS).reply(201, { id: 44 });
      const p = createTicket({ priority: 'low', description: 'x' }, [
        { uri: 'blob:http://localhost/a', name: 'a.jpg', mimeType: 'image/jpeg' },
      ]);
      // Platforma fayl qismi qo'shilayotganda (sinxron) tekshiriladi; so'rovning
      // o'zi (token o'qish) uchun platformani tiklaymiz — vebda u localStorage'ga boradi.
      Platform.OS = realOS;
      await p;
      const part = (mock.history.post[0].data as FormData).get('files') as File;
      expect(part).toBeInstanceOf(Blob);
      expect(part.name).toBe('a.jpg');
      expect(part.type).toBe('image/jpeg');
    } finally {
      Platform.OS = realOS;
      global.fetch = realFetch;
    }
  });

  it('rateTicket POSTs { rating, note } to the rate endpoint', async () => {
    mock.onPost(SUPPORT_TICKET_RATE(7)).reply(200, { id: 7, status: 'rated' });
    const data = await rateTicket(7, { rating: 5, note: 'rahmat' });
    expect(data).toEqual({ id: 7, status: 'rated' });
    expect(mock.history.post[0].url).toBe(SUPPORT_TICKET_RATE(7));
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ rating: 5, note: 'rahmat' });
  });

  it('rateTicket omits note when not given (sends null)', async () => {
    mock.onPost(SUPPORT_TICKET_RATE(7)).reply(200, {});
    await rateTicket(7, { rating: 4 });
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ rating: 4, note: null });
  });

  it('reopenTicket POSTs the reopen endpoint with an empty body', async () => {
    mock.onPost(SUPPORT_TICKET_REOPEN(9)).reply(200, { id: 9, status: 'in_progress' });
    const data = await reopenTicket(9);
    expect(data).toEqual({ id: 9, status: 'in_progress' });
    expect(mock.history.post[0].url).toBe(SUPPORT_TICKET_REOPEN(9));
  });
});
