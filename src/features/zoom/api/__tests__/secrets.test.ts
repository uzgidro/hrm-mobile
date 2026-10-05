import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { ZOOM_MEETING, ZOOM_MEETING_APPROVE } from '@/api/urls';
import { approveZoomMeeting, cancelZoomMeeting } from '../mutations';
import { stripSecrets } from '../queries';

describe('zoom secrets', () => {
  const mock = new MockAdapter(apiClient);
  afterEach(() => mock.reset());

  it("stripSecrets — host_key olib tashlanadi, null/bo'sh javob buzilmaydi", () => {
    expect(stripSecrets({ id: 1, status: 'approved', host_key: '123456', host_key_at: 'x' })).toEqual({
      id: 1,
      status: 'approved',
    });
    expect(stripSecrets(null)).toBeNull();
    expect(stripSecrets(undefined)).toBeUndefined();
  });

  it("mutatsiya javobi host_key siz qaytadi; bo'sh DELETE javobi xato emas", async () => {
    mock.onPost(ZOOM_MEETING_APPROVE(5)).reply(200, { id: 5, status: 'approved', host_key: '654321' });
    mock.onDelete(ZOOM_MEETING(5)).reply(204, '');
    expect(await approveZoomMeeting(5)).toEqual({ id: 5, status: 'approved' });
    await expect(cancelZoomMeeting(5)).resolves.toBe('');
  });
});
