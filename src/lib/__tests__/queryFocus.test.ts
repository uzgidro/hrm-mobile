import { AppState } from 'react-native';
import { focusManager } from '@tanstack/react-query';
import { wireQueryFocusToAppState } from '../queryFocus';

// FONDA POLLING TO'XTASHI KERAK.
//
// Ilovada 7 ta `refetchInterval` bor (buyruqlar/xatlar/bildirishnomalar/menyu
// nishonlari/texnik yordam/terminallar), ularning ba'zilari — masalan menyu
// nishonlari — `app/(tabs)/_layout.tsx` da DOIM osilgan. React Native da
// TanStack Query `focusManager` ni `AppState` ga O'ZI ULAMAYDI (web dagi
// `visibilitychange` bu yerda yo'q), shu bois ilova YIG'ILGANDA ham taymerlar
// tarmoqqa urib turaveradi — bu batareya va mobil trafik.
//
// Bu test ulanishni qulflaydi: `active` → fokus bor, `background` → yo'q.
describe('query focus ↔ AppState', () => {
  let cleanup: (() => void) | undefined;
  afterEach(() => { cleanup?.(); cleanup = undefined; });

  it('AppState o\'zgarishi focusManager ga uzatiladi', () => {
    let handler: ((s: string) => void) | undefined;
    const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation(
      ((_e: string, cb: (s: string) => void) => {
        handler = cb;
        return { remove: jest.fn() };
      }) as never,
    );

    cleanup = wireQueryFocusToAppState();
    expect(typeof handler).toBe('function');

    handler!('background');
    expect(focusManager.isFocused()).toBe(false);

    handler!('active');
    expect(focusManager.isFocused()).toBe(true);

    spy.mockRestore();
  });

  it('cleanup obunani uzadi', () => {
    const remove = jest.fn();
    const spy = jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove } as never);
    wireQueryFocusToAppState()();
    expect(remove).toHaveBeenCalled();
    spy.mockRestore();
  });
});
