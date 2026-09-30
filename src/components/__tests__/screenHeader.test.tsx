import React from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders';
import i18n from '@/i18n';
import { ScreenHeader, HeaderAction } from '../ScreenHeader';

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

describe('ScreenHeader (v3)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
  });

  it("orqaga: button roli, a11y yorlig'i, ≥44dp, router.back", async () => {
    await renderWithProviders(<ScreenHeader title="So'rovlar" count={3} />);
    const back = screen.getByLabelText(i18n.t('common.back'));
    expect(back.props.accessibilityRole).toBe('button');
    const st = StyleSheet.flatten(back.props.style);
    expect(st.width).toBeGreaterThanOrEqual(44);
    await fireEvent.press(back);
    expect(router.back).toHaveBeenCalled();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('HeaderAction ≥44dp va bosiladi', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<HeaderAction icon="plus" onPress={onPress} accessibilityLabel="Qo'shish" />);
    const btn = screen.getByLabelText("Qo'shish");
    expect(StyleSheet.flatten(btn.props.style).width).toBeGreaterThanOrEqual(44);
    await fireEvent.press(btn);
    expect(onPress).toHaveBeenCalled();
  });
});
