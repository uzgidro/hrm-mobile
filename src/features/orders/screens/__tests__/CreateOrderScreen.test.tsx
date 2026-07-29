// Task 21: on tablet, the leadership + submitter selectors (both short,
// non-multiline Fields sitting adjacent in the create-order form) pair up
// into a 2-column row; on phone they stack as before (Task 0 behavior).
// summary/description (multiline) and ApproversEditor (dynamic) must stay
// full-width regardless of device — this test locks that they render outside
// any row wrapper.
import React from 'react';
import { useWindowDimensions } from 'react-native';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import CreateOrderScreen from '../CreateOrderScreen';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), replace: jest.fn() } }));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions');

const TABLET_LANDSCAPE = { width: 1194, height: 834, scale: 2, fontScale: 1 };
const PHONE_PORTRAIT = { width: 390, height: 844, scale: 3, fontScale: 1 };

describe('CreateOrderScreen (tablet two-column pairing)', () => {
  const mock = new MockAdapter(apiClient);

  beforeEach(() => {
    useAuthStore.setState({
      user: {
        type: 'employee',
        employee: { id: 1, legal_name: 'Test User', organization_branches: [{ id: 5 }] },
      } as any,
      isAuthenticated: true,
    } as any);
    // All dropdown sources the screen loads on mount — empty is enough since
    // this test only asserts layout, not picker contents.
    mock.onGet(new RegExp('order-act-categories')).reply(200, []);
    mock.onGet(new RegExp('employees')).reply(200, { items: [], total: 0 });
    mock.onGet(new RegExp('departments')).reply(200, []);
    mock.onGet(new RegExp('organization-branches/5/leaders')).reply(200, []);
  });

  afterEach(() => mock.reset());

  it('applies row/flex-1 styles to the leadership+submitter pair on tablet', async () => {
    (useWindowDimensions as jest.Mock).mockReturnValue(TABLET_LANDSCAPE);
    const { findByTestId } = await renderWithProviders(<CreateOrderScreen />);

    const row = await findByTestId('order-leadership-submitter-row');
    const leadershipHalf = await findByTestId('order-field-leadership');
    const submitterHalf = await findByTestId('order-field-submitter');

    expect(row.props.style).toEqual(expect.objectContaining({ flexDirection: 'row' }));
    expect(leadershipHalf.props.style).toEqual(expect.objectContaining({ flex: 1 }));
    expect(submitterHalf.props.style).toEqual(expect.objectContaining({ flex: 1 }));
  });

  it('does not apply row/flex-1 styles on phone (fields stack full-width)', async () => {
    (useWindowDimensions as jest.Mock).mockReturnValue(PHONE_PORTRAIT);
    const { findByTestId } = await renderWithProviders(<CreateOrderScreen />);

    const row = await findByTestId('order-leadership-submitter-row');
    const leadershipHalf = await findByTestId('order-field-leadership');
    const submitterHalf = await findByTestId('order-field-submitter');

    expect(row.props.style).toBeUndefined();
    expect(leadershipHalf.props.style).toBeUndefined();
    expect(submitterHalf.props.style).toBeUndefined();
  });

  it('keeps summary/description (multiline) and the approvers editor unpaired on tablet', async () => {
    (useWindowDimensions as jest.Mock).mockReturnValue(TABLET_LANDSCAPE);
    const { findByText } = await renderWithProviders(<CreateOrderScreen />);

    expect(await findByText('Qisqacha mazmuni')).toBeTruthy();
    expect(await findByText(/^Buyruq matni/)).toBeTruthy();
    expect(await findByText('Kelishuvchilar')).toBeTruthy();
  });
});
