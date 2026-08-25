import { createAppQueryClient } from '../queryClient';
import { toast } from '../toast';

jest.mock('../toast', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

// XATO IKKI MARTA ko'rsatilmasligi kerak.
//
// `queryClient` da global `MutationCache.onError` bor — u HAR QANDAY mutatsiya
// xatosida toast chiqaradi (CLAUDE.md, "Errors & UX states"). Ayni paytda
// 9 ta faylda mahalliy `onError: Alert.alert(...)` ham bor. Natijada
// foydalanuvchi bitta xato uchun HAM toast, HAM bloklovchi Alert ko'radi.
//
// To'g'ri yechim: mahalliy Alert qoladigan joyda mutatsiya
// `meta: { skipErrorToast: true }` bilan e'lon qilinishi kerak — shunda
// global toast o'chadi va xato BIR marta ko'rinadi.
describe('mutatsiya xatosi bir marta xabar qilinadi', () => {
  beforeEach(() => jest.clearAllMocks());

  it('meta.skipErrorToast bo\'lmasa — global toast chiqadi', async () => {
    const qc = createAppQueryClient();
    await qc
      .getMutationCache()
      .build(qc, { mutationFn: async () => { throw new Error('boom'); } })
      .execute(undefined)
      .catch(() => {});
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  // Asosiy invariant: mahalliy Alert ko'rsatadigan mutatsiya global toastni
  // O'CHIRISHI kerak, aks holda xato ikki marta ko'rinadi.
  it('meta.skipErrorToast bo\'lsa — global toast CHIQMAYDI', async () => {
    const qc = createAppQueryClient();
    await qc
      .getMutationCache()
      .build(qc, {
        mutationFn: async () => { throw new Error('boom'); },
        meta: { skipErrorToast: true },
      })
      .execute(undefined)
      .catch(() => {});
    expect(toast.error).not.toHaveBeenCalled();
  });
});

// Mahalliy `Alert.alert` ko'rsatadigan mutatsiyalar global toastni O'CHIRISHI
// kerak. Bu testda ularning e'lonlari (manba matni) tekshiriladi: hook'ni
// chaqirib bo'lmaydi (RNTL 14 da `renderHook` taqiqlangan — CLAUDE.md), shu
// bois faylni o'qib, har bir hook `meta: { skipErrorToast: true }` bilan
// e'lon qilinganini qulflaymiz.
describe('Alert ko\'rsatadigan mutatsiyalar global toastni o\'chiradi', () => {
  const cases: [string, string[]][] = [
    ['src/features/letters/api/mutations.ts', [
      'useReturnLetter', 'useReturnReport', 'useCancelTrip', 'useExtendTrip',
      'useDecideExtension', 'useSetBasisDecree', 'useDeleteLetter',
      'useSubmitTrip', 'useResetReport', 'useConfirmRegistration',
    ]],
    ['src/features/support/api/mutations.ts', [
      'useRateTicket', 'useReopenTicket', 'useSendTicketMessage',
    ]],
  ];

  it.each(cases)('%s', (file, hooks) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const src: string = require('fs').readFileSync(file, 'utf8');
    for (const h of hooks) {
      const start = src.indexOf(`export function ${h}`);
      expect(start).toBeGreaterThan(-1);
      const body = src.slice(start, start + 500);
      expect([h, body.includes('skipErrorToast')]).toEqual([h, true]);
    }
  });
});
