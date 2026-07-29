import React from 'react';
import { Text } from 'react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { SplitLayout } from '../SplitLayout';

describe('SplitLayout', () => {
  it('renders both panes', async () => {
    const { getByText } = await renderWithProviders(
      <SplitLayout master={<Text>LIST</Text>} detail={<Text>DETAIL</Text>} />
    );
    expect(getByText('LIST')).toBeTruthy();
    expect(getByText('DETAIL')).toBeTruthy();
  });

  it('shows the placeholder when detail is null', async () => {
    const { getByText, queryByText } = await renderWithProviders(
      <SplitLayout master={<Text>LIST</Text>} detail={null} placeholder={<Text>PICK ONE</Text>} />
    );
    expect(getByText('PICK ONE')).toBeTruthy();
    expect(queryByText('DETAIL')).toBeNull();
  });
});
