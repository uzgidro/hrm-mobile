import React from 'react';
import { renderWithProviders, fireEvent } from '../../test/renderWithProviders';
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

  // 2026-10-06: ro'yxat avatarlari 27 KB lik to'liq suratni yuklardi (nusxa 1.6 KB).
  it('kichik avatar thumb dan, xato bo\'lsa to\'liq suratga qaytadi; katta avatar to\'liq surat', async () => {
    const emp = { photo_path: 'https://x/p.jpg', photo_thumb_path: 'https://x/p_thumb.png', legal_name: 'Ali' };
    const { getByTestId } = await renderWithProviders(<EmployeeAvatar emp={emp} size={48} testID="a" />);
    expect(getByTestId('a').props.source).toEqual({ uri: 'https://x/p_thumb.png' });
    await fireEvent(getByTestId('a'), 'error');
    expect(getByTestId('a').props.source).toEqual({ uri: 'https://x/p.jpg' });
    const big = await renderWithProviders(<EmployeeAvatar emp={emp} size={96} testID="b" />);
    expect(big.getByTestId('b').props.source).toEqual({ uri: 'https://x/p.jpg' });
  });

  it('is wrapped in React.memo', () => {
    expect((EmployeeAvatar as unknown as { $$typeof?: symbol }).$$typeof).toBeDefined();
  });
});
