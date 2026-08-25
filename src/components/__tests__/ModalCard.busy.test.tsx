import React from 'react';
import { Text } from 'react-native';
import { renderWithProviders, fireEvent } from '@/test/renderWithProviders';
import { ModalCard } from '../ModalCard';

// Sabab — `ModalCard.blocked.test.tsx` dagi izohga qarang (Modal portali).
describe('ModalCard — so\'rov ketayotganda', () => {
  it('busy — takroriy bosish so\'rov YUBORMAYDI', async () => {
    const onSubmit = jest.fn();
    const { getByTestId } = await renderWithProviders(
      <ModalCard visible title="T" confirmLabel="OK" busy onClose={jest.fn()} onSubmit={onSubmit} testID="mc">
        <Text>maydon</Text>
      </ModalCard>,
    );
    const btn = getByTestId('mc');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(btn);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
