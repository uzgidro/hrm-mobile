import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import { VISITORS_LIST } from '@/api/urls';
import VisitorsListScreen from '../screens/VisitorsListScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), replace: jest.fn() },
}));

// Mehmonlar ro'yxatining FILIAL ko'lami — web GuestsTable qoidasi bilan 1:1.
// Backend `VisitorService.list_visitors` ko'p filialli xodimga BARCHA
// biriktirilgan filiallarini beradi; `organization_branch_id` esa uni bittaga
// qisadi. Shu bois KPP / buxgalter / kuzatuvchi / oddiy xodim uchun parametr
// YUBORILMAYDI, qolganlar uchun (kadr, o'rinbosar) — o'z filiali.
describe('VisitorsListScreen — filial parametri', () => {
  const mock = new MockAdapter(apiClient);
  afterEach(() => mock.reset());

  async function renderFor(user: unknown) {
    mock.onGet(VISITORS_LIST).reply(200, []);
    useAuthStore.setState({ user, isAuthenticated: true } as never);
    await renderWithProviders(<VisitorsListScreen />);
    await waitFor(() => expect(mock.history.get.length).toBeGreaterThan(0));
    return mock.history.get[0].params;
  }

  it("KPP uchun filial YUBORILMAYDI (ikkala filial mehmonlari ko'rinsin)", async () => {
    const params = await renderFor({
      type: 'employee',
      employee: {
        id: 1, legal_name: 'KPP', is_multi_org_user: true, multi_org_employee_role: 'kpp',
        organization_branches: [{ id: 4, name: 'A' }, { id: 9, name: 'B' }],
      },
    });
    expect(params).toEqual({});
  });

  it('buxgalter (employee-like, multi-org) uchun ham yuborilmaydi', async () => {
    const params = await renderFor({
      type: 'employee',
      employee: {
        id: 2, legal_name: 'Bux', is_multi_org_user: true, multi_org_employee_role: 'accounting',
        organization_branches: [{ id: 4, name: 'A' }, { id: 9, name: 'B' }],
      },
    });
    expect(params).toEqual({});
  });

  it("kadr uchun O'Z filiali yuboriladi (webdagi tanlangan filial ekvivalenti)", async () => {
    const params = await renderFor({
      type: 'employee',
      employee: {
        id: 3, legal_name: 'HR', is_multi_org_user: true, multi_org_employee_role: 'hr',
        organization_branches: [{ id: 4, name: 'A' }],
      },
    });
    expect(params).toEqual({ organization_branch_id: 4 });
  });
});
