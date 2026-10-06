import { createAppQueryClient } from '../queryClient';
import { toast } from '../toast';

jest.mock('../toast', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

// XATO IKKI MARTA ko'rsatilmasligi kerak.
//
// `queryClient` da global `MutationCache.onError` bor — u HAR QANDAY mutatsiya
// xatosida toast chiqaradi (CLAUDE.md, "Errors & UX states"). Ekran xatoni
// O'ZI ko'rsatsa (o'z `toast.error`i yoki oyna ichidagi matn — OS Alert
// react-native-web'da hech narsa ko'rsatmagani uchun olib tashlandi),
// foydalanuvchi bitta xato uchun ikki xabar ko'rardi.
//
// To'g'ri yechim: xatoni o'zi ko'rsatadigan mutatsiya
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

  // Asosiy invariant: xatoni o'zi ko'rsatadigan mutatsiya global toastni
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

// Xatoni o'zi ko'rsatadigan mutatsiyalar global toastni O'CHIRISHI
// kerak. Bu testda ularning e'lonlari (manba matni) tekshiriladi: hook'ni
// chaqirib bo'lmaydi (RNTL 14 da `renderHook` taqiqlangan — CLAUDE.md), shu
// bois faylni o'qib, har bir hook `meta: { skipErrorToast: true }` bilan
// e'lon qilinganini qulflaymiz.
describe('xatoni o\'zi ko\'rsatadigan mutatsiyalar global toastni o\'chiradi', () => {
  const cases: [string, string[]][] = [
    ['src/features/letters/api/mutations.ts', [
      'useReturnLetter', 'useReturnReport', 'useCancelTrip', 'useExtendTrip',
      'useDecideExtension', 'useSetBasisDecree', 'useDeleteLetter',
      'useSubmitTrip', 'useResetReport', 'useConfirmRegistration',
      'useCreateLetter', 'useUpdateLetter', 'useSubmitReport', 'useConfirmReturn',
      'useSelfConfirmReturn', 'useUpdateReturnDate', 'useAgreeLetter',
      'useSubmitAgreement', 'useSendToRegistry',
    ]],
    ['src/features/support/api/mutations.ts', [
      'useRateTicket', 'useReopenTicket', 'useSendTicketMessage', 'useCreateTicket',
    ]],
    ['src/features/leaves/api/mutations.ts', [
      'useSignLeave', 'useRejectLeave', 'useCreateLeave', 'useDeleteLeave',
    ]],
    ['src/features/orders/api/mutations.ts', [
      'useCreateOrder', 'useUpdateOrder', 'useAddOrderComment',
    ]],
    ['src/features/projects/api/mutations.ts', [
      'useCreateWorkspace', 'useUpdateWorkspace', 'useDeleteWorkspace', 'useCreateColumn',
      'useCreateCard', 'useToggleCardComplete',
    ]],
    ['src/features/profile/api/mutations.ts', ['useUpdateMyProfile']],
    ['src/features/visitors/api/mutations.ts', ['useCreateVisitor', 'useUpdateVisitor', 'useDeleteVisitor']],
    ['src/features/chairmanTasks/api/mutations.ts', [
      'useCreateChairmanTask', 'useUpdateChairmanTask', 'useDeleteChairmanTask',
    ]],
  ];

  it.each(cases)('%s', (file, hooks) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const src: string = require('fs').readFileSync(file, 'utf8');
    for (const h of hooks) {
      const start = src.indexOf(`export function ${h}`);
      expect(start).toBeGreaterThan(-1);
      const next = src.indexOf('export function', start + 10);
      const body = src.slice(start, next > 0 ? next : undefined);
      expect([h, body.includes('skipErrorToast')]).toEqual([h, true]);
    }
  });
});
