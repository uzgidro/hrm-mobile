import React from 'react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { EmployeeAvatar } from '../EmployeeAvatar';

describe('EmployeeAvatar', () => {
  it('renders the photo (expo-image) when photo_path is present', async () => {
    const { getByTestId, queryByText } = await renderWithProviders(
      <EmployeeAvatar emp={{ photo_path: 'https://x/p.jpg', legal_name: 'Ali Valiyev' }} testID="avatar" />
    );
    expect(getByTestId('avatar')).toBeTruthy();
    // No initial letter is shown when a photo renders.
    expect(queryByText('A')).toBeNull();
  });

  it('falls back to the uppercased first initial when there is no photo', async () => {
    const { getByText } = await renderWithProviders(
      <EmployeeAvatar emp={{ legal_name: 'ravshan' }} />
    );
    expect(getByText('R')).toBeTruthy();
  });

  it('uses X when the name is empty', async () => {
    const { getByText } = await renderWithProviders(<EmployeeAvatar emp={{}} />);
    expect(getByText('X')).toBeTruthy();
  });

  it('is wrapped in React.memo', () => {
    expect((EmployeeAvatar as unknown as { $$typeof?: symbol }).$$typeof).toBeDefined();
  });
});
