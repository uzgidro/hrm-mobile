import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import { confirm } from '@/lib/confirm';
import i18n from '@/i18n';
import {
  LOCATION,
  LOCATIONS_LIST,
  ORGANIZATION_BRANCH,
  ORGANIZATION_BRANCHES,
  ORGANIZATION_BRANCH_SYNC_HIK,
} from '@/api/urls';
import BranchesScreen from '../screens/BranchesScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));

const master = { id: 2, type: 'master-admin', employee: { id: 6 } };
const akt = { id: 3, type: 'employee', employee: { id: 7 }, akt_branch_ids: [2] };

const BRANCHES = [
  {
    id: 2,
    name: 'Chorvoq GES',
    region: 'Toshkent',
    regions: ['Toshkent', 'Sirdaryo'],
    address: "Bo'stonliq",
    latitude: 41.6,
    longitude: 70.0,
    is_head_office: true,
    terminal_group: 'bosh-bino',
    department_count: 4,
    employee_count: 120,
    turnstile_count: 3,
  },
  { id: 3, name: 'Farhod GES', region: 'Sirdaryo', regions: ['Sirdaryo'] },
];
const LOCATIONS = [{ id: 11, name: 'Asosiy darvoza', organization_branch_id: 2, address: 'Kirish' }];

describe('BranchesScreen (v2 BranchesPage)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    (confirm as jest.Mock).mockClear();
    useAuthStore.setState({ user: master as never, isAuthenticated: true } as never);
    mock.onGet(ORGANIZATION_BRANCHES).reply(200, BRANCHES);
    mock.onGet(LOCATIONS_LIST).reply(200, LOCATIONS);
  });
  afterEach(() => mock.reset());

  it('ro‘yxat: viloyat · manzil, son; qidiruv nom bo‘yicha (mijozda, qayta so‘rovsiz)', async () => {
    await renderWithProviders(<BranchesScreen />);
    expect(await screen.findByText('Chorvoq GES')).toBeTruthy();
    expect(screen.getByText("Toshkent · Bo'stonliq")).toBeTruthy();
    expect(screen.getByTestId('branches-count')).toHaveTextContent('2 ta filial');
    await fireEvent.changeText(screen.getByPlaceholderText("Filial nomi bo'yicha qidirish"), 'farhod');
    expect(screen.queryByText('Chorvoq GES')).toBeNull();
    expect(screen.getByTestId('branches-count')).toHaveTextContent('1 ta filial');
    expect(mock.history.get.filter((r) => r.url === ORGANIZATION_BRANCHES)).toHaveLength(1);
  });

  it('tafsilot, «Hik’ga yuborish» — tasdiq bilan, keyin bosilmaydi; o‘chirish — tasdiq bilan', async () => {
    mock.onPost(ORGANIZATION_BRANCH_SYNC_HIK(2)).reply(200, { detail: 'queued' });
    mock.onDelete(ORGANIZATION_BRANCH(2)).reply(200, {});
    await renderWithProviders(<BranchesScreen />);
    await fireEvent.press(await screen.findByTestId('branch-row-2'));
    expect(await screen.findByTestId('branch-regions')).toHaveTextContent('Toshkent, Sirdaryo');
    expect(screen.getByText('Bosh filial (Ijro apparati)')).toBeTruthy();
    expect(screen.getByText('120')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('branch-sync'));
    await waitFor(() => expect(mock.history.post.map((r) => r.url)).toEqual([ORGANIZATION_BRANCH_SYNC_HIK(2)]));
    expect(await screen.findByTestId('branch-sync-queued')).toBeTruthy();
    expect(screen.getByTestId('branch-sync').props.accessibilityState?.disabled).toBe(true);

    await fireEvent.press(screen.getByTestId('branch-delete'));
    await waitFor(() => expect(mock.history.delete.map((r) => r.url)).toEqual([ORGANIZATION_BRANCH(2)]));
    expect(confirm).toHaveBeenLastCalledWith(
      expect.objectContaining({
        destructive: true,
        message: "«Chorvoq GES» o'chiriladi. Bu amalni qaytarib bo'lmaydi.",
      }),
    );
  });

  it('o‘chirish rad etilsa so‘rov yo‘q', async () => {
    (confirm as jest.Mock).mockResolvedValueOnce(false);
    await renderWithProviders(<BranchesScreen />);
    await fireEvent.press(await screen.findByTestId('branch-row-3'));
    await fireEvent.press(await screen.findByTestId('branch-delete'));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(mock.history.delete).toHaveLength(0);
  });

  it('yangi filial: nom majburiy; viloyat — filiallar katalogidan, tanlash tartibida; tana v2 bilan aynan', async () => {
    mock.onPost(ORGANIZATION_BRANCHES).reply(200, { id: 9 });
    await renderWithProviders(<BranchesScreen />);
    await fireEvent.press(await screen.findByTestId('branch-new'));
    await fireEvent.press(await screen.findByTestId('branch-form-save'));
    expect(screen.getByTestId('branch-form-error')).toHaveTextContent('Nomni kiriting');
    await fireEvent.changeText(screen.getByTestId('branch-form-name'), ' Yangi GES ');
    await fireEvent.press(screen.getByTestId('branch-form-region-Sirdaryo'));
    await fireEvent.press(screen.getByTestId('branch-form-region-Toshkent'));
    await fireEvent.changeText(screen.getByTestId('branch-form-lat'), '41,2');
    await fireEvent(screen.getByTestId('branch-form-medical'), 'valueChange', true);
    await fireEvent.press(screen.getByTestId('branch-form-save'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({
      name: 'Yangi GES',
      regions: ['Sirdaryo', 'Toshkent'],
      region: 'Sirdaryo',
      address: null,
      latitude: 41.2,
      longitude: null,
      is_head_office: false,
      is_medical_center: true,
      terminal_group: '',
    });
  });

  it('tahrir: noto‘g‘ri koordinata — xato; server xatosi formada', async () => {
    mock.onPatch(ORGANIZATION_BRANCH(2)).reply(404, { code: 'organization_branch_not_found', detail: 'x' });
    await renderWithProviders(<BranchesScreen />);
    await fireEvent.press(await screen.findByTestId('branch-row-2'));
    await fireEvent.press(await screen.findByTestId('branch-edit'));
    await fireEvent.changeText(await screen.findByTestId('branch-form-lon'), 'abc');
    await fireEvent.press(screen.getByTestId('branch-form-save'));
    expect(screen.getByTestId('branch-form-error')).toHaveTextContent("Koordinata son bo'lishi kerak", {
      exact: false,
    });
    expect(mock.history.patch).toHaveLength(0);
    await fireEvent.changeText(screen.getByTestId('branch-form-lon'), '70');
    await fireEvent.press(screen.getByTestId('branch-form-save'));
    expect(await screen.findByText('Filial topilmadi')).toBeTruthy();
    expect(JSON.parse(mock.history.patch[0]!.data)).toMatchObject({
      name: 'Chorvoq GES',
      regions: ['Toshkent', 'Sirdaryo'],
      region: 'Toshkent',
      is_head_office: true,
      terminal_group: 'bosh-bino',
    });
  });

  it("AKT xodimi: qo'shish va o'chirish yo'q, tahrir va Hik'ga yuborish bor", async () => {
    useAuthStore.setState({ user: akt as never } as never);
    await renderWithProviders(<BranchesScreen />);
    await fireEvent.press(await screen.findByTestId('branch-row-2'));
    expect(await screen.findByTestId('branch-edit')).toBeTruthy();
    expect(screen.getByTestId('branch-sync')).toBeTruthy();
    expect(screen.queryByTestId('branch-delete')).toBeNull();
    expect(screen.queryByTestId('branch-new')).toBeNull();
  });

  it("oddiy xodim — «Ruxsat yo'q» (v2 RequireRole)", async () => {
    useAuthStore.setState({ user: { id: 9, type: 'employee', employee: { id: 1 } } as never } as never);
    await renderWithProviders(<BranchesScreen />);
    expect(await screen.findByText("Bu bo'lim faqat tizim administratori uchun.")).toBeTruthy();
    expect(mock.history.get).toHaveLength(0);
  });

  it('manzillar: filial · manzil; yangi manzil filial bilan; o‘chirish — tasdiq bilan', async () => {
    mock.onPost(LOCATIONS_LIST).reply(200, { id: 12 });
    mock.onDelete(LOCATION(11)).reply(200, {});
    await renderWithProviders(<BranchesScreen />);
    await fireEvent.press(await screen.findByText('Manzillar'));
    expect(await screen.findByText('Asosiy darvoza')).toBeTruthy();
    expect(await screen.findByText('Chorvoq GES · Kirish')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('location-new'));
    await fireEvent.changeText(await screen.findByTestId('location-form-name'), 'Orqa darvoza');
    await fireEvent.press(screen.getByTestId('location-form-branch'));
    await fireEvent.press(await screen.findByText('Farhod GES'));
    await fireEvent.press(screen.getByTestId('location-form-save'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({
      name: 'Orqa darvoza',
      organization_branch_id: 3,
      address: null,
      latitude: null,
      longitude: null,
    });

    await fireEvent.press(await screen.findByTestId('location-row-11'));
    expect(await screen.findByTestId('location-branch')).toHaveTextContent('Chorvoq GES');
    await fireEvent.press(screen.getByTestId('location-delete'));
    await waitFor(() => expect(mock.history.delete.map((r) => r.url)).toEqual([LOCATION(11)]));
    expect(confirm).toHaveBeenLastCalledWith(expect.objectContaining({ destructive: true }));
  });
});
