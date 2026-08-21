import React from 'react';
import { renderWithProviders, fireEvent, waitFor } from '@/test/renderWithProviders';
import { AgreementSection } from '../components/AgreementSection';
import type { Letter } from '@/types';

// Bildirgi/ariza kelishuvi mobilда umuman yo'q edi: kelishuvchi hujjatni
// kelisha olmasdi (eski "Imzolash" tugmasi esa backendда 400 berardi).
const letter = (over: Partial<Letter> = {}): Letter =>
  ({
    id: 77,
    letter_type: 'application',
    status: 'pending_agreement',
    creator_employee_id: 5,
    assigned_signers: [
      { signer_type: 'addressee', employee_id: 9, employee: { id: 9, legal_name: 'Rahbar R.' } },
      { signer_type: 'agreement', employee_id: 1, agreed: null, employee: { id: 1, legal_name: 'Kelishuvchi A.' } },
      { signer_type: 'agreement', employee_id: 2, agreed: true, comment: 'Roziman', employee: { id: 2, legal_name: 'Kelishuvchi B.' } },
    ],
    ...over,
  }) as Letter;

describe('AgreementSection', () => {
  it('kelishuvchilar va ularning holati ko\'rinadi (adresat bu ro\'yxatda emas)', async () => {
    const { getByText, queryByText } = await renderWithProviders(
      <AgreementSection letter={letter()} employeeId={1} onChanged={() => {}} />,
    );
    getByText('Kelishuvchi A.');
    getByText('Kelishuvchi B.');
    getByText('Roziman');
    expect(queryByText('Rahbar R.')).toBeNull();
  });

  it('kelishmagan kelishuvchiga tugmalar chiqadi, izoh MAJBURIY', async () => {
    const { getByTestId, getByText } = await renderWithProviders(
      <AgreementSection letter={letter()} employeeId={1} onChanged={() => {}} />,
    );
    fireEvent.press(getByTestId('letter-agree'));
    await waitFor(() => getByText('Izoh (majburiy)'));
  });

  it('kelishib bo\'lgan xodimga tugma chiqmaydi', async () => {
    const { queryByTestId } = await renderWithProviders(
      <AgreementSection letter={letter()} employeeId={2} onChanged={() => {}} />,
    );
    expect(queryByTestId('letter-agree')).toBeNull();
  });

  it('muallifga qoralamada "Kelishuvga yuborish" chiqadi', async () => {
    const { getByTestId } = await renderWithProviders(
      <AgreementSection letter={letter({ status: 'draft' })} employeeId={5} onChanged={() => {}} />,
    );
    getByTestId('letter-submit-agreement');
  });

  it('hamma kelishgach muallifga "Devonxonaga yuborish" chiqadi', async () => {
    const all = letter({
      status: 'signed',
      assigned_signers: [
        { signer_type: 'addressee', employee_id: 9 },
        { signer_type: 'agreement', employee_id: 1, agreed: true },
      ],
    });
    const { getByTestId } = await renderWithProviders(
      <AgreementSection letter={all} employeeId={5} onChanged={() => {}} />,
    );
    getByTestId('letter-send-registry');
  });

  it('xizmat safarida umuman chizilmaydi', async () => {
    // renderWithProviders provayderlarni o'raydi, shu bois `toJSON()` hech
    // qachon null bo'lmaydi — bo'lim MAZMUNI yo'qligini tekshiramiz.
    const { queryByText, queryByTestId } = await renderWithProviders(
      <AgreementSection letter={letter({ letter_type: 'business_trip' })} employeeId={1} onChanged={() => {}} />,
    );
    expect(queryByText('Kelishuv')).toBeNull();
    expect(queryByText('Kelishuvchi A.')).toBeNull();
    expect(queryByTestId('letter-agree')).toBeNull();
  });
});
