// NV-10 / NV-11: the lock hides the app from screen readers and closes sheets.
import React from 'react';
import { Text, Platform } from 'react-native';
import { renderWithProviders as render, screen, act } from '@/test/renderWithProviders';
import { LockGuard } from '../components/LockGuard';
import { LockAwareModal } from '@/components/LockAwareModal';
import { useLockStore } from '@/store/lockStore';
import { useAuthStore } from '@/store/authStore';

jest.mock('@/store/authStore', () => {
  const { create } = require('zustand');
  return { useAuthStore: create(() => ({ isAuthenticated: true })) };
});

describe('LockGuard', () => {
  it('hides content from accessibility and touches only while locked', async () => {
    const { rerender } = await render(<LockGuard locked={false}><Text>secret</Text></LockGuard>);
    let el = screen.getByTestId('app-content', { includeHiddenElements: true });
    expect(el.props.importantForAccessibility).toBe('auto');
    expect(el.props.accessibilityElementsHidden).toBe(false);
    await act(async () => rerender(<LockGuard locked><Text>secret</Text></LockGuard>));
    el = screen.getByTestId('app-content', { includeHiddenElements: true });
    expect(el.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(el.props.accessibilityElementsHidden).toBe(true);
    expect(el.props.pointerEvents).toBe('none');
  });
});

describe('LockAwareModal', () => {
  beforeEach(() => {
    useLockStore.setState({ status: 'unlocked' });
    (Platform as { OS: string }).OS = 'ios';
  });

  it('closes an open sheet when the app locks and does not reopen it', async () => {
    const onClose = jest.fn();
    await render(
      <LockAwareModal visible onRequestClose={onClose}>
        <Text>sheet body</Text>
      </LockAwareModal>,
    );
    expect(screen.queryByText('sheet body')).toBeTruthy();
    await act(async () => useLockStore.setState({ status: 'locked' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('sheet body')).toBeNull();
  });

  it('stays hidden during PIN setup too', async () => {
    useLockStore.setState({ status: 'setup-required' });
    await render(
      <LockAwareModal visible onRequestClose={() => undefined}>
        <Text>sheet body</Text>
      </LockAwareModal>,
    );
    expect(screen.queryByText('sheet body')).toBeNull();
  });

  it('is untouched when signed out (login language sheet)', async () => {
    useAuthStore.setState({ isAuthenticated: false });
    useLockStore.setState({ status: 'setup-required' });
    await render(
      <LockAwareModal visible onRequestClose={() => undefined}>
        <Text>sheet body</Text>
      </LockAwareModal>,
    );
    expect(screen.queryByText('sheet body')).toBeTruthy();
    await act(async () => useAuthStore.setState({ isAuthenticated: true }));
  });
});
