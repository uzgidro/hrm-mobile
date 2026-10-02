import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import { STAFF_POSITIONS, STAFF_POSITIONS_ISSUES, STAFF_POSITIONS_SUMMARY } from '@/api/urls';
import StaffPositionsScreen from '../screens/StaffPositionsScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));

const setUser = (u: Record<string, unknown>) =>
  useAuthStore.setState({ user: u as never, isAuthenticated: true } as never);
const emp = (role?: string) => ({
  id: 1,
  type: 'employee',
  employee: role ? { id: 1, is_multi_org_user: true, multi_org_employee_role: role } : { id: 1 },
});
const listParams = (mock: MockAdapter) => mock.history.get.filter((r) => r.url === STAFF_POSITIONS).at(-1)?.params;

const ROWS = [
  {
    id: 12,
    has_staff_row: true,
    organization_branch_id: 1,
    department_id: 4,
    job_position_id: 7,
    department_name: "Kadrlar bo'limi",
    job_position_name: 'Bosh mutaxassis',
    category: 'mutaxassis',
    planned_units: '2.00',
    occupied_units: '1.00',
    vacant_units: '1.00',
    is_closed: false,
    candidate_requirements: "Oliy ma'lumot",
    contact_person: 'Aliyev Anvar',
  },
  {
    id: null,
    has_staff_row: false,
    organization_branch_id: 1,
    department_id: 5,
    job_position_id: 8,
    department_name: 'Moliya',
    job_position_name: 'Hisobchi',
    planned_units: '0.00',
    occupied_units: '1.00',
    vacant_units: '-1.00',
    is_closed: false,
  },
];

describe('StaffPositionsScreen (v2 StaffPositionsPage)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    mock.onGet(STAFF_POSITIONS_SUMMARY).reply(200, {
      planned_units: '120.50',
      occupied_units: '125.00',
      vacant_units: '-4.50',
      rows: 40,
      vacant_rows: 6,
      by_category: [],
    });
    mock.onGet(STAFF_POSITIONS).reply(200, { items: ROWS, total: 2, page: 1, size: 30, pages: 1 });
    mock.onGet(STAFF_POSITIONS_ISSUES).reply(200, {
      groups: [{ code: 'overstaffed', total: 1, rows: [{ id: 5, name: 'Moliya · Hisobchi', count: 1 }] }],
    });
    mock.onPatch(`${STAFF_POSITIONS}/12`).reply(200, {});
  });
  afterEach(() => mock.reset());

  it("xulosa: o'nliklar formatlangan, manfiy vakansiya — «ortiqcha»", async () => {
    setUser(emp('deputy'));
    await renderWithProviders(<StaffPositionsScreen />);
    expect(await screen.findByText('120.5')).toBeTruthy();
    expect(screen.getByText('-4.5')).toBeTruthy();
    // StatTile izohi + manfiy vakansiyali (virtual) qator badge'i.
    expect(screen.getAllByText(i18n.t('staff.overstaffed'))).toHaveLength(2);
  });

  it("rahbar (ko'rish) — Muammolar tabi va FAB yo'q; qator bosilsa tafsilot, tahrir yo'q", async () => {
    setUser(emp('deputy'));
    await renderWithProviders(<StaffPositionsScreen />);
    await fireEvent.press(await screen.findByText("Kadrlar bo'limi · Bosh mutaxassis"));
    expect(await screen.findByText("Oliy ma'lumot")).toBeTruthy();
    expect(screen.queryByText(i18n.t('staff.tab_muammo'))).toBeNull();
    expect(screen.queryByTestId('staff-add')).toBeNull();
    expect(screen.queryByTestId('staff-edit')).toBeNull();
  });

  it('vakansiya tabi → only_vacant; toifa chipi → category', async () => {
    setUser(emp('hr'));
    await renderWithProviders(<StaffPositionsScreen />);
    await screen.findByText("Kadrlar bo'limi · Bosh mutaxassis");
    await fireEvent.press(screen.getByText(i18n.t('staff.tab_vakansiya')));
    await waitFor(() => expect(listParams(mock)).toEqual({ page: 1, size: 30, only_vacant: true }));
    await fireEvent.press(screen.getByTestId('staff-cat-rahbar'));
    await waitFor(() => expect(listParams(mock)).toEqual({ page: 1, size: 30, only_vacant: true, category: 'rahbar' }));
  });

  it('HR: Muammolar tabi — guruh nomi tarjimada, qatorlar', async () => {
    setUser(emp('hr'));
    await renderWithProviders(<StaffPositionsScreen />);
    await fireEvent.press(await screen.findByText(i18n.t('staff.tab_muammo')));
    expect(await screen.findByText(i18n.t('staff.issue_overstaffed'))).toBeTruthy();
    expect(screen.getByText('Moliya · Hisobchi · 1')).toBeTruthy();
  });

  it("HR: virtual qator (shtatsiz) — tahrir/yopish yo'q", async () => {
    setUser(emp('hr'));
    await renderWithProviders(<StaffPositionsScreen />);
    await fireEvent.press(await screen.findByText('Moliya · Hisobchi'));
    expect(await screen.findByText(i18n.t('staff.virtualHint'))).toBeTruthy();
    expect(screen.queryByTestId('staff-edit')).toBeNull();
    expect(screen.queryByTestId('staff-close')).toBeNull();
  });

  it("HR: tahrir — birlik, sabab → PATCH; manfiy birlik — so'rov yo'q", async () => {
    setUser(emp('hr'));
    await renderWithProviders(<StaffPositionsScreen />);
    await fireEvent.press(await screen.findByText("Kadrlar bo'limi · Bosh mutaxassis"));
    await fireEvent.press(await screen.findByTestId('staff-edit'));
    await fireEvent.changeText(screen.getByTestId('staff-units'), '-1');
    await fireEvent.press(screen.getByTestId('staff-save'));
    expect(await screen.findByText(i18n.t('staff.unitsInvalid'))).toBeTruthy();
    expect(mock.history.patch).toHaveLength(0);
    await fireEvent.changeText(screen.getByTestId('staff-units'), '3');
    await fireEvent.changeText(screen.getByTestId('staff-reason'), '15-buyruq');
    await fireEvent.press(screen.getByTestId('staff-save'));
    await waitFor(() => expect(mock.history.patch).toHaveLength(1));
    expect(JSON.parse(mock.history.patch[0].data)).toEqual({ planned_units: 3, note: null, reason: '15-buyruq' });
  });
});
