import React from 'react';
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders';
import { Button, Card, Chip, Badge, SectionHeader, IconButton } from '@/ui';
import { lightColors } from '@/theme/palettes';

describe('primitivlar A', () => {
  it('Button bosiladi', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<Button label="Saqlash" onPress={onPress} testID="b" />);
    fireEvent.press(screen.getByTestId('b'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('Button loading holatida bosilmaydi va band deb e\'lon qilinadi', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<Button label="Saqlash" onPress={onPress} testID="b" loading />);
    fireEvent.press(screen.getByTestId('b'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByTestId('b').props.accessibilityState).toMatchObject({ busy: true, disabled: true });
  });

  it('Card sarlavha va amal', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <Card title="Tug'ilgan kunlar" icon="gift" tint="pink" action={{ label: 'Barchasi', onPress }} />,
    );
    expect(screen.getByText("Tug'ilgan kunlar")).toBeTruthy();
    fireEvent.press(screen.getByText('Barchasi'));
    expect(onPress).toHaveBeenCalled();
  });

  it('Chip tanlangan holati a11y da, soni ko\'rinadi', async () => {
    await renderWithProviders(<Chip label="Kelgan" count={98} selected onPress={() => {}} />);
    expect(screen.getByRole('button').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByText('98')).toBeTruthy();
  });

  it('Chip tintSelected: tanlangan holat brand emas, o‘z toni bilan', async () => {
    await renderWithProviders(<Chip label="Kasal" tone="danger" tintSelected selected onPress={() => {}} />);
    expect(screen.getByText('Kasal')).toHaveStyle({ color: lightColors.danger });
  });

  it('IconButton badge 9+ ga qisqaradi', async () => {
    await renderWithProviders(
      <IconButton icon="bell" onPress={() => {}} accessibilityLabel="Bildirishnomalar" badge={12} />,
    );
    expect(screen.getByText('9+')).toBeTruthy();
    expect(screen.getByLabelText('Bildirishnomalar')).toBeTruthy();
  });

  it('Badge va SectionHeader', async () => {
    const onAction = jest.fn();
    await renderWithProviders(
      <>
        <Badge label="Kech" tone="warning" />
        <SectionHeader title="Bugun" actionLabel="Barchasi" onAction={onAction} />
      </>,
    );
    expect(screen.getByText('Kech')).toBeTruthy();
    fireEvent.press(screen.getByText('Barchasi'));
    expect(onAction).toHaveBeenCalled();
  });
});
