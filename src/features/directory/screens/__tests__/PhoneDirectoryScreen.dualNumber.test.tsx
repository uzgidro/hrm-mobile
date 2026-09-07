// Ikki raqamli tanlov (foydalanuvchi so'rovi 2026-09-07).
//
// Qator ilgari `internal_phone_number || phone_number` ko'rsatardi, ya'ni ichki
// raqami bor xodimning SHAXSIY raqamiga umuman yetib bo'lmasdi. Endi ikkalasi
// ham bo'lsa bosish tanlov oynasini ochadi; bitta raqam bo'lsa — to'g'ridan
// qo'ng'iroq (ortiqcha bosish qo'shilmasin).
import React from 'react';
import { Linking } from 'react-native';
import MockAdapter from 'axios-mock-adapter';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { apiClient } from '@/api/client';
import { PHONE_DIRECTORY, ORGANIZATION_BRANCHES } from '@/api/urls';
import { renderWithProviders } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import PhoneDirectoryScreen from '../PhoneDirectoryScreen';

const EXEC_BRANCH = { id: 1, name: "\"O'zbekgidroenergo\" AJ" };

const ROWS = [
  // Ikkala raqam ham bor — tanlov chiqishi kerak.
  { id: 1, legal_name: 'Ikki Raqamli', branch_id: 1, internal_phone_number: '573', phone_number: '998901234567' },
  // Faqat ichki — to'g'ridan qo'ng'iroq.
  { id: 2, legal_name: 'Faqat Ichki', branch_id: 1, internal_phone_number: '715' },
  // Faqat shaxsiy — to'g'ridan qo'ng'iroq.
  { id: 3, legal_name: 'Faqat Shaxsiy', branch_id: 1, phone_number: '998907654321' },
];

describe('PhoneDirectoryScreen — ikki raqam', () => {
  const mock = new MockAdapter(apiClient);

  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    useAuthStore.setState({
      user: { type: 'employee', employee: { id: 99, legal_name: 'Test' } } as any,
      isAuthenticated: true,
    } as any);
    mock.reset();
    mock.onGet(ORGANIZATION_BRANCHES).reply(200, [EXEC_BRANCH]);
    mock.onGet(PHONE_DIRECTORY).reply(200, ROWS);
  });

  afterEach(() => jest.restoreAllMocks());

  it('ikkita raqam bo\'lsa tanlov ochiladi va tanlangani teriladi', async () => {
    const screen = await renderWithProviders(<PhoneDirectoryScreen />);
    const row = await screen.findByText('Ikki Raqamli');
    expect(row).toBeTruthy();

    // Qatorda ichki raqam ko'rinadi (birinchi), bosamiz.
    fireEvent.press(await screen.findByText('573'));

    // Ikkala raqam ham oynada — SHAXSIY raqam endi ko'rinadi.
    const personal = await screen.findByText('998901234567');
    expect(personal).toBeTruthy();

    fireEvent.press(personal);
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith('tel:998901234567'));
  });

  it('bitta raqam bo\'lsa darhol teriladi (tanlov chiqmaydi)', async () => {
    const screen = await renderWithProviders(<PhoneDirectoryScreen />);
    fireEvent.press(await screen.findByText('715'));
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith('tel:715'));
  });

  it('faqat shaxsiy raqamli xodim ham teriladi', async () => {
    const screen = await renderWithProviders(<PhoneDirectoryScreen />);
    fireEvent.press(await screen.findByText('998907654321'));
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith('tel:998907654321'));
  });
});
