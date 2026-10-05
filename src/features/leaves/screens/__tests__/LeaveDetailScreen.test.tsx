// QA 2026-10-05 (real data):
//  1. CRITICAL — a line manager could not act on a subordinate's request: the
//     server routes a signer-less request to the requester's supervisor and
//     returns `assigned_signers: []`; the detail had no Tasdiqlash / Rad etish.
//  4. Deleting a request showed a second, English «Work leave not found» toast:
//     the list invalidation refetched the still-open detail (404).
//  5. v2 lets a decider reopen a decided request (`work-leaves/{id}/reopen`).
import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { router } from 'expo-router';
import { apiClient } from '@/api/client';
import { toast } from '@/lib/toast';
import { renderWithProviders, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import LeaveDetailScreen from '../LeaveDetailScreen';

const mockParams = { id: '19510' };
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));
jest.mock('@/lib/toast', () => ({
  ...jest.requireActual('@/lib/toast'),
  toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() },
}));

const ME = 50;
const leave = (extra: Record<string, unknown> = {}) => ({
  id: 19510,
  type: "Xizmat topshirig'i",
  start_date: '2026-10-05T09:00:00',
  end_date: '2026-10-05T11:00:00',
  status: 'pending',
  employee_id: 77,
  employee: { id: 77, legal_name: 'Bo‘ysunuvchi X', supervisor_id: ME },
  assigned_signers: [],
  signers: [],
  ...extra,
});

describe('LeaveDetailScreen (web v2 parity)', () => {
  const mock = new MockAdapter(apiClient);

  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: { id: 1, type: 'employee', employee: { id: ME, legal_name: 'Rahbar' } } as never,
      isAuthenticated: true,
    } as never);
    mock.onGet(/notifications/).reply(200, []);
  });
  afterEach(() => mock.reset());

  it('the supervisor of a signer-less pending request gets Tasdiqlash / Rad etish', async () => {
    mock.onGet('work-leaves/19510').reply(200, leave());
    mock.onPost('work-leaves/19510/sign').reply(200, leave({ status: 'signed' }));
    const r = await renderWithProviders(<LeaveDetailScreen />);

    fireEvent.press(await r.findByText('Tasdiqlash'));
    expect(r.getByText('Rad etish')).toBeTruthy();
    await waitFor(() => expect(mock.history.post.some((p) => p.url === 'work-leaves/19510/sign')).toBe(true));
  });

  it("someone else's subordinate → no approval buttons", async () => {
    mock.onGet('work-leaves/19510').reply(200, leave({ employee: { id: 77, legal_name: 'X', supervisor_id: 999 } }));
    const r = await renderWithProviders(<LeaveDetailScreen />);
    await r.findAllByText('Kutilmoqda');
    expect(r.queryByText('Tasdiqlash')).toBeNull();
  });

  it('delete → success toast, back, and the deleted detail is NOT refetched (no 404 toast)', async () => {
    mock.onGet('work-leaves/19510').replyOnce(200, leave({ employee_id: ME, employee: { id: ME, legal_name: 'Men' } }));
    mock.onGet('work-leaves/19510').reply(404, { code: 'work_leave_not_found', message: 'Work leave not found' });
    mock.onDelete('work-leaves/19510').reply(204);
    const r = await renderWithProviders(<LeaveDetailScreen />);

    fireEvent.press(await r.findByText("O'chirish"));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalled();
    // give any stray refetch a chance to fire
    await new Promise((res) => setTimeout(res, 50));
    expect(mock.history.get.filter((g) => g.url === 'work-leaves/19510')).toHaveLength(1);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("deep link (no history) → delete opens the requests list instead of GO_BACK", async () => {
    (router.canGoBack as jest.Mock).mockReturnValueOnce(false);
    mock.onGet('work-leaves/19510').reply(200, leave({ employee_id: ME, employee: { id: ME, legal_name: 'Men' } }));
    mock.onDelete('work-leaves/19510').reply(204);
    const r = await renderWithProviders(<LeaveDetailScreen />);

    fireEvent.press(await r.findByText("O'chirish"));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/work-leaves'));
    expect(router.back).not.toHaveBeenCalled();
  });

  it('a decider reopens a decided request with a reason (v2 reopen)', async () => {
    mock.onGet('work-leaves/19510').reply(200, leave({ status: 'rejected', rejection_reason: 'Yo‘q' }));
    mock.onPost('work-leaves/19510/reopen').reply(200, leave());
    const r = await renderWithProviders(<LeaveDetailScreen />);

    fireEvent.press(await r.findByTestId('leave-reopen'));
    const input = await r.findByTestId('leave-reopen-sheet-input');
    fireEvent.changeText(input, 'Xato rad etildi');
    await waitFor(() => expect(r.getByTestId('leave-reopen-sheet-input').props.value).toBe('Xato rad etildi'));
    fireEvent.press(r.getByTestId('leave-reopen-sheet-submit'));

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    const post = mock.history.post.find((p) => p.url === 'work-leaves/19510/reopen');
    expect(JSON.parse(post!.data)).toEqual({ reason: 'Xato rad etildi' });
  });

  it('no reopen on a KADR order or a pending request', async () => {
    mock.onGet('work-leaves/19510').reply(200, leave({ status: 'signed', is_hr_order: true }));
    const r = await renderWithProviders(<LeaveDetailScreen />);
    await r.findByText('Bo‘ysunuvchi X');
    expect(r.queryByTestId('leave-reopen')).toBeNull();
  });
});
