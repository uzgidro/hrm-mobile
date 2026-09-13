import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { LETTERS_LIST, LETTER_DETAIL, EMPLOYEES_LIST, ORGANIZATION_BRANCH_LEADERS } from '@/api/urls';
import {
  letterKeys, lettersListQuery, lettersListServerParams, letterDetailQuery,
  letterSignersQuery, letterAgreementSignersQuery, letterSubmittersQuery, letterRahbariyatQuery,
} from '../queries';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('letterKeys', () => {
  it('keeps `all` equal to the legacy ["letters"] key so existing invalidations still prefix-match', () => {
    expect(letterKeys.all).toEqual(['letters']);
  });

  it("ro'yxat kaliti SERVER parametrlarini o'z ichiga oladi (tab/tur/status/qidiruv)", () => {
    expect(letterKeys.list({ tab: 'action' })).toEqual(['letters', 'list', { action_required: true }]);
    expect(letterKeys.list({ tab: 'mine', employeeId: 7, letterType: 'all', status: 'all', search: ' ' }))
      .toEqual(['letters', 'list', { employee_id: 7 }]);
  });

  it('places the detail under `all` so a single invalidate refreshes list + detail', () => {
    expect(letterKeys.detail(42)).toEqual(['letters', 'detail', 42]);
    expect(letterKeys.detail(42).slice(0, 1)).toEqual(letterKeys.all);
    expect(letterKeys.list({ tab: 'all' }).slice(0, 1)).toEqual(letterKeys.all);
  });
});

describe('lettersListServerParams', () => {
  it('"Menda" → action_required=true (server SQL twin of the yellow-row flag)', () => {
    expect(lettersListServerParams({ tab: 'action', employeeId: 7 })).toMatchObject({ action_required: true, employee_id: undefined });
  });
  it('"Mening" → employee_id (author OR submitter — web v1 parity)', () => {
    expect(lettersListServerParams({ tab: 'mine', employeeId: 7 })).toMatchObject({ employee_id: 7, action_required: undefined });
  });
  it('type/status/search map 1:1; blanks and "all" are dropped by cleanParams', () => {
    expect(lettersListServerParams({ tab: 'all', letterType: 'business_trip', status: 'pending', search: ' 23-741 ' }))
      .toEqual({ action_required: undefined, employee_id: undefined, letter_type: 'business_trip', status: 'pending', search: '23-741' });
  });
});

describe('lettersListQuery', () => {
  it('sahifalangan: page/size + server filtrlari yuboriladi, konvert ochiladi', async () => {
    const opts = lettersListQuery({ tab: 'action', status: 'pending', employeeId: 7 });
    mock.onGet(LETTERS_LIST).reply(200, { items: [{ id: 1 }, { id: 2 }], total: 45, page: 1, size: 30, pages: 2 });
    const page = await (opts.queryFn as unknown as (ctx: { pageParam: number }) => Promise<{ items: unknown[]; pages: number }>)({ pageParam: 1 });
    expect(mock.history.get[0].params).toEqual({ action_required: true, status: 'pending', page: 1, size: 30 });
    expect(page.items).toHaveLength(2);
    expect(opts.getNextPageParam(page as never, [page as never], 1, [1])).toBe(2);
    expect(opts.refetchInterval).toBe(60 * 1000);
  });

  it('eski backend (yalang massiv) bilan ham ishlaydi — bitta sahifa', async () => {
    mock.onGet(LETTERS_LIST).reply(200, [{ id: 1 }, { id: 2 }]);
    const opts = lettersListQuery({ tab: 'all' });
    const page = await (opts.queryFn as unknown as (ctx: { pageParam: number }) => Promise<{ items: unknown[]; pages: number }>)({ pageParam: 1 });
    expect(page.items).toHaveLength(2);
    expect(opts.getNextPageParam(page as never, [page as never], 1, [1])).toBeUndefined();
  });
});

describe('letterDetailQuery', () => {
  it('carries the detail key and always revalidates on mount', () => {
    const opts = letterDetailQuery(42);
    expect(opts.queryKey).toEqual(['letters', 'detail', 42]);
    expect(opts.refetchOnMount).toBe('always');
    expect(opts.enabled).toBe(true);
  });

  it('is disabled for a falsy id', () => {
    expect(letterDetailQuery(0).enabled).toBe(false);
    expect(letterDetailQuery(undefined as unknown as number).enabled).toBe(false);
  });

  it('fetches the letter by id', async () => {
    mock.onGet(LETTER_DETAIL(42)).reply(200, { id: 42, status: 'pending' });
    const data = await (letterDetailQuery(42).queryFn as unknown as () => Promise<{ id: number }>)();
    expect(data.id).toBe(42);
  });
});


// ── XODIM TANLAGICHLARI (web AddLetterDrawer bilan 1:1) ─────────────────────
// Regression: ADRESAT va KELISHUVCHILAR bitta manbadan (hr/deputy/ministr
// rollari) o'qirdi, ya'ni "Kelishuvchilar" ro'yxatida filialning 3-4 ta
// rahbariyat xodimi chiqib, oddiy hamkasblar UMUMAN ko'rinmasdi.
const run = async (opts: { queryFn?: unknown }) =>
  (opts.queryFn as () => Promise<unknown>)();

describe('letterSignersQuery — ADRESAT (filial rahbarlari, keyin rollar)', () => {
  it('filialga rahbar belgilangan bo\'lsa FAQAT director/deputy olinadi', async () => {
    // Ilgari bu so'rov faqat multi-org roli bo'yicha qidirardi, ya'ni multi-org
    // rolsiz ro'yxatdan o'tgan filial o'rinbosari (jonli misol: emp 429)
    // mobilda adresat sifatida UMUMAN chiqmasdi, vebda esa chiqardi.
    mock.onGet(ORGANIZATION_BRANCH_LEADERS(7)).reply(200, [
      { leadership_role: 'director', employee: { id: 1, legal_name: 'D' } },
      { leadership_role: 'akt', employee: { id: 2, legal_name: 'Akt' } },
      { leadership_role: 'deputy', employee: { id: 3, legal_name: 'O' } },
    ]);
    const rows = (await run(letterSignersQuery(7))) as { id: number }[];
    expect(rows.map((r) => r.id)).toEqual([1, 3]);
  });

  it('rahbar belgilanmagan bo\'lsa rol filtriga tushadi (KADR ham qoladi)', async () => {
    mock.onGet(ORGANIZATION_BRANCH_LEADERS(7)).reply(200, []);
    mock.onGet(EMPLOYEES_LIST).reply(200, { items: [], total: 0 });
    await run(letterSignersQuery(7));
    const p = mock.history.get.find((r) => r.url === EMPLOYEES_LIST)!.params;
    expect(p.multi_org_employee_role).toEqual(['hr', 'deputy', 'ministr']);
    // `include_multi_org` OLIB TASHLANDI: u M2M bo'yicha filtrlab, 28 filialga
    // bog'langan rahbariyatni HAR BIR filialda ko'rsatardi.
    expect(p.include_multi_org).toBeUndefined();
    // Bo'limi/lavozimi yo'q xizmat hisoblari chiqmasin (ministr istisnosi
    // backendда).
    expect(p.has_department).toBe(true);
    expect(p.organization_branch_id).toBe(7);
  });
});

describe('letterAgreementSignersQuery — KELISHUVCHILAR (filialning BARCHA xodimlari)', () => {
  it('ROL FILTRISIZ, o\'z filialiga qat\'iy bog\'langan holda so\'raydi', async () => {
    mock.onGet(EMPLOYEES_LIST).reply(200, { items: [], total: 0 });
    await run(letterAgreementSignersQuery(7, true));
    const p = mock.history.get[0].params;
    // ENG MUHIMI: rol filtri YO'Q — aks holda oddiy xodim kelishuvchi bo'la olmaydi.
    expect(p.multi_org_employee_role).toBeUndefined();
    expect(p.organization_branch_id).toBe(7);
    // ⚠️ `include_multi_org: false` OLIB TASHLANDI: u bo'limga INNER JOIN
    // qilib, bo'limi boshqa filial daraxtida turgan xodimni butunlay
    // yashirardi (o'lchandi: ayrim tashkilotlarda ro'yxat 0 ta bo'lardi).
    expect(p.include_multi_org).toBeUndefined();
    // Lavozim+bo'lim sharti endi SERVERDA.
    expect(p.has_department).toBe(true);
    expect(p.sort_by_razryad).toBe(true);
  });

  it('serverdan kelgan ro\'yxatni QIRQMAYDI (filtr endi serverda)', async () => {
    // Ilgari bu yerda mijoz tomonda `job_position` bo'yicha filtr bor edi.
    // U `has_department: true` bilan almashtirildi: server bo'lim+lavozim
    // shartini o'zi qo'yadi va MINISTRni ataylab istisno qiladi — mijozdagi
    // filtr esa ministrni ham kesib tashlardi.
    mock.onGet(EMPLOYEES_LIST).reply(200, {
      items: [
        { id: 1, legal_name: 'Lavozimli', job_position: { name: 'Muhandis' } },
        { id: 2, legal_name: 'Ministr', job_position: null },
      ],
      total: 2,
    });
    const rows = (await run(letterAgreementSignersQuery(7, true))) as { id: number }[];
    expect(rows.map((r) => r.id)).toEqual([1, 2]);
  });

  it('filial tanlanmagan bo\'lsa umuman so\'rov yubormaydi', () => {
    expect(letterAgreementSignersQuery(undefined, true).enabled).toBe(false);
    expect(letterAgreementSignersQuery(7, false).enabled).toBe(false);
  });
});

describe('letterSubmittersQuery — YUBORUVCHI (faqat o\'z filiali)', () => {
  it("has_department bilan so'raydi — bo'limi boshqa filialdagi xodim ham chiqadi", async () => {
    mock.onGet(EMPLOYEES_LIST).reply(200, { items: [], total: 0 });
    await run(letterSubmittersQuery(7, true));
    expect(mock.history.get[0].params.include_multi_org).toBeUndefined();
    expect(mock.history.get[0].params.has_department).toBe(true);
    expect(mock.history.get[0].params.organization_branch_id).toBe(7);
  });
});

describe('letterRahbariyatQuery — SAFAR rahbariyati', () => {
  it('filialga rahbar belgilangan bo\'lsa FAQAT director/deputy olinadi', async () => {
    mock.onGet(ORGANIZATION_BRANCH_LEADERS(7)).reply(200, [
      { leadership_role: 'director', employee: { id: 1, legal_name: 'D' } },
      { leadership_role: 'chancellery', employee: { id: 2, legal_name: 'Dev' } },
      { leadership_role: 'deputy', employee: { id: 3, legal_name: 'O' } },
    ]);
    const rows = (await run(letterRahbariyatQuery(7, true))) as { id: number }[];
    expect(rows.map((r) => r.id)).toEqual([1, 3]);
  });

  it('rahbar belgilanmagan bo\'lsa fallback FILIALGA BOG\'LANMAYDI', async () => {
    // Ministr/o'rinbosarning BO'LIMI ko'pincha boshqa filialda — filial bilan
    // so'ralsa ro'yxat BO'SH qaytib, safar yaratib bo'lmasdi.
    mock.onGet(ORGANIZATION_BRANCH_LEADERS(7)).reply(200, []);
    mock.onGet(EMPLOYEES_LIST).reply(200, { items: [{ id: 9 }], total: 1 });
    await run(letterRahbariyatQuery(7, true));
    const empReq = mock.history.get.find((r) => r.url === EMPLOYEES_LIST)!;
    expect(empReq.params.organization_branch_id).toBeUndefined();
    expect(empReq.params.multi_org_employee_role).toEqual(['deputy', 'ministr']);
  });
});
