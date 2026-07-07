import { createAppQueryClient, DEFAULT_QUERY_STALE_TIME, DEFAULT_QUERY_GC_TIME } from '../queryClient';
import { getToasts, __resetToasts } from '../toast';

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

describe('automatic error toasts', () => {
  beforeEach(() => __resetToasts());
  afterEach(() => __resetToasts());

  it('toasts when a mutation fails', async () => {
    const qc = createAppQueryClient();
    await qc
      .getMutationCache()
      .build(qc, { mutationFn: () => Promise.reject({ response: { data: { detail: 'Ruxsat yoʻq' } } }) })
      .execute(undefined)
      .catch(() => {});
    expect(getToasts()).toHaveLength(1);
    expect(getToasts()[0]).toMatchObject({ kind: 'error', message: 'Ruxsat yoʻq' });
  });

  it('skips the toast when the mutation opts out via meta.skipErrorToast', async () => {
    const qc = createAppQueryClient();
    await qc
      .getMutationCache()
      .build(qc, {
        mutationFn: () => Promise.reject(new Error('boom')),
        meta: { skipErrorToast: true },
      })
      .execute(undefined)
      .catch(() => {});
    expect(getToasts()).toHaveLength(0);
  });

  it('does NOT toast on a query first-load failure (screen owns the ErrorState)', async () => {
    const qc = createAppQueryClient();
    await qc
      .fetchQuery({ queryKey: ['first-load'], queryFn: () => Promise.reject(new Error('x')), retry: false })
      .catch(() => {});
    expect(getToasts()).toHaveLength(0);
  });

  it('toasts on a background refetch failure when data is already cached', async () => {
    const qc = createAppQueryClient();
    // Seed cached data, then fail a refetch — that's the background case.
    qc.setQueryData(['bg'], [{ id: 1 }]);
    await qc
      .fetchQuery({
        queryKey: ['bg'],
        queryFn: () => Promise.reject({ response: { data: { detail: 'Tarmoq xatosi' } } }),
        retry: false,
        staleTime: 0,
      })
      .catch(() => {});
    expect(getToasts()).toHaveLength(1);
    expect(getToasts()[0].message).toBe('Tarmoq xatosi');
  });
});
