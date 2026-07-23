import MockAdapter from 'axios-mock-adapter';
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
