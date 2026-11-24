import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { router } from 'expo-router';
import { fireEvent } from '@testing-library/react-native';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import { ORDER_ACTS, SUPPORT_TICKETS, TASKS_OVERDUE } from '@/api/urls';
import { ModuleFace } from '../ModuleFace';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const mock = new MockAdapter(apiClient);

beforeEach(async () => {
  await i18n.changeLanguage('uz-Latn');
  useAuthStore.setState({
    user: { id: 1, type: 'employee', employee: { id: 7, legal_name: 'Test' } } as never,
    isAuthenticated: true,
  } as never);
});
afterEach(() => {
  mock.reset();
  jest.clearAllMocks();
});

describe('ModuleFace', () => {
  it('draws rows and opens the order detail; "all" opens the module', async () => {
    mock.onGet(ORDER_ACTS).reply(200, {
      items: [{ id: 7, status: 'confirmed', act_number: 12, summary: 'Mehnat ta’tili', category_rel: { id: 1, name: 'Buyruq' } }],
      total: 1,
    });
    await renderWithProviders(<ModuleFace page="orders" />);
    const row = await screen.findByTestId('face-orders-row-7');
    expect(screen.getByText('Buyruq · №12')).toBeTruthy();
    await fireEvent.press(row);
    expect(router.push).toHaveBeenCalledWith({ pathname: '/order-detail', params: { id: '7' } });
    await fireEvent.press(screen.getByRole('link'));
    expect(router.push).toHaveBeenLastCalledWith('/documents?seg=orders');
  });

  it('title overrides the module label', async () => {
    mock.onGet(ORDER_ACTS).reply(200, { items: [], total: 0 });
    await renderWithProviders(<ModuleFace page="orders" title="Mening buyruqlarim" />);
    expect(await screen.findByText('Mening buyruqlarim')).toBeTruthy();
  });

  it('shows a short empty text', async () => {
    mock.onGet(SUPPORT_TICKETS).reply(200, { items: [], total: 0 });
    await renderWithProviders(<ModuleFace page="support" />);
    expect(await screen.findByTestId('face-support-empty')).toHaveTextContent("Ochiq murojaatlar yo'q");
  });

  it('shows an error with a retry that asks again', async () => {
    mock.onGet(TASKS_OVERDUE).reply(500);
    await renderWithProviders(<ModuleFace page="ijro" />);
    const retry = await screen.findByTestId('face-ijro-retry');
    expect(screen.getByText("Yuklab bo'lmadi")).toBeTruthy();
    const before = mock.history.get.length;
    await fireEvent.press(retry);
    await screen.findByTestId('face-ijro-retry');
    expect(mock.history.get.length).toBeGreaterThan(before);
  });

  it('directory asks for nothing until two characters are typed', async () => {
    await renderWithProviders(<ModuleFace page="directory" />);
    expect(await screen.findByTestId('face-directory-hint')).toBeTruthy();
    expect(mock.history.get).toHaveLength(0);
  });
});
