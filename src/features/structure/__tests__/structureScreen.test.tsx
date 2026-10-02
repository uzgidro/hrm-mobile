import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import { DEPARTMENTS_LIST, HIERARCHIES, JOB_POSITIONS_LIST, ORGANIZATION_BRANCHES } from '@/api/urls';
import StructureScreen from '../screens/StructureScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));

const setUser = (u: Record<string, unknown>) => useAuthStore.setState({ user: u as never, isAuthenticated: true } as never);
const employee = { id: 2, type: 'employee', employee: { id: 2, primary_organization_branch_id: 1 } };
const last = (mock: MockAdapter, url: string) => mock.history.get.filter((r) => r.url === url).at(-1)?.params;

describe('StructureScreen (v2 StructurePage)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    mock.onGet(DEPARTMENTS_LIST).reply(200, {
      items: [
        {
          id: 4,
          name: "Kadrlar bo'limi",
          index: 3,
          code: '03',
          is_secretariat: true,
          heads: [{ id: 9, legal_name: 'Karimov Vali' }],
          created_at: '2024-02-01T10:00:00',
        },
      ],
      total: 1,
      pages: 1,
    });
    mock.onGet(JOB_POSITIONS_LIST).reply(200, {
      items: [{ id: 7, name: 'Bosh mutaxassis', short_name: 'Bosh mut.', razryad: 12, category: 'mutaxassis' }],
      total: 1,
      pages: 1,
    });
    mock.onGet(ORGANIZATION_BRANCHES).reply(200, [{ id: 1, name: 'Ijro apparati' }]);
    mock.onGet(HIERARCHIES).reply(200, [
      { id: 1, name: 'Boshqaruv', outgoing_connections: [{ id: 1, source_id: 1, target_id: 2 }], incoming_connections: [] },
      {
        id: 2,
        name: "Kadrlar bo'limi tuguni",
        planned_units: '5.00',
        occupied_units: '4.00',
        vacant_units: '1.00',
        outgoing_connections: [],
        incoming_connections: [{ id: 1, source_id: 1, target_id: 2 }],
      },
    ]);
  });
  afterEach(() => mock.reset());

  it("bo'limlar: ro'yxat, sahifa paramlari; tafsilot — rahbar, kod, belgi", async () => {
    setUser(employee);
    await renderWithProviders(<StructureScreen />);
    expect(await screen.findByText("Kadrlar bo'limi")).toBeTruthy();
    expect(last(mock, DEPARTMENTS_LIST)).toEqual({ page: 1, size: 25 });
    await fireEvent.press(screen.getByText("Kadrlar bo'limi"));
    expect(await screen.findByText('03')).toBeTruthy();
    expect(screen.getAllByText('Karimov Vali')).toHaveLength(2); // ro'yxat izohi + tafsilot
    expect(screen.getByText(i18n.t('structure.flagSecretariat'))).toBeTruthy();
  });

  it("«Yopilganlar» chipi → include_closed", async () => {
    setUser(employee);
    await renderWithProviders(<StructureScreen />);
    await screen.findByText("Kadrlar bo'limi");
    await fireEvent.press(screen.getByTestId('structure-closed'));
    await waitFor(() => expect(last(mock, DEPARTMENTS_LIST)).toEqual({ page: 1, size: 25, include_closed: true }));
  });

  it('lavozimlar tabi: toifa filtri → category', async () => {
    setUser(employee);
    await renderWithProviders(<StructureScreen />);
    await fireEvent.press(await screen.findByText(i18n.t('structure.tabPositions')));
    expect(await screen.findByText('Bosh mutaxassis')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('category-rahbar'));
    await waitFor(() => expect(last(mock, JOB_POSITIONS_LIST)).toEqual({ page: 1, size: 25, category: 'rahbar' }));
  });

  it('sxema tabi: foydalanuvchi filiali bo\'yicha daraxt, birliklar', async () => {
    setUser(employee);
    await renderWithProviders(<StructureScreen />);
    await fireEvent.press(await screen.findByText(i18n.t('structure.tabChart')));
    expect(await screen.findByText("Kadrlar bo'limi tuguni")).toBeTruthy();
    expect(last(mock, HIERARCHIES)).toEqual({ organization_branch_id: 1 });
    expect(screen.getByText(i18n.t('structure.units', { occupied: '4', planned: '5', vacant: '1' }))).toBeTruthy();
  });

  it("oddiy xodim — yozish tugmalari yo'q", async () => {
    setUser(employee);
    await renderWithProviders(<StructureScreen />);
    await screen.findByText("Kadrlar bo'limi");
    expect(screen.queryByTestId('structure-add')).toBeNull();
  });
});
