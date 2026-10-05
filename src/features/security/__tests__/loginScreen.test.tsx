// v3 login: mantiq o'zgarmagan, faqat ko'rinish — Maestro testID'lari saqlanadi,
// forma v2 kartasida, OneID ikkinchi darajali tugma.
import React from 'react';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import LoginScreen from '../../../../app/(auth)/login';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock('@/auth/oneid', () => ({ loginWithOneId: jest.fn() }));
jest.mock('@/auth/push', () => ({ setupPushNotifications: jest.fn() }));

describe('LoginScreen (v3)', () => {
  it('forma kartada, Maestro testID lari joyida', async () => {
    await renderWithProviders(<LoginScreen />);
    expect(screen.getByTestId('login-card')).toBeTruthy();
    expect(screen.getByTestId('login-username')).toBeTruthy();
    expect(screen.getByTestId('login-password')).toBeTruthy();
    const submit = screen.getByTestId('login-submit');
    expect(submit.props.accessibilityRole).toBe('button');
  });

  // QA (web): errors used the OS Alert — a no-op on react-native-web, so an
  // empty or wrong login looked like a dead button. Now an inline message.
  it('bo\'sh login/parol — xato forma ichida ko\'rinadi (Alert emas)', async () => {
    await renderWithProviders(<LoginScreen />);
    expect(screen.queryByTestId('login-error')).toBeNull();
    fireEvent.press(screen.getByTestId('login-submit'));
    expect(await screen.findByText('Login va parol kiritilishi shart')).toBeTruthy();
    // Typing clears it.
    fireEvent.changeText(screen.getByTestId('login-username'), 'a');
    await waitFor(() => expect(screen.queryByTestId('login-error')).toBeNull());
  });
});
