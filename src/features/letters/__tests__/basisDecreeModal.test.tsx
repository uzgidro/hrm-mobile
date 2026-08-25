import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types';
import { LetterDetailView } from '../components/LetterDetailView';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

// ASOS BUYRUQ oynasi (KADR safarga buyruq raqami+sanasini kiritadi).
//
// Bu test XULQNI qulflaydi, chunki oyna alohida komponentga chiqarildi
// (`BasisDecreeModal`) — ilgari u `LetterDetailView` ichida 47 qator inline
// JSX edi, yonidagi `ReasonModal`/`ConfirmRegistrationModal` esa allaqachon
// alohida komponent edi. Refaktordan OLDIN yozilgan: agar chiqarish paytida
// xulq o'zgarsa, test yiqiladi.
//
// Qoida (`utils/tripStatus.canSetBasisDecree`): FAQAT xizmat safari va FAQAT
// KADR (o'z filialida) yoki sayt master-admini. Bosqich cheklovi YO'Q.
const HR_USER = {
  id: 1,
  type: 'employee',
  employee: {
    id: 10,
    is_multi_org_user: true,
    multi_org_employee_role: 'hr',
    organization_branches: [{ id: 3 }],
  },
} as unknown as User;

const TRIP = {
  id: 1,
  status: 'management_approved',
  letter_type: 'business_trip',
  organization_branch_id: 3,
};

describe('Asos buyruq oynasi (BasisDecreeModal)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(() => {
    useAuthStore.setState({ user: HR_USER, isAuthenticated: true } as never);
    mock.onGet(new RegExp('letters/1/trip-movements')).reply(200, []);
    mock.onGet(new RegExp('letters/1')).reply(200, TRIP);
  });
  afterEach(() => mock.reset());

  it('KADR uchun tugma ko\'rinadi va oynani ochadi', async () => {
    const { findByTestId } = await renderWithProviders(<LetterDetailView id={1} embedded />);
    fireEvent.press(await findByTestId('letter-basis-decree'));
    // Oyna ochilgach raqam maydoni paydo bo'ladi.
    expect(await findByTestId('basis-decree-number')).toBeTruthy();
  }, 15000);

  // Eng muhim qoida: IKKALA maydon ham majburiy. Faqat raqam kiritilsa
  // (sana yo'q) — saqlash tugmasi O'CHIQ bo'lishi kerak, aks holda backend
  // 422 qaytaradi.
  it('faqat raqam kiritilsa — saqlash O\'CHIQ (sana ham majburiy)', async () => {
    const { findByTestId } = await renderWithProviders(<LetterDetailView id={1} embedded />);
    fireEvent.press(await findByTestId('letter-basis-decree'));
    fireEvent.changeText(await findByTestId('basis-decree-number'), '12-K');

    const submit = await findByTestId('basis-decree-submit');
    await waitFor(() => expect(submit.props.accessibilityState?.disabled).toBe(true));

    // Bosilsa ham so'rov KETMASLIGI kerak.
    fireEvent.press(submit);
    expect(mock.history.post.filter((r) => /basis-decree/.test(r.url ?? ''))).toHaveLength(0);
  }, 15000);
});
