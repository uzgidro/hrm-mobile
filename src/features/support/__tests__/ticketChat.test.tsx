import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { SUPPORT_TICKET_MESSAGES, SUPPORT_TICKET_READ } from '@/api/urls';
import { renderWithProviders, fireEvent, waitFor } from '@/test/renderWithProviders';
import { TicketChat } from '../components/TicketChat';

// AKT ↔ murojaatchi yozishmasi backendда 2026-08-16 dan beri bor, mobilда esa
// umuman ko'rinmasdi — AKT xodimi tafsilot so'ray olmasdi.
describe('TicketChat', () => {
  let mock: MockAdapter;
  beforeEach(() => { mock = new MockAdapter(apiClient); });
  afterEach(() => mock.restore());

  it('xabarlarni ko\'rsatadi va ochilganda O\'QILGAN deb belgilaydi', async () => {
    mock.onGet(SUPPORT_TICKET_MESSAGES(5)).reply(200, [
      { id: 1, body: 'Printer ishlamayapti', author: { id: 2, legal_name: 'Xodim X' }, created_at: '2026-08-20T09:00:00' },
      { id: 2, body: "AKT yozishmaga qo'shildi", is_system: true, created_at: '2026-08-20T09:01:00' },
    ]);
    mock.onPost(SUPPORT_TICKET_READ(5)).reply(204);
    const { getByText } = await renderWithProviders(<TicketChat ticketId={5} />);
    await waitFor(() => getByText('Printer ishlamayapti'));
    getByText('Xodim X');
    getByText("AKT yozishmaga qo'shildi");
    await waitFor(() =>
      expect(mock.history.post.some((r) => r.url === SUPPORT_TICKET_READ(5))).toBe(true),
    );
  });

  it('xabar yuboradi', async () => {
    mock.onGet(SUPPORT_TICKET_MESSAGES(6)).reply(200, []);
    mock.onPost(SUPPORT_TICKET_READ(6)).reply(204);
    mock.onPost(SUPPORT_TICKET_MESSAGES(6)).reply(201, { id: 9, body: 'Bugun kelamiz' });
    const { getByTestId } = await renderWithProviders(<TicketChat ticketId={6} />);
    fireEvent.changeText(getByTestId('ticket-chat-input'), 'Bugun kelamiz');
    // Matn holatga tushgach tugma yoqiladi (bo'sh matnda `disabled`), shuning
    // uchun bosishdan oldin qayta so'raymiz.
    await waitFor(() => expect(getByTestId('ticket-chat-input').props.value).toBe('Bugun kelamiz'));
    fireEvent.press(getByTestId('ticket-chat-send'));
    await waitFor(() => {
      const sent = mock.history.post.find((r) => r.url === SUPPORT_TICKET_MESSAGES(6));
      expect(sent && JSON.parse(sent.data)).toEqual({ body: 'Bugun kelamiz' });
    });
  });

  it('bo\'sh xabar YUBORILMAYDI (backend ham rad etadi)', async () => {
    mock.onGet(SUPPORT_TICKET_MESSAGES(7)).reply(200, []);
    mock.onPost(SUPPORT_TICKET_READ(7)).reply(204);
    const { getByTestId } = await renderWithProviders(<TicketChat ticketId={7} />);
    fireEvent.changeText(getByTestId('ticket-chat-input'), '   ');
    fireEvent.press(getByTestId('ticket-chat-send'));
    expect(mock.history.post.filter((r) => r.url === SUPPORT_TICKET_MESSAGES(7))).toHaveLength(0);
  });
});
