import React from 'react';
import MockAdapter from 'axios-mock-adapter';

import { apiClient } from '@/api/client';
import { confirm } from '@/lib/confirm';
import { renderWithProviders, fireEvent, waitFor } from '@/test/renderWithProviders';
import { TripMovementsSection } from '../components/TripMovementsSection';
import type { Letter } from '@/types';

// Ilova ichidagi tasdiq (OS Alert web'da hech narsa ko'rsatmasdi).
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));

// Safarni yakunlashda QAYSI KUNI qaytgani. Foydalanuvchi hisoboti 2026-08-27:
// xodim 27-da qaytib, yakunlashni 28-da bosса, sana 28 bo'lib yozilardi.
// Backend endi o'tilgan kunlar ro'yxatini beradi (`self_finish_date_options`),
// ilova esa shulardan tanlatadi.
let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(apiClient);
  mock.onGet(/letters\/5\/trip-movements/).reply(200, []);
});
afterEach(() => mock.restore());

const trip = (actions: Record<string, unknown>): Letter =>
  ({
    id: 5,
    letter_type: 'business_trip',
    status: 'management_approved',
    creator_employee_id: 1,
    departure_date: '2026-08-24',
    arrival_date: '2026-08-30',
    is_trip_confirmed: false,
    available_actions: { can_self_finish_trip: true, ...actions },
  }) as unknown as Letter;

async function pressSelfFinish(letter: Letter) {
  const r = await renderWithProviders(
    // `user` — oddiy xodim (null). Bu testlar AYNAN xodimning o'zi safarni
    // yakunlash oqimini tekshiradi (`can_self_finish_trip`), admin yo'lini
    // emas: TripMovementsSection'da `user` faqat isSiteMasterAdmin /
    // isBranchHr uchun kerak, ular bu yerda ishlamasligi KERAK.
    <TripMovementsSection letter={letter} user={null} onChanged={() => {}} />,
  );
  fireEvent.press(await waitFor(() => r.getByText('Safarni yakunlash')));
  return r;
}

describe('safarni yakunlash — qaytgan kun', () => {
  beforeEach(() => (confirm as jest.Mock).mockClear());
  it('bir necha kun o\'tilgan bo\'lsa KUN TANLATADI va tanlangani yuboriladi', async () => {
    let body: unknown;
    mock.onPost(/letters\/5\/self-confirm-return/).reply((cfg) => {
      body = JSON.parse(String(cfg.data));
      return [200, { id: 5 }];
    });

    const r = await pressSelfFinish(trip({
      self_finish_date: '2026-08-28',
      self_finish_date_options: ['2026-08-27', '2026-08-28'],
    }));

    // Oyna kunlar ro'yxati bilan ochiladi (ikki tugmali tasdiq emas).
    await waitFor(() => r.getByText('Qaysi kuni qaytgansiz?'));
    expect(r.getByText('27.08.2026')).toBeTruthy();
    expect(r.getByText('28.08.2026')).toBeTruthy();
    expect(confirm).not.toHaveBeenCalled();

    fireEvent.press(r.getByTestId('self-finish-day-2026-08-27'));   // xodim 27-ni tanladi
    await waitFor(() =>
      expect(r.getByTestId('self-finish-day-2026-08-27').props.accessibilityState).toEqual({ selected: true }));
    fireEvent.press(r.getByTestId('trip-return-submit'));
    await waitFor(() => expect(body).toEqual({ return_date: '2026-08-27' }));
  });

  it('bitta kun bo\'lsa — eskicha oddiy tasdiq (sana serverdan)', async () => {
    let body: unknown = 'YUBORILMADI';
    mock.onPost(/letters\/5\/self-confirm-return/).reply((cfg) => {
      body = cfg.data ? JSON.parse(String(cfg.data)) : null;
      return [200, { id: 5 }];
    });

    await pressSelfFinish(trip({
      self_finish_date: '2026-08-27',
      self_finish_date_options: ['2026-08-27'],
    }));

    await waitFor(() => expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ confirmLabel: 'Ha, yakunlayman', cancelLabel: 'Bekor' })));
    await waitFor(() => expect(body).not.toBe('YUBORILMADI'));
  });

  it('tasdiq bekor qilinsa — so\'rov ketmaydi', async () => {
    (confirm as jest.Mock).mockResolvedValueOnce(false);
    let sent = false;
    mock.onPost(/letters\/5\/self-confirm-return/).reply(() => { sent = true; return [200, {}]; });
    await pressSelfFinish(trip({ self_finish_date: '2026-08-27', self_finish_date_options: ['2026-08-27'] }));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    await new Promise((res) => setTimeout(res, 0));
    expect(sent).toBe(false);
  });
});
