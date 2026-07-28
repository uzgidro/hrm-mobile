// Task 21: on tablet, short adjacent selector/date fields in the create-letter
// form pair into 2-column rows; on phone they stack (Task 0 behavior).
// multiline fields (trip purpose / work plan / letter text) must stay
// full-width on both. Pairs under test:
//  - CreateLetterScreen: fieldType + fieldLetterDate
//  - LetterFormFields (business trip): departureDate + arrivalDate,
//    fieldRegions + fieldDestinations, fieldLeadership + fieldSubmitter
//  - LetterFormFields (non-trip): fieldMainSigner + fieldCoordinators
import React from 'react';
import { useWindowDimensions } from 'react-native';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, fireEvent } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import CreateLetterScreen from '../screens/CreateLetterScreen';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), replace: jest.fn() } }));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions');

const TABLET_LANDSCAPE = { width: 1194, height: 834, scale: 2, fontScale: 1 };
const PHONE_PORTRAIT = { width: 390, height: 844, scale: 3, fontScale: 1 };

describe('CreateLetterScreen (tablet two-column pairing)', () => {
  const mock = new MockAdapter(apiClient);

  beforeEach(() => {
    useAuthStore.setState({
      user: {
        type: 'employee',
        employee: { id: 1, legal_name: 'Test User', organization_branches: [{ id: 5 }] },
      } as any,
      isAuthenticated: true,
    } as any);
    mock.onGet(new RegExp('organization-branches/5/leaders')).reply(200, []);
    mock.onGet(new RegExp('organization-branches')).reply(200, []);
    mock.onGet(new RegExp('employees')).reply(200, { items: [], total: 0 });
  });

  afterEach(() => mock.reset());

  async function openBusinessTripType(getByText: any, findByText: any) {
    fireEvent.press(await findByText('Tanlang...'));
    fireEvent.press(await findByText('Xizmat safari'));
  }

  it('pairs fieldType + fieldLetterDate on tablet', async () => {
    (useWindowDimensions as jest.Mock).mockReturnValue(TABLET_LANDSCAPE);
    const { findByTestId } = await renderWithProviders(<CreateLetterScreen />);

    const row = await findByTestId('letter-type-date-row');
    const typeHalf = await findByTestId('letter-field-type');
    const dateHalf = await findByTestId('letter-field-letterDate');

    expect(row.props.style).toEqual(expect.objectContaining({ flexDirection: 'row' }));
    expect(typeHalf.props.style).toEqual(expect.objectContaining({ flex: 1 }));
    expect(dateHalf.props.style).toEqual(expect.objectContaining({ flex: 1 }));
  });

  it('does not pair fieldType + fieldLetterDate on phone', async () => {
    (useWindowDimensions as jest.Mock).mockReturnValue(PHONE_PORTRAIT);
    const { findByTestId } = await renderWithProviders(<CreateLetterScreen />);

    const row = await findByTestId('letter-type-date-row');
    expect(row.props.style).toBeUndefined();
  });

  it('business trip: pairs departure/arrival, regions/destinations, leadership/submitter on tablet', async () => {
    (useWindowDimensions as jest.Mock).mockReturnValue(TABLET_LANDSCAPE);
    const { findByText, findByTestId } = await renderWithProviders(<CreateLetterScreen />);
    await openBusinessTripType(null, findByText);

    const dateRow = await findByTestId('letter-departure-arrival-row');
    expect(dateRow.props.style).toEqual(expect.objectContaining({ flexDirection: 'row' }));
    expect((await findByTestId('letter-field-departure')).props.style).toEqual(expect.objectContaining({ flex: 1 }));
    expect((await findByTestId('letter-field-arrival')).props.style).toEqual(expect.objectContaining({ flex: 1 }));

    const regionRow = await findByTestId('letter-regions-destinations-row');
    expect(regionRow.props.style).toEqual(expect.objectContaining({ flexDirection: 'row' }));

    const leadershipRow = await findByTestId('letter-leadership-submitter-row');
    expect(leadershipRow.props.style).toEqual(expect.objectContaining({ flexDirection: 'row' }));

    // Multiline trip purpose / work plan stay full-width — no row wrapper.
    expect(await findByText('Borishdan maqsad')).toBeTruthy();
    expect(await findByText('Xizmat safari ish rejasi')).toBeTruthy();
  });

  it('business trip: departure/arrival do not pair on phone (Task 0 stacking, no longer hardcoded row2)', async () => {
    (useWindowDimensions as jest.Mock).mockReturnValue(PHONE_PORTRAIT);
    const { findByText, findByTestId } = await renderWithProviders(<CreateLetterScreen />);
    await openBusinessTripType(null, findByText);

    const dateRow = await findByTestId('letter-departure-arrival-row');
    expect(dateRow.props.style).toBeUndefined();
  });

  it('non-trip (bildirgi/ariza): pairs mainSigner + coordinators on tablet, not on phone', async () => {
    (useWindowDimensions as jest.Mock).mockReturnValue(TABLET_LANDSCAPE);
    const { findByTestId } = await renderWithProviders(<CreateLetterScreen />);
    // Default letterType is null → non-trip branch already renders.
    const row = await findByTestId('letter-signer-coordinators-row');
    expect(row.props.style).toEqual(expect.objectContaining({ flexDirection: 'row' }));

    (useWindowDimensions as jest.Mock).mockReturnValue(PHONE_PORTRAIT);
    const { findByTestId: findByTestIdPhone } = await renderWithProviders(<CreateLetterScreen />);
    const rowPhone = await findByTestIdPhone('letter-signer-coordinators-row');
    expect(rowPhone.props.style).toBeUndefined();
  });
});
