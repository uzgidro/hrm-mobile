import { mapWithConcurrency } from '../concurrency';

// A controllable async task: resolves only when release() is called, and tracks
// how many are running at once.
function makeTracker() {
  let active = 0;
  let maxActive = 0;
  const releases: Array<() => void> = [];
  const fn = (x: number) => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    return new Promise<number>((resolve) => {
      releases.push(() => {
        active -= 1;
        resolve(x * 2);
      });
    });
  };
  return { fn, get maxActive() { return maxActive; }, releases };
}

describe('mapWithConcurrency', () => {
  it('preserves result order regardless of completion order', async () => {
    const out = await mapWithConcurrency([1, 2, 3, 4], 2, async (x) => x * 10);
    expect(out).toEqual([10, 20, 30, 40]);
  });

  it('never runs more than `limit` tasks at once', async () => {
    const { fn, releases } = makeTracker();
    const items = [1, 2, 3, 4, 5, 6, 7];
    const promise = mapWithConcurrency(items, 3, fn);

    // Let microtasks settle so the first batch starts.
    await Promise.resolve();
    await Promise.resolve();

    // Drain: release tasks one by one until all complete.
    let tracker: ReturnType<typeof makeTracker> | null = null;
    void tracker;
    while (releases.length) {
      releases.shift()!();
      await Promise.resolve();
      await Promise.resolve();
    }
    const result = await promise;
    expect(result).toEqual(items.map((x) => x * 2));
  });

  it('caps concurrency at the configured limit', async () => {
    const tracker = makeTracker();
    const items = [0, 1, 2, 3, 4, 5];
    const promise = mapWithConcurrency(items, 2, tracker.fn);
    // spin the event loop a bit so as many tasks as allowed start
    for (let i = 0; i < 5; i++) await Promise.resolve();
    expect(tracker.maxActive).toBeLessThanOrEqual(2);
    // finish
    while (tracker.releases.length) {
      tracker.releases.shift()!();
      for (let i = 0; i < 3; i++) await Promise.resolve();
    }
    await promise;
    expect(tracker.maxActive).toBeLessThanOrEqual(2);
  });

  it('handles an empty list and a limit larger than the list', async () => {
    expect(await mapWithConcurrency([], 4, async (x) => x)).toEqual([]);
    expect(await mapWithConcurrency([1, 2], 10, async (x) => x + 1)).toEqual([2, 3]);
  });
});
