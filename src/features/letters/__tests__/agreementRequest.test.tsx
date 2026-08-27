import React from 'react';
import { Alert } from 'react-native';
import MockAdapter from 'axios-mock-adapter';

import { apiClient } from '@/api/client';
import { renderWithProviders, fireEvent, waitFor } from '@/test/renderWithProviders';
import { AgreementSection } from '../components/AgreementSection';
import type { Letter } from '@/types';

// Kelishuv tugmasi HAQIQATDA qanday so'rov yuborishini qulflaydi: yo'l, tana
// va serverning xato matni foydalanuvchiga yetib borishi. Avvalgi testlar
// faqat UI'ni tekshirardi, so'rovning o'zi qoplanmagan edi.
let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

const letter = (over: Partial<Letter> = {}): Letter =>
  ({
    id: 77,
    letter_type: 'application',
    status: 'pending_agreement',
    creator_employee_id: 5,
    assigned_signers: [
      { signer_type: 'addressee', employee_id: 9 },
      { signer_type: 'agreement', employee_id: 1, agreed: null, employee: { id: 1, legal_name: 'Kelishuvchi A.' } },
    ],
    ...over,
  }) as Letter;

async function actOn(testID: 'letter-agree' | 'letter-disagree', comment = 'Roziman') {
  const onChanged = jest.fn();
  const r = await renderWithProviders(
    <AgreementSection letter={letter()} employeeId={1} onChanged={onChanged} />,
  );
  fireEvent.press(r.getByTestId(testID));
  const input = await waitFor(() => r.getByPlaceholderText('Fikringizni yozing...'));
  fireEvent.changeText(input, comment);
  // RNTL 14 / React 19: holat yangilanishi ASINXRON — matn maydonga
  // yozilganini KUTMASDAN "Tasdiqlash" bosilsa, komponent hali bo'sh izohni
  // ko'radi va so'rov umuman ketmaydi (testda ham, haqiqiy qurilmada emas).
  await waitFor(() =>
    expect(r.getByPlaceholderText('Fikringizni yozing...').props.value).toBe(comment));
  fireEvent.press(r.getByTestId('agreement-submit'));
  return { ...r, onChanged };
}

describe('kelishuv so\'rovi', () => {
  it('POST letters/{id}/agree — tanasida faqat izoh', async () => {
    let seen: { url?: string; body?: unknown } = {};
    mock.onPost(/letters\/77\/agree/).reply((cfg) => {
      seen = { url: cfg.url, body: JSON.parse(String(cfg.data)) };
      return [200, { id: 77 }];
    });

    const { onChanged } = await actOn('letter-agree');
    await waitFor(() => expect(seen.url).toBe('letters/77/agree'));
    expect(seen.body).toEqual({ comment: 'Roziman' });
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('rad etish boshqa yo\'lga ketadi', async () => {
    let url: string | undefined;
    mock.onPost(/letters\/77\/disagree/).reply((cfg) => {
      url = cfg.url;
      return [200, { id: 77 }];
    });
    await actOn('letter-disagree', 'Rozimasman');
    await waitFor(() => expect(url).toBe('letters/77/disagree'));
  });

  it('serverning sababi foydalanuvchiga ko\'rsatiladi (umumiy "Xatolik" emas)', async () => {
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mock.onPost(/letters\/77\/agree/).reply(403, {
      code: 'not_authorized',
      message: "Siz bu hujjatning kelishuvchisi emassiz",
    });

    await actOn('letter-agree');
    await waitFor(() => expect(spy).toHaveBeenCalled());
    const [, body] = spy.mock.calls[spy.mock.calls.length - 1];
    expect(body).toBe("Siz bu hujjatning kelishuvchisi emassiz");
    spy.mockRestore();
  });
});
