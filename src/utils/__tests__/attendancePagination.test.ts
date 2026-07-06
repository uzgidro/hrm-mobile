import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../../api/client';
import { TURNSTILE_ATTENDANCE_EVENTS } from '../../api/urls';
import {
  fetchAllAttendanceEvents,
  attendanceQueryKey,
} from '../attendance';

// Characterization tests: lock in the CURRENT behavior of the paginated
// attendance fetcher ONLY (the pure helpers in attendance.ts are owned elsewhere).

const DATE = '2026-07-06';

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(apiClient);
});

afterEach(() => {
  mock.restore();
});

function makeEvents(start: number, count: number) {
  return Array.from({ length: count }, (_, i) => ({ id: start + i }));
}

describe('fetchAllAttendanceEvents — single page & base params', () => {
  it('makes one request when total <= 100', async () => {
    mock.onGet(TURNSTILE_ATTENDANCE_EVENTS).reply(200, {
      items: makeEvents(1, 40),
      total: 40,
    });

    const result = await fetchAllAttendanceEvents(DATE);

    expect(mock.history.get).toHaveLength(1);
    expect(result).toEqual({ items: makeEvents(1, 40), total: 40 });
  });

  it('treats exactly 100 as a single page (boundary)', async () => {
    mock.onGet(TURNSTILE_ATTENDANCE_EVENTS).reply(200, {
      items: makeEvents(1, 100),
      total: 100,
    });

    const result = await fetchAllAttendanceEvents(DATE);

    expect(mock.history.get).toHaveLength(1);
    expect(result.items).toHaveLength(100);
  });

  it('passes date_from/date_to (both = the date), size 100 and page 1', async () => {
    mock.onGet(TURNSTILE_ATTENDANCE_EVENTS).reply(200, {
      items: makeEvents(1, 5),
      total: 5,
    });

    await fetchAllAttendanceEvents(DATE);

    expect(mock.history.get[0].params).toEqual({
      date_from: DATE,
      date_to: DATE,
      size: 100,
      page: 1,
    });
  });

  it('handles a plain array response (no pagination wrapper)', async () => {
    mock.onGet(TURNSTILE_ATTENDANCE_EVENTS).reply(200, makeEvents(1, 7));

    const result = await fetchAllAttendanceEvents(DATE);

    expect(mock.history.get).toHaveLength(1);
    expect(result).toEqual({ items: makeEvents(1, 7), total: 7 });
  });

  it('returns empty when the response has no items array', async () => {
    mock.onGet(TURNSTILE_ATTENDANCE_EVENTS).reply(200, { total: 500 });

    const result = await fetchAllAttendanceEvents(DATE);

    expect(mock.history.get).toHaveLength(1);
    expect(result).toEqual({ items: [], total: 0 });
  });
});

describe('fetchAllAttendanceEvents — multi-page pagination', () => {
  it('fetches remaining pages in parallel and merges in order', async () => {
    // total 250 → 3 pages.
    mock.onGet(TURNSTILE_ATTENDANCE_EVENTS).reply((config) => {
      const page = config.params.page as number;
      const start = (page - 1) * 100 + 1;
      const count = page === 3 ? 50 : 100;
      return [200, { items: makeEvents(start, count), total: 250 }];
    });

    const result = await fetchAllAttendanceEvents(DATE);

    expect(mock.history.get).toHaveLength(3);
    expect(mock.history.get.map((r) => r.params.page).sort((a, b) => a - b)).toEqual([
      1, 2, 3,
    ]);
    expect(result.total).toBe(250);
    expect(result.items).toHaveLength(250);
    expect(result.items[0]).toEqual({ id: 1 });
    expect(result.items[249]).toEqual({ id: 250 });
  });

  it('carries base params into every paginated request', async () => {
    mock.onGet(TURNSTILE_ATTENDANCE_EVENTS).reply((config) => {
      const page = config.params.page as number;
      return [200, { items: makeEvents((page - 1) * 100 + 1, 100), total: 200 }];
    });

    await fetchAllAttendanceEvents(DATE);

    expect(mock.history.get).toHaveLength(2);
    for (const req of mock.history.get) {
      expect(req.params.date_from).toBe(DATE);
      expect(req.params.date_to).toBe(DATE);
      expect(req.params.size).toBe(100);
    }
  });

  it('caps pagination at 20 pages (2000 events) when total is huge', async () => {
    // total 5000 → ceil = 50 pages, but capped at 20.
    mock.onGet(TURNSTILE_ATTENDANCE_EVENTS).reply((config) => {
      const page = config.params.page as number;
      return [200, { items: makeEvents((page - 1) * 100 + 1, 100), total: 5000 }];
    });

    const result = await fetchAllAttendanceEvents(DATE);

    // 20-page cap: exactly 20 requests, pages 1..20.
    expect(mock.history.get).toHaveLength(20);
    const pages = mock.history.get.map((r) => r.params.page).sort((a, b) => a - b);
    expect(pages[0]).toBe(1);
    expect(pages[pages.length - 1]).toBe(20);
    // 20 pages * 100 = 2000 merged events, but reported total stays the raw total.
    expect(result.items).toHaveLength(2000);
    expect(result.total).toBe(5000);
  });

  it('swallows errors on a remaining page (catch → empty array)', async () => {
    mock.onGet(TURNSTILE_ATTENDANCE_EVENTS).reply((config) => {
      const page = config.params.page as number;
      if (page === 1) return [200, { items: makeEvents(1, 100), total: 200 }];
      // Page 2 fails.
      return [500];
    });

    const result = await fetchAllAttendanceEvents(DATE);

    expect(mock.history.get).toHaveLength(2);
    expect(result.total).toBe(200);
    // Failed page contributes nothing.
    expect(result.items).toHaveLength(100);
  });
});

describe('fetchAllAttendanceEvents — org branch scoping & fallback', () => {
  it('scopes by organization_branch_id and returns scoped result when non-empty', async () => {
    mock.onGet(TURNSTILE_ATTENDANCE_EVENTS).reply((config) => {
      // Only respond with events when the branch filter is present.
      if (config.params.organization_branch_id === 55) {
        return [200, { items: makeEvents(1, 10), total: 10 }];
      }
      return [200, { items: [], total: 0 }];
    });

    const result = await fetchAllAttendanceEvents(DATE, 55);

    // Only the scoped fetch runs; no fallback because it returned events.
    expect(mock.history.get).toHaveLength(1);
    expect(mock.history.get[0].params.organization_branch_id).toBe(55);
    expect(result.items).toHaveLength(10);
  });

  it('falls back to an unfiltered fetch when the branch-scoped fetch yields 0 events', async () => {
    mock.onGet(TURNSTILE_ATTENDANCE_EVENTS).reply((config) => {
      if (config.params.organization_branch_id === 55) {
        // Scoped fetch: 0 events (events lack organization_branch_id).
        return [200, { items: [], total: 0 }];
      }
      // Unfiltered fallback: returns events.
      return [200, { items: makeEvents(1, 12), total: 12 }];
    });

    const result = await fetchAllAttendanceEvents(DATE, 55);

    // Scoped fetch (1) + fallback fetch (1) = 2 requests.
    expect(mock.history.get).toHaveLength(2);
    expect(mock.history.get[0].params.organization_branch_id).toBe(55);
    expect(mock.history.get[1].params).not.toHaveProperty('organization_branch_id');
    expect(result.items).toHaveLength(12);
  });
});

describe('attendanceQueryKey', () => {
  it('includes date and org branch id', () => {
    expect(attendanceQueryKey(DATE, 3)).toEqual(['team-attendance', DATE, 3]);
  });

  it('is undefined-tolerant when no branch id is passed', () => {
    expect(attendanceQueryKey(DATE)).toEqual(['team-attendance', DATE, undefined]);
  });
});
