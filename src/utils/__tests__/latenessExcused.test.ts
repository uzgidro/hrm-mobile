import MockAdapter from 'axios-mock-adapter';

import { apiClient } from '../../api/client';
import { DASHBOARD_LATENESS_EXCUSED } from '../../api/urls';
import { latenessExcusedQuery } from '../attendance';

// Kechikish uzri ro'yxati (ta'til/buyruq/safar xati) — davomat ro'yxati uni
// ayiradi. So'rov qatlami: kalit, kun/filial parametrlari va javob shakli.
let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('latenessExcusedQuery', () => {
  it('keys by date + branch so home and attendance-detail share one cache entry', () => {
    expect(latenessExcusedQuery('2026-08-26', 3).queryKey).toEqual(['lateness-excused', '2026-08-26', 3]);
    expect(latenessExcusedQuery('2026-08-26').queryKey).toEqual(['lateness-excused', '2026-08-26', null]);
  });

  it('sends the selected day and branch, and unwraps employee_ids', async () => {
    let seen: Record<string, unknown> | undefined;
    mock.onGet(DASHBOARD_LATENESS_EXCUSED).reply((cfg) => {
      seen = cfg.params;
      return [200, { employee_ids: [4, 9] }];
    });

    const out = await latenessExcusedQuery('2026-08-26', 3).queryFn!({} as never);
    expect(out).toEqual([4, 9]);
    expect(seen).toEqual({ day: '2026-08-26', organization_branch_id: 3 });
  });

  it('omits the branch param when there is none', async () => {
    let seen: Record<string, unknown> | undefined;
    mock.onGet(DASHBOARD_LATENESS_EXCUSED).reply((cfg) => {
      seen = cfg.params;
      return [200, { employee_ids: [] }];
    });

    await latenessExcusedQuery('2026-08-26').queryFn!({} as never);
    expect(seen).toEqual({ day: '2026-08-26' });
  });

  it('accepts a bare array response too', async () => {
    mock.onGet(DASHBOARD_LATENESS_EXCUSED).reply(200, [1, 2]);
    await expect(latenessExcusedQuery('2026-08-26', 1).queryFn!({} as never)).resolves.toEqual([1, 2]);
  });

  it('degrades to an empty list when the endpoint is missing or fails', async () => {
    // Backend hali yangilanmagan bo'lsa davomat ekrani ishlashda davom etsin.
    mock.onGet(DASHBOARD_LATENESS_EXCUSED).reply(404);
    await expect(latenessExcusedQuery('2026-08-26', 1).queryFn!({} as never)).resolves.toEqual([]);
  });

  it('returns an empty list when the payload has no ids', async () => {
    mock.onGet(DASHBOARD_LATENESS_EXCUSED).reply(200, {});
    await expect(latenessExcusedQuery('2026-08-26', 1).queryFn!({} as never)).resolves.toEqual([]);
  });
});
