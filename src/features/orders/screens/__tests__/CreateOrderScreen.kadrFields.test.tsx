// Web-parity of the two create-order blocks that only exist in some modes:
//  • the KADR decree number + date pair — CREATE only, `hr` only. A KADR decree
//    has no devonxona (chancellery) step, so nobody else would assign its
//    number; on PATCH the backend ignores both fields, so showing them in edit
//    mode would promise an edit that silently does nothing.
//  • the read-only list of files already attached to the decree (EDIT only) —
//    newly picked files APPEND to that set, so it has to be visible.
import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import { ORDER_ACT_DETAIL } from '@/api/urls';
import CreateOrderScreen from '../CreateOrderScreen';

// The edit id comes from the route (`?id=`); each test sets it before render.
let mockSearchParams: { id?: string } = {};
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => mockSearchParams,
}));

const setUser = (multiOrgRole?: string) =>
  useAuthStore.setState({
    user: {
      type: 'employee',
      employee: {
        id: 1,
        legal_name: 'Test User',
        organization_branches: [{ id: 5 }],
        is_multi_org_user: !!multiOrgRole,
        multi_org_employee_role: multiOrgRole,
      },
    },
    isAuthenticated: true,
  } as never);

describe('CreateOrderScreen — KADR number/date + existing attachments', () => {
  const mock = new MockAdapter(apiClient);

  beforeEach(() => {
    mockSearchParams = {};
    mock.onGet(new RegExp('order-act-categories')).reply(200, []);
    mock.onGet(new RegExp('employees')).reply(200, { items: [], total: 0 });
    mock.onGet(new RegExp('departments')).reply(200, []);
    mock.onGet(new RegExp('organization-branches/5/leaders')).reply(200, []);
  });

  afterEach(() => mock.reset());

  it('shows the number + date pair when KADR creates a decree', async () => {
    setUser('hr');
    const { findByTestId } = await renderWithProviders(<CreateOrderScreen />);
    expect(await findByTestId('order-act-number-row')).toBeTruthy();
    expect(await findByTestId('order-act-number-input')).toBeTruthy();
  });

  it("oddiy xodim yaratganda raqam/sana YO'Q (raqamni devonxona beradi)", async () => {
    setUser();
    const { queryByTestId, findByText } = await renderWithProviders(<CreateOrderScreen />);
    await findByText('Qisqacha mazmuni');
    expect(queryByTestId('order-act-number-row')).toBeNull();
  });

  it('hides the number/date pair in edit mode and lists the existing attachments', async () => {
    setUser('hr');
    mockSearchParams = { id: '42' };
    mock.onGet(ORDER_ACT_DETAIL(42)).reply(200, {
      id: 42,
      organization_branch_id: 5,
      category_id: 7,
      description: 'Matn',
      familiarizer_departments: [{ id: 3, name: 'Kadr' }],
      documents: [
        { id: 1, document_objectname: 'ariza.pdf' },
        // Generated decree docx — never listed as a user attachment.
        { id: 2, document_objectname: 'decree_42.docx' },
      ],
    });

    const { findByText, queryByTestId, queryByText } = await renderWithProviders(<CreateOrderScreen />);

    expect(await findByText('ariza.pdf')).toBeTruthy();
    expect(queryByText('decree_42.docx')).toBeNull();
    expect(queryByTestId('order-act-number-row')).toBeNull();
  });
});
