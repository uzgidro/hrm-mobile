import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import { confirm } from '@/lib/confirm';
import { DEPARTMENTS_LIST, JOB_POSITIONS_LIST, ORGANIZATION_BRANCHES } from '@/api/urls';
import StructureScreen from '../screens/StructureScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));

const hr = { id: 1, type: 'employee', employee: { id: 1, primary_organization_branch_id: 1, is_multi_org_user: true, multi_org_employee_role: 'hr' } };
const setUser = (u: Record<string, unknown>) => useAuthStore.setState({ user: u as never, isAuthenticated: true } as never);

describe('StructureScreen — yozish (canManageStructure)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    (confirm as jest.Mock).mockClear();
    mock.onGet(DEPARTMENTS_LIST).reply(200, {
      items: [
        { id: 4, name: "Kadrlar bo'limi", organization_branch_id: 1 },
        { id: 6, name: 'Arxiv', organization_branch_id: 1, closed_at: '2026-01-01T00:00:00' },
      ],
      total: 2,
      pages: 1,
    });
    mock.onGet(JOB_POSITIONS_LIST).reply(200, { items: [], total: 0 });
    mock.onGet(ORGANIZATION_BRANCHES).reply(200, [{ id: 1, name: 'Ijro apparati' }]);
    mock.onPost(DEPARTMENTS_LIST).reply(200, { id: 10 });
    mock.onPost(`${DEPARTMENTS_LIST}/4/close`).reply(200, {});
    mock.onPost(`${DEPARTMENTS_LIST}/6/reopen`).reply(200, {});
  });
  afterEach(() => mock.reset());

  it("yangi bo'lim: FAB → forma → POST, filial — foydalanuvchiniki", async () => {
    setUser(hr);
    await renderWithProviders(<StructureScreen />);
    await screen.findByText("Kadrlar bo'limi");
    await fireEvent.press(screen.getByTestId('structure-add'));
    await fireEvent.changeText(screen.getByTestId('structure-name'), 'Yangi bo\'lim');
    await fireEvent.press(screen.getByTestId('structure-save'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0].data)).toMatchObject({ name: "Yangi bo'lim", organization_branch_id: 1, index: null });
  });

  it("nom bo'sh — so'rov yo'q, xato matni", async () => {
    setUser(hr);
    await renderWithProviders(<StructureScreen />);
    await screen.findByText("Kadrlar bo'limi");
    await fireEvent.press(screen.getByTestId('structure-add'));
    await fireEvent.press(screen.getByTestId('structure-save'));
    expect(await screen.findByText(i18n.t('structure.nameRequired'))).toBeTruthy();
    expect(mock.history.post).toHaveLength(0);
  });

  it('qisqartirish: sabab bilan POST {reason}', async () => {
    setUser(hr);
    await renderWithProviders(<StructureScreen />);
    await fireEvent.press(await screen.findByText("Kadrlar bo'limi"));
    await fireEvent.press(await screen.findByTestId('structure-close'));
    await fireEvent.changeText(screen.getByTestId('structure-close-reason'), '  Qayta tashkil etish ');
    await fireEvent.press(screen.getByTestId('structure-close-confirm'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(mock.history.post[0].url).toBe(`${DEPARTMENTS_LIST}/4/close`);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ reason: 'Qayta tashkil etish' });
  });

  it('qisqartirilgan bo\'lim — Qayta ochish (tasdiq bilan)', async () => {
    setUser(hr);
    await renderWithProviders(<StructureScreen />);
    await fireEvent.press(await screen.findByText('Arxiv'));
    await fireEvent.press(await screen.findByTestId('structure-reopen'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(confirm).toHaveBeenCalled();
    expect(mock.history.post[0].url).toBe(`${DEPARTMENTS_LIST}/6/reopen`);
  });
});
