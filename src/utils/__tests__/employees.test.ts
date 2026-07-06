import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../../api/client';
import { EMPLOYEES_LIST } from '../../api/urls';
import { fetchAllEmployees, employeesQueryKey } from '../employees';

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
  it('makes a single request when total <= 100 and returns the first page as-is', async () => {
    const items = makeItems(1, 42);
    mock.onGet(EMPLOYEES_LIST).reply(200, { items, total: 42 });

    const result = await fetchAllEmployees();

    expect(mock.history.get).toHaveLength(1);
    // total <= 100 → the raw first page object is returned unchanged.
    expect(result).toEqual({ items, total: 42 });
    expect(result.items).toHaveLength(42);
  });

  it('treats exactly 100 as a single page (boundary: total <= 100)', async () => {
    const items = makeItems(1, 100);
    mock.onGet(EMPLOYEES_LIST).reply(200, { items, total: 100 });

    const result = await fetchAllEmployees();

    expect(mock.history.get).toHaveLength(1);
    expect(result.total).toBe(100);
    expect(result.items).toHaveLength(100);
  });

  it('uses page size 100 and page 1 on the first request', async () => {
    mock.onGet(EMPLOYEES_LIST).reply(200, { items: makeItems(1, 5), total: 5 });

    await fetchAllEmployees();

    expect(mock.history.get).toHaveLength(1);
    expect(mock.history.get[0].params).toEqual({ size: 100, page: 1 });
  });

  it('includes organization_branch_id in params when provided', async () => {
    mock.onGet(EMPLOYEES_LIST).reply(200, { items: makeItems(1, 3), total: 3 });

    await fetchAllEmployees(77);

    expect(mock.history.get[0].params).toEqual({
      size: 100,
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
    // total 250 → ceil(250/100) = 3 pages.
    mock.onGet(EMPLOYEES_LIST).reply((config) => {
      const page = config.params.page as number;
      const start = (page - 1) * 100 + 1;
      const count = page === 3 ? 50 : 100;
      return [200, { items: makeItems(start, count), total: 250 }];
    });

    const result = await fetchAllEmployees();

    // Page 1 sequential + pages 2 & 3 in parallel = 3 requests total.
    expect(mock.history.get).toHaveLength(3);
    const pages = mock.history.get.map((r) => r.params.page).sort((a, b) => a - b);
    expect(pages).toEqual([1, 2, 3]);

    expect(result.total).toBe(250);
    expect(result.items).toHaveLength(250);
    // Merged in page order: page1 ids 1..100, page2 101..200, page3 201..250.
    expect(result.items[0]).toEqual({ id: 1 });
    expect(result.items[100]).toEqual({ id: 101 });
    expect(result.items[249]).toEqual({ id: 250 });
  });

  it('computes page count with Math.ceil (149 total → 2 pages)', async () => {
    mock.onGet(EMPLOYEES_LIST).reply((config) => {
      const page = config.params.page as number;
      const start = (page - 1) * 100 + 1;
      const count = page === 1 ? 100 : 49;
      return [200, { items: makeItems(start, count), total: 149 }];
    });

    const result = await fetchAllEmployees();

    expect(mock.history.get).toHaveLength(2);
    expect(result.items).toHaveLength(149);
    expect(result.total).toBe(149);
  });

  it('carries base params (size + org branch id) into every paginated request', async () => {
    mock.onGet(EMPLOYEES_LIST).reply((config) => {
      const page = config.params.page as number;
      const count = page === 1 ? 100 : 100;
      const start = (page - 1) * 100 + 1;
      return [200, { items: makeItems(start, count), total: 200 }];
    });

    await fetchAllEmployees(9);

    expect(mock.history.get).toHaveLength(2);
    for (const req of mock.history.get) {
      expect(req.params.size).toBe(100);
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
      if (page === 1) return [200, { items: makeItems(1, 100), total: 150 }];
      // Page 2 comes back without an items array.
      return [200, { total: 150 }];
    });

    const result = await fetchAllEmployees();

    expect(mock.history.get).toHaveLength(2);
    expect(result.total).toBe(150);
    expect(result.items).toHaveLength(100);
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
