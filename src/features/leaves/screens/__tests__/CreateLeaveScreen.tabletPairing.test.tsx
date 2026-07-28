// Task 21: on tablet, the start/end date-time selectors (the flagship
// date-from/date-to pair) sit side by side in a 2-column row; on phone they
// stack full-width as before (Task 0 behavior). The type selector, the
// supervisor card, and the comment (multiline) stay single/full-width on
// both — they're not part of this pair.
import React from 'react';
import { useWindowDimensions } from 'react-native';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import CreateLeaveScreen from '../CreateLeaveScreen';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), replace: jest.fn() } }));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions');

const TABLET_LANDSCAPE = { width: 1194, height: 834, scale: 2, fontScale: 1 };
const PHONE_PORTRAIT = { width: 390, height: 844, scale: 3, fontScale: 1 };

describe('CreateLeaveScreen (tablet two-column pairing)', () => {
  const mock = new MockAdapter(apiClient);

  beforeEach(() => {
    useAuthStore.setState({
      user: {
        type: 'employee',
        employee: {
          id: 1,
          legal_name: 'Test User',
          supervisor: { id: 2, legal_name: 'Supervisor Name' },
          organization_branches: [{ id: 5 }],
        },
      } as any,
      isAuthenticated: true,
    } as any);
    mock.onGet(new RegExp('employees/1$')).reply(200, {
      id: 1, legal_name: 'Test User', supervisor: { id: 2, legal_name: 'Supervisor Name' },
    });
  });

  afterEach(() => mock.reset());

  it('applies row/flex-1 styles to the start/end date pair on tablet', async () => {
    (useWindowDimensions as jest.Mock).mockReturnValue(TABLET_LANDSCAPE);
    const { findByTestId } = await renderWithProviders(<CreateLeaveScreen />);

    const row = await findByTestId('leave-start-end-row');
    const startHalf = await findByTestId('leave-field-start');
    const endHalf = await findByTestId('leave-field-end');

    expect(row.props.style).toEqual(expect.objectContaining({ flexDirection: 'row' }));
    expect(startHalf.props.style).toEqual(expect.objectContaining({ flex: 1 }));
    expect(endHalf.props.style).toEqual(expect.objectContaining({ flex: 1 }));
  });

  it('does not apply row/flex-1 styles on phone (start/end stack full-width)', async () => {
    (useWindowDimensions as jest.Mock).mockReturnValue(PHONE_PORTRAIT);
    const { findByTestId } = await renderWithProviders(<CreateLeaveScreen />);

    const row = await findByTestId('leave-start-end-row');
    const startHalf = await findByTestId('leave-field-start');
    const endHalf = await findByTestId('leave-field-end');

    expect(row.props.style).toBeUndefined();
    expect(startHalf.props.style).toBeUndefined();
    expect(endHalf.props.style).toBeUndefined();
  });

  it('keeps type/supervisor/comment as single full-width fields on tablet (not paired)', async () => {
    (useWindowDimensions as jest.Mock).mockReturnValue(TABLET_LANDSCAPE);
    const { findByText } = await renderWithProviders(<CreateLeaveScreen />);

    expect(await findByText("So'rov turi *")).toBeTruthy();
    expect(await findByText('Rahbar (Tasdiqlovchi)')).toBeTruthy();
    expect(await findByText('Izoh (ixtiyoriy)')).toBeTruthy();
  });
});
