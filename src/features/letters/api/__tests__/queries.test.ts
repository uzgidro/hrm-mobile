import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { LETTERS_LIST, LETTER_DETAIL, EMPLOYEES_LIST, ORGANIZATION_BRANCH_LEADERS } from '@/api/urls';
import {
  letterKeys, lettersListQuery, letterDetailQuery,
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

  it("ro'yxat kaliti BITTA — tablar mijozda ajratiladi", () => {
    expect(letterKeys.list()).toEqual(['letters', 'list']);
  });

  it('places the detail under `all` so a single invalidate refreshes list + detail', () => {
    expect(letterKeys.detail(42)).toEqual(['letters', 'detail', 42]);
    expect(letterKeys.detail(42).slice(0, 1)).toEqual(letterKeys.all);
    expect(letterKeys.list().slice(0, 1)).toEqual(letterKeys.all);
  });
});

describe('lettersListQuery', () => {
  it("SERVER FILTRI YO'Q — `assigned_signer`/`signer` tab ma'nosini buzardi", async () => {
    // `assigned_signer=true`: devonxona ro'yxatga olishi, KADR "Keldi" tasdig'i,
    // qaytarilgan hisobot va KELISHUV (bildirgi/ariza imzolanmaydi) "Menda"
    // tabiga umuman tushmasdi.
    // `signer=true`: "Mening" = MEN IMZOLAGANLARIM bo'lib qolardi — o'z
    // bildirgisini yozgan xodim uni imzolamagani uchun ro'yxatda ko'rmasdi.
    const opts = lettersListQuery();
    expect(opts.queryKey).toEqual(['letters', 'list']);
    mock.onGet(LETTERS_LIST).reply(200, []);
    await (opts.queryFn as () => Promise<unknown[]>)();
    expect(mock.history.get[0].params).toBeUndefined();
  });

  it('returns a bare array and unwraps an { items } envelope', async () => {
    mock.onGet(LETTERS_LIST).reply(200, [{ id: 1 }, { id: 2 }]);
    expect(await (lettersListQuery().queryFn as () => Promise<unknown[]>)()).toHaveLength(2);
    mock.resetHistory();
    mock.onGet(LETTERS_LIST).reply(200, { items: [{ id: 3 }] });
    expect(await (lettersListQuery().queryFn as () => Promise<unknown[]>)()).toEqual([{ id: 3 }]);
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

describe('letterSignersQuery — ADRESAT (faqat rahbariyat rollari)', () => {
  it('rol filtri bilan va FILIALGA bog\'lab so\'raydi', async () => {
    mock.onGet(EMPLOYEES_LIST).reply(200, { items: [], total: 0 });
    await run(letterSignersQuery(7));
    const p = mock.history.get[0].params;
    expect(p.multi_org_employee_role).toEqual(['hr', 'deputy', 'ministr']);
    expect(p.include_multi_org).toBe(true);
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
    // Boshqa filialga m2m bog'langanlar chiqib ketmasin.
    expect(p.include_multi_org).toBe(false);
    expect(p.sort_by_razryad).toBe(true);
  });

  it('lavozimi kiritilmagan xodimlarni ro\'yxatdan chiqarib tashlaydi (web ham)', async () => {
    mock.onGet(EMPLOYEES_LIST).reply(200, {
      items: [
        { id: 1, legal_name: 'Lavozimli', job_position: { name: 'Muhandis' } },
        { id: 2, legal_name: 'Lavozimsiz', job_position: null },
        { id: 3, legal_name: "Bo'sh satr", job_position: { name: '   ' } },
      ],
      total: 3,
    });
    const rows = (await run(letterAgreementSignersQuery(7, true))) as { id: number }[];
    expect(rows.map((r) => r.id)).toEqual([1]);
  });

  it('filial tanlanmagan bo\'lsa umuman so\'rov yubormaydi', () => {
    expect(letterAgreementSignersQuery(undefined, true).enabled).toBe(false);
    expect(letterAgreementSignersQuery(7, false).enabled).toBe(false);
  });
});

describe('letterSubmittersQuery — YUBORUVCHI (faqat o\'z filiali)', () => {
  it("include_multi_org: false — boshqa filialga bog'langanlar chiqmaydi", async () => {
    mock.onGet(EMPLOYEES_LIST).reply(200, { items: [], total: 0 });
    await run(letterSubmittersQuery(7, true));
    expect(mock.history.get[0].params.include_multi_org).toBe(false);
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
