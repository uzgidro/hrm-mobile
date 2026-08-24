// Task 21: on tablet, short adjacent selector/date fields in the create-letter
// form pair into 2-column rows; on phone they stack (Task 0 behavior).
// multiline fields (trip purpose / work plan / letter text) must stay
// full-width on both. Pairs under test:
//  - CreateLetterScreen: fieldType + fieldLetterDate (new pairing, tablet-only)
//  - LetterFormFields (business trip): fieldRegions + fieldDestinations,
//    fieldLeadership + fieldSubmitter (new pairing, tablet-only).
//    departureDate + arrivalDate is a PRE-EXISTING intentional row (predates
//    the tablet work, web-parity) — left unconditional on both devices;
//    this test only locks it still renders, not a new phone/tablet branch.
//  - LetterFormFields (non-trip): fieldMainSigner + fieldCoordinators (new
//    pairing, tablet-only)
import React from 'react';
import { useWindowDimensions } from 'react-native';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, fireEvent } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import CreateLetterScreen from '../screens/CreateLetterScreen';

// `useLocalSearchParams` — TAHRIR rejimi uchun (`?id=`); bu testlar YARATISH
// rejimini tekshiradi, shu bois bo'sh params qaytaradi.
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions');

const TABLET_LANDSCAPE = { width: 1194, height: 834, scale: 2, fontScale: 1 };
const PHONE_PORTRAIT = { width: 390, height: 844, scale: 3, fontScale: 1 };

describe('CreateLetterScreen (tablet two-column pairing)', () => {
  // Every test here renders the heavy CreateLetterScreen; under full parallel
  // jest load a cold first render can exceed the default 5s (flaked in CI while
  // passing in isolation, blocking the release build). The assertions are
  // instant — this is headroom for the render, not a slow test. 15s.
  jest.setTimeout(15000);

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

  it('business trip: pairs regions/destinations and leadership/submitter on tablet (new pairing)', async () => {
    (useWindowDimensions as jest.Mock).mockReturnValue(TABLET_LANDSCAPE);
    const { findByText, findByTestId } = await renderWithProviders(<CreateLetterScreen />);
    await openBusinessTripType(null, findByText);

    const regionRow = await findByTestId('letter-regions-destinations-row');
    expect(regionRow.props.style).toEqual(expect.objectContaining({ flexDirection: 'row' }));

    const leadershipRow = await findByTestId('letter-leadership-submitter-row');
    expect(leadershipRow.props.style).toEqual(expect.objectContaining({ flexDirection: 'row' }));

    // departure/arrival is a pre-existing intentional row (predates the
    // tablet work) — still renders as a row on tablet too, unconditionally.
    const dateRow = await findByTestId('letter-departure-arrival-row');
    expect(dateRow.props.style).toEqual(expect.objectContaining({ flexDirection: 'row' }));

    // Multiline trip purpose / work plan stay full-width — no row wrapper.
    expect(await findByText('Borishdan maqsad')).toBeTruthy();
    expect(await findByText('Xizmat safari ish rejasi')).toBeTruthy();
  });

  it('business trip: regions/destinations and leadership/submitter do not pair on phone', async () => {
    (useWindowDimensions as jest.Mock).mockReturnValue(PHONE_PORTRAIT);
    const { findByText, findByTestId } = await renderWithProviders(<CreateLetterScreen />);
    await openBusinessTripType(null, findByText);

    expect((await findByTestId('letter-regions-destinations-row')).props.style).toBeUndefined();
    expect((await findByTestId('letter-leadership-submitter-row')).props.style).toBeUndefined();
    // departure/arrival keeps its pre-existing row layout on phone too
    // (unchanged by Task 21 — it was never a plain single-column stack).
    expect((await findByTestId('letter-departure-arrival-row')).props.style).toEqual(
      expect.objectContaining({ flexDirection: 'row' })
    );
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
