import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { renderWithProviders, screen } from '@/test/renderWithProviders';
import { Screen } from '@/ui';

describe('Screen', () => {
  it("kengligi konteynerga nisbatan (100%) — oyna kengligidan emas (NavRail yonida kesilmaydi)", async () => {
    await renderWithProviders(
      <Screen testID="s">
        <Text testID="child">x</Text>
      </Screen>,
    );
    const inner = screen.getByTestId('child').parent!;
    const style = StyleSheet.flatten(inner.props.style);
    expect(style.width).toBe('100%');
    expect(style.maxWidth).toBe(1280);
  });
});
