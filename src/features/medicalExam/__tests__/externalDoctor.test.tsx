// The invited doctor (`type: 'external-doctor'`): not an employee; the server answers every
// route outside a short list with 403 {code:'external_doctor_forbidden'}.
import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { MEDICAL_QUEUE } from '@/api/urls';
import { setupPushNotifications, teardownPushNotifications } from '@/auth/push';
import * as notifications from '@/services/notifications';
import { useAuthStore } from '@/store/authStore';
import { canAccessPage } from '@/utils/roles';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import type { User } from '@/types';
import DoctorDeskScreen from '../screens/DoctorDeskScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false },
  useLocalSearchParams: () => ({}),
}));
jest.mock('@/services/notifications', () => ({
  ensureAndroidChannel: jest.fn(async () => {}),
  requestNotificationPermissions: jest.fn(async () => true),
  getExpoPushToken: jest.fn(async () => 'ExponentPushToken[x]'),
  registerTokenWithBackend: jest.fn(async () => {}),
  unregisterTokenWithBackend: jest.fn(async () => {}),
}));

const external = {
  id: 7,
  type: 'external-doctor',
  employee: null,
  is_doctor: true,
  external_doctor: { id: 1, full_name: 'Dr Ext', workplace: 'Klinika №3', can_work: true },
  medical_specialties: [{ id: 2, name: 'LOR' }],
} as unknown as User;
// `medical_reception` present (even false) = the server supports the examination-day screens.
const staff = { id: 1, type: 'employee', employee: { id: 5 }, is_doctor: true, medical_reception: true } as unknown as User;
const plain = { id: 2, type: 'employee', employee: { id: 6 }, medical_reception: false } as unknown as User;

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
  useAuthStore.setState({ user: external, isAuthenticated: true } as never);
});
afterEach(() => mock.restore());

describe('shell is not used by an invited doctor', () => {
  it('push-token registration and teardown make no calls', async () => {
    await setupPushNotifications();
    await teardownPushNotifications();
    expect(notifications.registerTokenWithBackend).not.toHaveBeenCalled();
    expect(notifications.unregisterTokenWithBackend).not.toHaveBeenCalled();
    expect(notifications.requestNotificationPermissions).not.toHaveBeenCalled();
  });

  it('push still works for an ordinary employee', async () => {
    useAuthStore.setState({ user: plain } as never);
    await setupPushNotifications();
    expect(notifications.registerTokenWithBackend).toHaveBeenCalled();
  });

  it('modules «Tibbiy ko‘rik (mening kunim)» and «Shifokor qabuli» are not offered to the invited doctor', () => {
    expect(canAccessPage(external, 'medicalExam')).toBe(false);
    expect(canAccessPage(external, 'doctorDesk')).toBe(false);
  });
});

describe('module gates', () => {
  it('every employee gets «my exam»; only staff doctors get the desk', () => {
    expect(canAccessPage(plain, 'medicalExam')).toBe(true);
    expect(canAccessPage(plain, 'doctorDesk')).toBe(false);
    expect(canAccessPage(staff, 'doctorDesk')).toBe(true);
    expect(canAccessPage(staff, 'medicalExam')).toBe(true);
  });
  it('a server that does not know the examination day yet hides both entries', () => {
    // The update reaches phones over the air before (or after) the server is deployed.
    const oldPlain = { id: 2, type: 'employee', employee: { id: 6 } } as unknown as User;
    const oldDoctor = { id: 1, type: 'employee', employee: { id: 5 }, is_doctor: true } as unknown as User;
    expect(canAccessPage(oldPlain, 'medicalExam')).toBe(false);
    expect(canAccessPage(oldDoctor, 'medicalExam')).toBe(false);
    expect(canAccessPage(oldDoctor, 'doctorDesk')).toBe(false);
  });
  it('an account with no employee card has no «my exam»', () => {
    expect(canAccessPage({ id: 3, type: 'admin' } as unknown as User, 'medicalExam')).toBe(false);
  });
});

describe('403 external_doctor_forbidden is not a logout', () => {
  it('the session survives a refused route', async () => {
    mock.onGet('some/forbidden').reply(403, { code: 'external_doctor_forbidden' });
    await expect(apiClient.get('some/forbidden')).rejects.toMatchObject({ response: { status: 403 } });
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.type).toBe('external-doctor');
  });
});

describe('DoctorDeskScreen as the invited doctor’s home', () => {
  it('works with the allowed routes only, shows the workplace and a logout', async () => {
    mock.onGet(MEDICAL_QUEUE).reply(200, { campaign: { id: 1, name: 'K' }, specialty_ids: [2], items: [] });
    await renderWithProviders(<DoctorDeskScreen />);
    expect(await screen.findByText('Klinika №3')).toBeTruthy();
    expect(screen.getByTestId('desk-logout')).toBeTruthy();
    expect(mock.history.get.map((g) => g.url)).toEqual([MEDICAL_QUEUE]);
  });

  it('logout button signs out', async () => {
    mock.onGet(MEDICAL_QUEUE).reply(200, { campaign: null, specialty_ids: [], items: [] });
    const logout = jest.fn(async () => {});
    useAuthStore.setState({ logout } as never);
    await renderWithProviders(<DoctorDeskScreen />);
    await fireEvent.press(await screen.findByTestId('desk-logout'));
    await waitFor(() => expect(logout).toHaveBeenCalled());
  });

  it('a staff doctor sees no logout here', async () => {
    useAuthStore.setState({ user: staff } as never);
    mock.onGet(MEDICAL_QUEUE).reply(200, { campaign: null, specialty_ids: [], items: [] });
    await renderWithProviders(<DoctorDeskScreen />);
    await screen.findByTestId('queue-no-campaign');
    expect(screen.queryByTestId('desk-logout')).toBeNull();
  });
});
