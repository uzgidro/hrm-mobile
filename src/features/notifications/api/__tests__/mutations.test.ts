import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { NOTIFICATION_READ, NOTIFICATIONS_READ_ALL } from '@/api/urls';
import { markNotificationRead, markAllNotificationsRead } from '../mutations';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('notification request functions', () => {
  it('markNotificationRead POSTs notifications/:id/read', async () => {
    mock.onPost(NOTIFICATION_READ(4)).reply(200);
    await expect(markNotificationRead(4)).resolves.toBeUndefined();
    expect(mock.history.post[0].url).toBe(NOTIFICATION_READ(4));
  });

  it('markAllNotificationsRead POSTs the read-all endpoint', async () => {
    mock.onPost(NOTIFICATIONS_READ_ALL).reply(200);
    await expect(markAllNotificationsRead()).resolves.toBeUndefined();
    expect(mock.history.post[0].url).toBe(NOTIFICATIONS_READ_ALL);
  });

  it('markNotificationRead rejects when the request fails', async () => {
    mock.onPost(NOTIFICATION_READ(9)).reply(500, { detail: 'boom' });
    await expect(markNotificationRead(9)).rejects.toBeDefined();
  });
});
