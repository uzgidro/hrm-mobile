import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { HIK_MONITORING_DEVICES, HIK_MONITORING_SUMMARY } from '@/api/urls';
import { renderWithProviders, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import { canMonitorTerminals } from '@/utils/roles';
import TerminalsScreen from '../screens/TerminalsScreen';
import type { User } from '@/types';

// Turniket monitoringi mobilда umuman yo'q edi (backendда 23 ta endpoint bor).
// Darvoza backend `require_system_admin` bilan bir xil bo'lishi SHART: aks holda
// oddiy xodim ekranni ochib 403 olardi.
describe('canMonitorTerminals', () => {
  it('admin, master-admin va AKT roli berilgan xodim kiradi', () => {
    expect(canMonitorTerminals({ id: 1, type: 'admin' } as User)).toBe(true);
    expect(canMonitorTerminals({ id: 2, type: 'master-admin' } as User)).toBe(true);
    expect(canMonitorTerminals({ id: 3, type: 'employee', akt_branch_ids: [3] } as User)).toBe(true);
  });

  it('oddiy xodim, KADR va ministr KIRMAYDI', () => {
    expect(canMonitorTerminals({ id: 4, type: 'employee', akt_branch_ids: [] } as User)).toBe(false);
    expect(canMonitorTerminals({
      id: 5, type: 'employee', is_multi_org_user: true, multi_org_employee_role: 'hr',
    } as User)).toBe(false);
    expect(canMonitorTerminals({
      id: 6, type: 'employee', is_multi_org_user: true, multi_org_employee_role: 'ministr',
    } as User)).toBe(false);
    expect(canMonitorTerminals(null)).toBe(false);
  });
});

describe('TerminalsScreen', () => {
  let mock: MockAdapter;
  beforeEach(() => { mock = new MockAdapter(apiClient); });
  afterEach(() => { mock.restore(); useAuthStore.setState({ user: null }); });

  it('AKT xodimiga qurilmalar va hisob chiqadi', async () => {
    useAuthStore.setState({ user: { id: 1, type: 'employee', akt_branch_ids: [1] } as User });
    mock.onGet(HIK_MONITORING_SUMMARY).reply(200, {
      devices_online: 4, devices_offline: 1, devices_total: 5,
      enrollment_verified: 100, enrollment_pending: 2, enrollment_failed: 3,
    });
    mock.onGet(HIK_MONITORING_DEVICES).reply(200, {
      items: [
        {
          id: 7, effective_name: 'Ges 8 kirish', online: false, acs_dev_ip: '10.0.0.5',
          last_online_at: '2026-08-19T08:00:00', locations: [{ id: 1, name: 'Ges 8' }],
        },
        { id: 8, effective_name: 'Bosh bino', online: true, locations: [] },
      ],
      total: 2,
    });
    const { getByText } = await renderWithProviders(<TerminalsScreen />);
    await waitFor(() => getByText('Ges 8 kirish'));
    getByText('Bosh bino');
    getByText('4');
  });

  it('huquqi yo\'q foydalanuvchiga ekran ochilmaydi', async () => {
    useAuthStore.setState({ user: { id: 2, type: 'employee', akt_branch_ids: [] } as User });
    const { getByText, queryByTestId } = await renderWithProviders(<TerminalsScreen />);
    getByText("Bu bo'lim faqat AKT xodimi va adminlar uchun");
    expect(queryByTestId('terminals-filter-offline')).toBeNull();
  });
});
