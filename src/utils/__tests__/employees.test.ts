import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../../api/client';
import { EMPLOYEES_LIST, EMPLOYEE_OPTIONS } from '../../api/urls';
import { fetchAllEmployees, employeesQueryKey, fetchEmployeeOptions } from '../employees';

// Characterization tests: lock in the CURRENT behavior of fetchAllEmployees.
// The app talks to the backend only through `apiClient`, so we mock its adapter.

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(apiClient);
});

afterEach(() => {
  mock.restore();
});

// Build `count` fake employees whose ids run [start, start+count).
function makeItems(start: number, count: number) {
  return Array.from({ length: count }, (_, i) => ({ id: start + i }));
}

describe('fetchAllEmployees — pagination', () => {
  it('makes a single request when total <= 500 and returns the first page as-is', async () => {
    const items = makeItems(1, 42);
    mock.onGet(EMPLOYEES_LIST).reply(200, { items, total: 42 });

    const result = await fetchAllEmployees();

    expect(mock.history.get).toHaveLength(1);
    // total <= 500 → the raw first page object is returned unchanged.
    expect(result).toEqual({ items, total: 42 });
    expect(result.items).toHaveLength(42);
  });

  it('treats exactly 500 as a single page (boundary: total <= 500)', async () => {
    const items = makeItems(1, 500);
    mock.onGet(EMPLOYEES_LIST).reply(200, { items, total: 500 });

    const result = await fetchAllEmployees();

    expect(mock.history.get).toHaveLength(1);
    expect(result.total).toBe(500);
    expect(result.items).toHaveLength(500);
  });

  it('uses page size 500 and page 1 on the first request', async () => {
    mock.onGet(EMPLOYEES_LIST).reply(200, { items: makeItems(1, 5), total: 5 });

    await fetchAllEmployees();

    expect(mock.history.get).toHaveLength(1);
    expect(mock.history.get[0].params).toEqual({ size: 500, page: 1 });
  });

  it('includes organization_branch_id in params when provided', async () => {
    mock.onGet(EMPLOYEES_LIST).reply(200, { items: makeItems(1, 3), total: 3 });

    await fetchAllEmployees(77);

    expect(mock.history.get[0].params).toEqual({
      size: 500,
      page: 1,
      organization_branch_id: 77,
    });
  });

  it('omits organization_branch_id when not provided', async () => {
    mock.onGet(EMPLOYEES_LIST).reply(200, { items: makeItems(1, 3), total: 3 });

    await fetchAllEmployees();

    expect(mock.history.get[0].params).not.toHaveProperty('organization_branch_id');
  });

  it('fetches remaining pages in parallel and concatenates all pages in order', async () => {
    // total 1250 → ceil(1250/500) = 3 pages.
    mock.onGet(EMPLOYEES_LIST).reply((config) => {
      const page = config.params.page as number;
      const start = (page - 1) * 500 + 1;
      const count = page === 3 ? 250 : 500;
      return [200, { items: makeItems(start, count), total: 1250 }];
    });

    const result = await fetchAllEmployees();

    // Page 1 sequential + pages 2 & 3 in parallel = 3 requests total.
    expect(mock.history.get).toHaveLength(3);
    const pages = mock.history.get.map((r) => r.params.page).sort((a, b) => a - b);
    expect(pages).toEqual([1, 2, 3]);

    expect(result.total).toBe(1250);
    expect(result.items).toHaveLength(1250);
    // Merged in page order: page1 ids 1..500, page2 501..1000, page3 1001..1250.
    expect(result.items[0]).toEqual({ id: 1 });
    expect(result.items[500]).toEqual({ id: 501 });
    expect(result.items[1249]).toEqual({ id: 1250 });
  });

  it('computes page count with Math.ceil (549 total → 2 pages)', async () => {
    mock.onGet(EMPLOYEES_LIST).reply((config) => {
      const page = config.params.page as number;
      const start = (page - 1) * 500 + 1;
      const count = page === 1 ? 500 : 49;
      return [200, { items: makeItems(start, count), total: 549 }];
    });

    const result = await fetchAllEmployees();

    expect(mock.history.get).toHaveLength(2);
    expect(result.items).toHaveLength(549);
    expect(result.total).toBe(549);
  });

  it('carries base params (size + org branch id) into every paginated request', async () => {
    mock.onGet(EMPLOYEES_LIST).reply((config) => {
      const page = config.params.page as number;
      const count = page === 1 ? 500 : 500;
      const start = (page - 1) * 500 + 1;
      return [200, { items: makeItems(start, count), total: 1000 }];
    });

    await fetchAllEmployees(9);

    expect(mock.history.get).toHaveLength(2);
    for (const req of mock.history.get) {
      expect(req.params.size).toBe(500);
      expect(req.params.organization_branch_id).toBe(9);
    }
    // Page numbers span 1 and 2.
    expect(mock.history.get.map((r) => r.params.page).sort()).toEqual([1, 2]);
  });

  it('returns empty result when the first page has no items array', async () => {
    mock.onGet(EMPLOYEES_LIST).reply(200, { total: 500 });

    const result = await fetchAllEmployees();

    expect(mock.history.get).toHaveLength(1);
    expect(result).toEqual({ items: [], total: 0 });
  });

  it('tolerates a remaining page returning no items (flattens to empty)', async () => {
    mock.onGet(EMPLOYEES_LIST).reply((config) => {
      const page = config.params.page as number;
      if (page === 1) return [200, { items: makeItems(1, 500), total: 550 }];
      // Page 2 comes back without an items array.
      return [200, { total: 550 }];
    });

    const result = await fetchAllEmployees();

    expect(mock.history.get).toHaveLength(2);
    expect(result.total).toBe(550);
    expect(result.items).toHaveLength(500);
  });
});

describe('employeesQueryKey', () => {
  it('includes the org branch id', () => {
    expect(employeesQueryKey(12)).toEqual(['team-employees-all', 12]);
  });

  it('is undefined-tolerant when no branch id is passed', () => {
    expect(employeesQueryKey()).toEqual(['team-employees-all', undefined]);
  });
});


describe('fetchAllEmployees — qo\'shimcha server filtrlari', () => {
  it('extraParams BARCHA sahifaga uzatiladi (aks holda 2-sahifa boshqa tartibda kelardi)', async () => {
    mock.onGet(EMPLOYEES_LIST).reply((cfg) => {
      const page = Number(cfg.params.page);
      return [200, { items: makeItems((page - 1) * 500, 500), total: 1250 }];
    });
    await fetchAllEmployees(7, { include_multi_org: false, sort_by_razryad: true });
    expect(mock.history.get).toHaveLength(3);
    for (const req of mock.history.get) {
      expect(req.params.include_multi_org).toBe(false);
      expect(req.params.sort_by_razryad).toBe(true);
      expect(req.params.organization_branch_id).toBe(7);
    }
  });
});

// `/employees/options` — BUTUN TASHKILOT bo'yicha, PII'siz tanlagich ro'yxati.
// `/employees` PII himoyasi uchun filialga qamalgan, shu bois loyiha a'zolari
// kabi tanlagichlar undan o'qilganda jimgina o'z filialiga qisilib qolardi.
describe('fetchEmployeeOptions', () => {
  it('filialsiz so\'raydi va bitta sahifani qaytaradi', async () => {
    mock.onGet(EMPLOYEE_OPTIONS).reply(200, {
      items: [{ id: 1, legal_name: 'A' }],
      total: 1,
    });
    const rows = await fetchEmployeeOptions();
    expect(rows).toEqual([{ id: 1, legal_name: 'A' }]);
    expect(mock.history.get[0].url).toBe(EMPLOYEE_OPTIONS);
    expect(mock.history.get[0].params.organization_branch_id).toBeUndefined();
  });

  it('100 dan ko\'p bo\'lsa qolgan sahifalarni parallel oladi', async () => {
    mock.onGet(EMPLOYEE_OPTIONS).reply((cfg) => {
      const page = Number(cfg.params.page);
      return [200, { items: makeItems((page - 1) * 100, 100), total: 230 }];
    });
    const rows = await fetchEmployeeOptions();
    expect(rows).toHaveLength(300);
    expect(mock.history.get).toHaveLength(3);
  });

  it('bo\'sh javobda yiqilmaydi', async () => {
    mock.onGet(EMPLOYEE_OPTIONS).reply(200, {});
    expect(await fetchEmployeeOptions()).toEqual([]);
  });
});
