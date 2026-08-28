import React from 'react';
import { Alert } from 'react-native';
import MockAdapter from 'axios-mock-adapter';

import { apiClient } from '@/api/client';
import { renderWithProviders, fireEvent, waitFor } from '@/test/renderWithProviders';
import { TripMovementsSection } from '../components/TripMovementsSection';
import type { Letter } from '@/types';

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
    <TripMovementsSection letter={letter} onChanged={() => {}} />,
  );
  fireEvent.press(await waitFor(() => r.getByText('Safarni yakunlash')));
  return r;
}

describe('safarni yakunlash — qaytgan kun', () => {
  it('bir necha kun o\'tilgan bo\'lsa KUN TANLATADI va tanlangani yuboriladi', async () => {
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    let body: unknown;
    mock.onPost(/letters\/5\/self-confirm-return/).reply((cfg) => {
      body = JSON.parse(String(cfg.data));
      return [200, { id: 5 }];
    });

    await pressSelfFinish(trip({
      self_finish_date: '2026-08-27',
      self_finish_date_options: ['2026-08-27', '2026-08-28'],
    }));

    const [, , buttons] = spy.mock.calls[spy.mock.calls.length - 1] as unknown as [
      string, string, { text: string; onPress?: () => void }[],
    ];
    expect(buttons.map((b) => b.text)).toEqual(['27.08.2026', '28.08.2026', 'Bekor']);

    buttons[0].onPress?.();     // xodim 27-ni tanladi
    await waitFor(() => expect(body).toEqual({ return_date: '2026-08-27' }));
    spy.mockRestore();
  });

  it('bitta kun bo\'lsa — eskicha oddiy tasdiq (sana serverdan)', async () => {
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    let body: unknown = 'YUBORILMADI';
    mock.onPost(/letters\/5\/self-confirm-return/).reply((cfg) => {
      body = cfg.data ? JSON.parse(String(cfg.data)) : null;
      return [200, { id: 5 }];
    });

    await pressSelfFinish(trip({
      self_finish_date: '2026-08-27',
      self_finish_date_options: ['2026-08-27'],
    }));

    const [, , buttons] = spy.mock.calls[spy.mock.calls.length - 1] as unknown as [
      string, string, { text: string; onPress?: () => void }[],
    ];
    expect(buttons.map((b) => b.text)).toEqual(['Bekor', 'Ha, yakunlayman']);
    buttons[1].onPress?.();
    await waitFor(() => expect(body).not.toBe('YUBORILMADI'));
    spy.mockRestore();
  });
});
