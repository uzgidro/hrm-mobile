// Task 21: on tablet, short adjacent fields in the create-visitor form pair
// into 2-column rows; on phone they stack (Task 0 behavior). New pairing
// under test: telegram + phone (both short, single-line FormInputs,
// adjacent). validFrom/validUntil's `dateRow` predates the tablet adaptive
// work (already a 2-up row on phone, web parity) and is left unconditional —
// this test only locks it still renders. legalName/org/position stay single
// (no natural partner / longer text).
import React from 'react';
import { useWindowDimensions } from 'react-native';
import { renderWithProviders } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import VisitorFormScreen from '../VisitorFormScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({}), // create mode (no id)
}));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions');

const TABLET_LANDSCAPE = { width: 1194, height: 834, scale: 2, fontScale: 1 };
const PHONE_PORTRAIT = { width: 390, height: 844, scale: 3, fontScale: 1 };

describe('VisitorFormScreen (tablet two-column pairing)', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { type: 'employee', employee: { id: 1, legal_name: 'Test User' } } as any,
      isAuthenticated: true,
    } as any);
  });

  it('pairs telegram + phone into a 2-column row on tablet', async () => {
    (useWindowDimensions as jest.Mock).mockReturnValue(TABLET_LANDSCAPE);
    const { findByTestId } = await renderWithProviders(<VisitorFormScreen />);

    const row = await findByTestId('visitor-telegram-phone-row');
    const telegramHalf = await findByTestId('visitor-field-telegram');
    const phoneHalf = await findByTestId('visitor-field-phone');

    expect(row.props.style).toEqual(expect.objectContaining({ flexDirection: 'row' }));
    expect(telegramHalf.props.style).toEqual(expect.objectContaining({ flex: 1 }));
    expect(phoneHalf.props.style).toEqual(expect.objectContaining({ flex: 1 }));
  });

  it('does not pair telegram + phone on phone (stacks full-width)', async () => {
    (useWindowDimensions as jest.Mock).mockReturnValue(PHONE_PORTRAIT);
    const { findByTestId } = await renderWithProviders(<VisitorFormScreen />);

    const row = await findByTestId('visitor-telegram-phone-row');
    expect(row.props.style).toBeUndefined();
  });

  it('keeps validFrom/validUntil as a pre-existing row on both tablet and phone (untouched by Task 21)', async () => {
    (useWindowDimensions as jest.Mock).mockReturnValue(TABLET_LANDSCAPE);
    const { findByTestId } = await renderWithProviders(<VisitorFormScreen />);
    expect((await findByTestId('visitor-date-row')).props.style).toEqual(
      expect.objectContaining({ flexDirection: 'row' })
    );

    (useWindowDimensions as jest.Mock).mockReturnValue(PHONE_PORTRAIT);
    const { findByTestId: findByTestIdPhone } = await renderWithProviders(<VisitorFormScreen />);
    expect((await findByTestIdPhone('visitor-date-row')).props.style).toEqual(
      expect.objectContaining({ flexDirection: 'row' })
    );
  });

  it('keeps name/org/position as single full-width fields (not paired)', async () => {
    (useWindowDimensions as jest.Mock).mockReturnValue(TABLET_LANDSCAPE);
    const { findByText } = await renderWithProviders(<VisitorFormScreen />);

    expect(await findByText(/^F\.I\.SH/)).toBeTruthy();
    expect(await findByText('Tashkilot nomi')).toBeTruthy();
    expect(await findByText('Lavozim')).toBeTruthy();
  });
});
