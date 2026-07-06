import { createAppQueryClient, DEFAULT_QUERY_STALE_TIME, DEFAULT_QUERY_GC_TIME } from '../queryClient';

describe('createAppQueryClient', () => {
  it('applies non-zero staleTime so screen focus/mount does not refetch every time', () => {
    const qc = createAppQueryClient();
    const q = qc.getDefaultOptions().queries!;
    expect(q.staleTime).toBe(DEFAULT_QUERY_STALE_TIME);
    expect(DEFAULT_QUERY_STALE_TIME).toBeGreaterThan(0);
  });

  it('sets a bounded gcTime and a small retry count', () => {
    const qc = createAppQueryClient();
    const q = qc.getDefaultOptions().queries!;
    expect(q.gcTime).toBe(DEFAULT_QUERY_GC_TIME);
    expect(q.retry).toBe(2);
  });

  it('does not retry mutations by default', () => {
    const qc = createAppQueryClient();
    expect(qc.getDefaultOptions().mutations?.retry).toBe(0);
  });

  it('per-query staleTime still overrides the default', () => {
    const qc = createAppQueryClient();
    // A screen that opts into fresher data (e.g. notifications) must win.
    const opts = qc.defaultQueryOptions({ queryKey: ['x'], staleTime: 30_000 });
    expect(opts.staleTime).toBe(30_000);
  });
});
