import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../../api/client';
import { EMPLOYEES_LIST } from '../../api/urls';
import { fetchAllEmployees } from '../employees';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

const items = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i }));

describe('parallel pagination concurrency cap', () => {
  it('never has more than 4 page requests in flight (1000 employees → 10 pages)', async () => {
    let active = 0;
    let maxActive = 0;

    mock.onGet(EMPLOYEES_LIST).reply(async (config) => {
      const page = Number(config.params?.page ?? 1);
      if (page === 1) return [200, { items: items(100), total: 1000 }];
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 5));
      active -= 1;
      return [200, { items: items(100), total: 1000 }];
    });

    const result = await fetchAllEmployees();
    // 10 pages of 100 → 1000 merged items, request count = 10.
    expect(result.items).toHaveLength(1000);
    expect(mock.history.get).toHaveLength(10);
    // The cap: with 9 remaining pages, at most 4 run at once.
    expect(maxActive).toBeGreaterThan(0);
    expect(maxActive).toBeLessThanOrEqual(4);
  });
});
