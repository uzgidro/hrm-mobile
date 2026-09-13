import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { PHONE_DIRECTORY } from '@/api/urls';
import { phoneDirectoryQuery, directoryKeys } from '../queries';
import type { PhoneDirectoryEntry } from '@/types';

type PageFn = (ctx: { pageParam: number }) => Promise<{ items: PhoneDirectoryEntry[]; total: number }>;
const run = (opts: ReturnType<typeof phoneDirectoryQuery>, page = 1) =>
  (opts.queryFn as unknown as PageFn)({ pageParam: page });

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('directoryKeys', () => {
  it('keeps the stable prefix', () => {
    expect(directoryKeys.all).toEqual(['phone-directory']);
  });

  // Har ko'lam ALOHIDA keshlanishi shart — aks holda filial almashtirilganda
  // react-query eski ko'lamning ma'lumotini qaytarardi.
  it('gives each scope / search its own key', () => {
    expect(phoneDirectoryQuery({ branchId: 14 }).queryKey).toEqual(['phone-directory', 'paged', { branch_id: 14 }]);
    expect(phoneDirectoryQuery({ excludeBranchId: 1 }).queryKey).toEqual(['phone-directory', 'paged', { exclude_branch_id: 1 }]);
    expect(phoneDirectoryQuery({ search: 'ali' }).queryKey).toEqual(['phone-directory', 'paged', { search: 'ali' }]);
    expect(phoneDirectoryQuery({ branchId: 1 }).queryKey).not.toEqual(phoneDirectoryQuery({ branchId: 2 }).queryKey);
  });
});

describe('phoneDirectoryQuery (server-paged)', () => {
  it('fetches a page and unwraps the envelope', async () => {
    mock.onGet(PHONE_DIRECTORY).reply(200, {
      items: [{ id: 1, legal_name: 'Ali Valiyev', internal_phone_number: '101' }], total: 1, page: 1, size: 30, pages: 1,
    });
    const page = await run(phoneDirectoryQuery({ branchId: 14 }));
    expect(page.items).toHaveLength(1);
    expect(page.items[0].legal_name).toBe('Ali Valiyev');
    expect(page.total).toBe(1);
  });

  it('tolerates a bare array (older backend) and a null body', async () => {
    mock.onGet(PHONE_DIRECTORY).reply(200, [{ id: 1, legal_name: 'A' }]);
    expect((await run(phoneDirectoryQuery({ branchId: 14 }))).items).toHaveLength(1);
    mock.reset();
    mock.onGet(PHONE_DIRECTORY).reply(200, null);
    expect((await run(phoneDirectoryQuery({ branchId: 14 }))).items).toEqual([]);
  });

  // Ko'lam bo'yicha yuklash (audit 2026-09-07): butun tashkilot o'rniga faqat
  // kerakli filial so'raladi — endi 30 tadan.
  it('sends branch_id + page/size for a branch scope', async () => {
    let sent: Record<string, unknown> | undefined;
    mock.onGet(PHONE_DIRECTORY).reply((cfg) => { sent = cfg.params; return [200, []]; });
    await run(phoneDirectoryQuery({ branchId: 14 }), 2);
    expect(sent).toEqual({ branch_id: 14, page: 2, size: 30 });
  });

  it('"all system branches" = exclude the head office (exclude_branch_id)', async () => {
    let sent: Record<string, unknown> | undefined;
    mock.onGet(PHONE_DIRECTORY).reply((cfg) => { sent = cfg.params; return [200, []]; });
    await run(phoneDirectoryQuery({ excludeBranchId: 1 }));
    expect(sent).toEqual({ exclude_branch_id: 1, page: 1, size: 30 });
  });

  // Qidiruv BUTUN tashkilot bo'ylab, SERVERDA: ko'lam parametrlari tushib qoladi,
  // `branch_id=null` hech qachon yuborilmaydi (backendda 422).
  it('search drops the scope and is trimmed', async () => {
    let sent: Record<string, unknown> | undefined;
    mock.onGet(PHONE_DIRECTORY).reply((cfg) => { sent = cfg.params; return [200, []]; });
    await run(phoneDirectoryQuery({ branchId: 14, search: ' Ali ' }));
    expect(sent).toEqual({ search: 'Ali', page: 1, size: 30 });
  });
});
