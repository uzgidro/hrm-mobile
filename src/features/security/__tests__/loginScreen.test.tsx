// v3 login: mantiq o'zgarmagan, faqat ko'rinish — Maestro testID'lari saqlanadi,
// forma v2 kartasida, OneID ikkinchi darajali tugma.
import React from 'react';
import { renderWithProviders, screen } from '@/test/renderWithProviders';
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
});
