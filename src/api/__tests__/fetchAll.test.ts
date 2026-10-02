import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { fetchAllPages } from '../fetchAll';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

const rows = (from: number, n: number) => Array.from({ length: n }, (_, i) => ({ id: from + i }));

describe('fetchAllPages (v2 api/fetchAll porti)', () => {
  it('bitta sahifa — bitta so\'rov, size 500', async () => {
    mock.onGet('departments').reply(200, { items: rows(1, 3), total: 3, pages: 1 });
    const out = await fetchAllPages('departments', { organization_branch_id: 2 });
    expect(out).toHaveLength(3);
    expect(mock.history.get).toHaveLength(1);
    expect(mock.history.get[0].params).toEqual({ organization_branch_id: 2, page: 1, size: 500 });
  });

  it('1201 qator — 3 sahifa yuriladi, tartib saqlanadi', async () => {
    mock.onGet('job-positions').reply((cfg) => {
      const p = cfg.params.page as number;
      const n = p < 3 ? 500 : 201;
      return [200, { items: rows((p - 1) * 500 + 1, n), total: 1201, pages: 3 }];
    });
    const out = await fetchAllPages<{ id: number }>('job-positions');
    expect(out).toHaveLength(1201);
    expect(out[0].id).toBe(1);
    expect(out[1200].id).toBe(1201);
    expect(mock.history.get.map((r) => r.params.page).sort()).toEqual([1, 2, 3]);
  });

  it('yalang massiv — hammasi, qo\'shimcha so\'rov yo\'q', async () => {
    mock.onGet('x').reply(200, rows(1, 7));
    expect(await fetchAllPages('x')).toHaveLength(7);
    expect(mock.history.get).toHaveLength(1);
  });

  it('maxPages chegarasidan oshmaydi', async () => {
    mock.onGet('big').reply(200, { items: rows(1, 10), total: 1000 });
    await fetchAllPages('big', {}, 10, 4);
    expect(mock.history.get).toHaveLength(4);
  });
});
