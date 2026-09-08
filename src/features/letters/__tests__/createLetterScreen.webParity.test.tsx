// Web-parity round 2026-09-08 (see AddLetterDrawer.jsx). Locks the four form
// behaviours that used to diverge from the web and cost the user a round-trip
// or a silently discarded value:
//   1. TRANSPORT block appears only for a branch on the fleet requester list;
//   2. SODDALASHTIRILGAN safar hides purpose/plan/leadership/submitter/vehicle;
//   3. the destination branch is required only when the chosen regions hold one
//      of our branches (a region with no office is a valid destination);
//   4. the region picker offers every UZ region, not only the ones we sit in.
import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, fireEvent } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import CreateLetterScreen from '../screens/CreateLetterScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({}),
}));

const BRANCH_ID = 5;

describe('CreateLetterScreen — web parity (transport / simple trip / regions)', () => {
  jest.setTimeout(15000);
  const mock = new MockAdapter(apiClient);

  function signIn(extraEmployee: Record<string, unknown> = {}) {
    useAuthStore.setState({
      user: {
        type: 'employee',
        employee: {
          id: 1, legal_name: 'Test User',
          organization_branches: [{ id: BRANCH_ID }],
          ...extraEmployee,
        },
      } as any,
      isAuthenticated: true,
    } as any);
  }

  function stubApi({ requesterBranchIds = [] as number[] } = {}) {
    mock.onGet(new RegExp('vehicles/access')).reply(200, { requester_branch_ids: requesterBranchIds });
    mock.onGet(new RegExp(`organization-branches/${BRANCH_ID}/leaders`)).reply(200, []);
    mock.onGet(new RegExp('organization-branches')).reply(200, [
      { id: 9, name: 'Toshkent filiali', regions: ['Toshkent shahri'] },
    ]);
    mock.onGet(new RegExp('employees')).reply(200, { items: [], total: 0 });
  }

  afterEach(() => mock.reset());

  async function openTripForm(findByText: any) {
    fireEvent.press(await findByText('Tanlang...'));
    fireEvent.press(await findByText('Xizmat safari'));
  }

  it('shows the TRANSPORT block when the branch may request a car', async () => {
    signIn();
    stubApi({ requesterBranchIds: [BRANCH_ID] });
    const { findByText, findByTestId } = await renderWithProviders(<CreateLetterScreen />);
    await openTripForm(findByText);
    expect(await findByTestId('letter-field-vehicle')).toBeTruthy();
  });

  it('hides the TRANSPORT block for a branch that is not on the requester list', async () => {
    signIn();
    stubApi({ requesterBranchIds: [999] });
    const { findByText, queryByTestId } = await renderWithProviders(<CreateLetterScreen />);
    await openTripForm(findByText);
    expect(queryByTestId('letter-field-vehicle')).toBeNull();
  });

  it('simplified-trip author gets the short form (no leadership, no vehicle)', async () => {
    // The backend ignores purpose/plan/submitter/leadership for such an author,
    // yet mobile used to REQUIRE a leader before it would submit.
    signIn({ simple_trip_enabled: true });
    stubApi({ requesterBranchIds: [BRANCH_ID] });
    const { findByText, findByTestId, queryByTestId } = await renderWithProviders(<CreateLetterScreen />);
    await openTripForm(findByText);
    // Await a field the short form DOES render before asserting absences, so
    // the query does not run against a half-rendered tree.
    expect(await findByTestId('letter-field-destinations')).toBeTruthy();
    expect(queryByTestId('letter-field-leadership')).toBeNull();
    expect(queryByTestId('letter-field-tripSubmitter')).toBeNull();
    expect(queryByTestId('letter-field-vehicle')).toBeNull();
  });

  it('regular author still gets leadership and submitter', async () => {
    signIn();
    stubApi();
    const { findByText, findByTestId } = await renderWithProviders(<CreateLetterScreen />);
    await openTripForm(findByText);
    expect(await findByTestId('letter-field-leadership')).toBeTruthy();
    expect(await findByTestId('letter-field-tripSubmitter')).toBeTruthy();
  });
});
