import React from 'react';
import { Text, View } from 'react-native';
import { within } from '@testing-library/react-native';
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

  it('renders the overlay slot as a sibling of the centered column, not inside it', async () => {
    const { getByTestId, queryByTestId } = await renderWithProviders(
      <Screen testID="screen-root" overlay={<View testID="ov" />}>
        <Text>x</Text>
      </Screen>
    );
    // The overlay must exist...
    expect(getByTestId('ov')).toBeTruthy();
    // ...and must NOT be a descendant of the centered content column, so its
    // absolute-positioned children anchor to the full screen (SafeAreaView),
    // not to the tablet-capped column.
    const content = getByTestId('screen-root-content');
    expect(within(content).queryByTestId('ov')).toBeNull();
    // Both should still be present as siblings under the root.
    expect(queryByTestId('screen-root-content')).toBeTruthy();
  });
});
