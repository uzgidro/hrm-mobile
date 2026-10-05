// QA (web): the form used OS `Alert.alert`, which is a no-op on react-native-web —
// an empty «Izoh» gave NO feedback and a successful submit never closed the
// form (the success Alert's OK → router.back never fired). Validation is now
// inline, outcomes are toasts, and success navigates directly.
import React from 'react';
import { useWindowDimensions } from 'react-native';
import MockAdapter from 'axios-mock-adapter';
import { router } from 'expo-router';
import { apiClient } from '@/api/client';
import { toast } from '@/lib/toast';
import { renderWithProviders, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import CreateLeaveScreen from '../CreateLeaveScreen';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), replace: jest.fn() } }));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions');
jest.mock('@/lib/toast', () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));

describe('CreateLeaveScreen — web-safe feedback', () => {
  const mock = new MockAdapter(apiClient);

  beforeEach(() => {
    jest.clearAllMocks();
    (useWindowDimensions as jest.Mock).mockReturnValue({ width: 390, height: 844, scale: 3, fontScale: 1 });
    useAuthStore.setState({
      user: { type: 'employee', employee: { id: 1, legal_name: 'Test User', organization_branches: [{ id: 5 }] } } as never,
      isAuthenticated: true,
    } as never);
    mock.onGet('work-leaves/my-approvers').reply(200, []);
    mock.onGet('work-leaves/rules').reply(200, { max_days_back: 3, exempt: true });
    mock.onGet('dictionaries/leave_request_reasons/options').reply(200, []);
  });

  afterEach(() => mock.reset());

  it('empty «Izoh» → inline error under the field, nothing is sent', async () => {
    let sent = false;
    mock.onPost('work-leaves').reply(() => { sent = true; return [201, {}]; });
    const r = await renderWithProviders(<CreateLeaveScreen />);

    fireEvent.press(await r.findByTestId('leave-submit'));

    expect(await r.findByTestId('leave-description-error')).toBeTruthy();
    expect(sent).toBe(false);
    expect(router.back).not.toHaveBeenCalled();
  });

  it('success → toast + the form closes without waiting on a button', async () => {
    mock.onPost('work-leaves').reply(201, { id: 9 });
    const r = await renderWithProviders(<CreateLeaveScreen />);

    fireEvent.changeText(await r.findByTestId('leave-description'), 'Shifokorga');
    await waitFor(() => expect(r.getByTestId('leave-description').props.value).toBe('Shifokorga'));
    fireEvent.press(r.getByTestId('leave-submit'));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalled();
    expect(r.queryByTestId('leave-description-error')).toBeNull();
  });

  it('server refusal → error toast with the server reason, form stays', async () => {
    mock.onPost('work-leaves').reply(400, { detail: 'Muddatlar kesishmoqda' });
    const r = await renderWithProviders(<CreateLeaveScreen />);

    fireEvent.changeText(await r.findByTestId('leave-description'), 'Shifokorga');
    await waitFor(() => expect(r.getByTestId('leave-description').props.value).toBe('Shifokorga'));
    fireEvent.press(r.getByTestId('leave-submit'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Muddatlar kesishmoqda'));
    expect(router.back).not.toHaveBeenCalled();
  });
});
