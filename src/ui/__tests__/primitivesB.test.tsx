import React from 'react';
import { StyleSheet } from 'react-native';
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders';
import { StatTile, ListRow, Segmented, ProgressBar } from '@/ui';
import { lightColors, darkColors } from '@/theme/palettes';

describe('primitivlar B', () => {
  it("StatTile raqami wash ustida fg rangida (kontrast), bosiladi", async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <StatTile label="Kech qoldi" value={9} icon="clock" tint="amber" onPress={onPress} testID="t" />,
    );
    fireEvent.press(screen.getByTestId('t'));
    expect(onPress).toHaveBeenCalled();
    const color = StyleSheet.flatten(screen.getByText('9').props.style).color;
    expect([lightColors.fg, darkColors.fg]).toContain(color);
  });

  it('StatTile onPress yo\'q — tugma emas', async () => {
    await renderWithProviders(<StatTile label="Jami" value="147" icon="users" tint="violet" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('ListRow badge va bosish', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<ListRow title="Buyruqlar" badge={2} onPress={onPress} pressable />);
    fireEvent.press(screen.getByText('Buyruqlar'));
    expect(onPress).toHaveBeenCalled();
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('Segmented tanlaydi', async () => {
    const onChange = jest.fn();
    await renderWithProviders(
      <Segmented
        options={[{ value: 'a', label: 'Buyruqlar' }, { value: 'b', label: 'Xatlar', count: 3 }]}
        value="a"
        onChange={onChange}
      />,
    );
    fireEvent.press(screen.getByText('Xatlar'));
    expect(onChange).toHaveBeenCalledWith('b');
    expect(screen.getAllByRole('tab')[0].props.accessibilityState).toMatchObject({ selected: true });
  });

  it('ProgressBar qiymatni 0..1 oralig\'iga qisqartiradi', async () => {
    await renderWithProviders(<ProgressBar value={1.7} testID="p" />);
    expect(screen.getByTestId('p').props.accessibilityValue).toMatchObject({ now: 100 });
  });
});
