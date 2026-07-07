import {
  toast,
  getToasts,
  dismissToast,
  subscribeToasts,
  __resetToasts,
} from '../toast';

beforeEach(() => __resetToasts());
afterEach(() => __resetToasts());

describe('toast store', () => {
  it('pushes an error toast and exposes it via getToasts', () => {
    const id = toast.error('Xatolik yuz berdi');
    const list = getToasts();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id, kind: 'error', message: 'Xatolik yuz berdi' });
  });

  it('pushes success and info with the right kind', () => {
    toast.success('Saqlandi');
    toast.info('Maʼlumot');
    expect(getToasts().map((t) => t.kind)).toEqual(['success', 'info']);
  });

  it('ignores empty / whitespace-only messages', () => {
    expect(toast.error('')).toBe(-1);
    expect(toast.error('   ')).toBe(-1);
    expect(getToasts()).toHaveLength(0);
  });

  it('collapses an identical back-to-back message into the existing toast', () => {
    const a = toast.error('Server xatosi');
    const b = toast.error('Server xatosi');
    expect(b).toBe(a);
    expect(getToasts()).toHaveLength(1);
  });

  it('keeps distinct messages separate', () => {
    toast.error('A');
    toast.error('B');
    expect(getToasts()).toHaveLength(2);
  });

  it('dismissToast removes the toast and notifies subscribers', () => {
    const calls: number[] = [];
    const unsub = subscribeToasts(() => calls.push(getToasts().length));
    const id = toast.error('X');
    dismissToast(id);
    expect(getToasts()).toHaveLength(0);
    // one notify on push (len 1), one on dismiss (len 0)
    expect(calls).toEqual([1, 0]);
    unsub();
  });

  it('auto-dismisses after the duration', () => {
    jest.useFakeTimers();
    toast.error('Vaqtincha', 1000);
    expect(getToasts()).toHaveLength(1);
    jest.advanceTimersByTime(1000);
    expect(getToasts()).toHaveLength(0);
    jest.useRealTimers();
  });

  it('a manual dismiss cancels the pending auto-dismiss (no double-remove)', () => {
    jest.useFakeTimers();
    const id = toast.error('X', 1000);
    dismissToast(id);
    // advancing past the original duration must not throw or re-notify
    expect(() => jest.advanceTimersByTime(2000)).not.toThrow();
    expect(getToasts()).toHaveLength(0);
    jest.useRealTimers();
  });
});
