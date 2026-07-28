import React from 'react';
import { Text } from 'react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { Screen } from '../Screen';

describe('Screen', () => {
  it('renders its children', async () => {
    const { getByText } = await renderWithProviders(
      <Screen><Text>hello</Text></Screen>
    );
    expect(getByText('hello')).toBeTruthy();
  });

  it('exposes an outer testID for the safe-area root', async () => {
    const { getByTestId } = await renderWithProviders(
      <Screen testID="screen-root"><Text>x</Text></Screen>
    );
    expect(getByTestId('screen-root')).toBeTruthy();
  });

  it('renders a distinct inner content wrapper (the centered column)', async () => {
    const { getByTestId } = await renderWithProviders(
      <Screen testID="screen-root"><Text>x</Text></Screen>
    );
    // The inner column is testable so list screens can target it if needed.
    expect(getByTestId('screen-root-content')).toBeTruthy();
  });
});
