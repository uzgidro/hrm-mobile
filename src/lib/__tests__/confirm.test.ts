import {
  confirm,
  getConfirm,
  answerConfirm,
  subscribeConfirm,
  __resetConfirm,
} from '../confirm';

beforeEach(() => __resetConfirm());
afterEach(() => __resetConfirm());

const OPTS = {
  title: 'Delete?',
  message: 'This cannot be undone',
  confirmLabel: 'Delete',
  cancelLabel: 'Cancel',
  destructive: true as const,
};

describe('confirm store', () => {
  it('exposes the active request via getConfirm after confirm() is called', () => {
    confirm(OPTS);
    const active = getConfirm();
    expect(active).toMatchObject({ title: 'Delete?', confirmLabel: 'Delete', destructive: true });
  });

  it('has no active request initially', () => {
    expect(getConfirm()).toBeNull();
  });

  it('resolves the promise with true when answered true and clears the request', async () => {
    const p = confirm(OPTS);
    answerConfirm(true);
    await expect(p).resolves.toBe(true);
    expect(getConfirm()).toBeNull();
  });

  it('resolves with false when answered false', async () => {
    const p = confirm(OPTS);
    answerConfirm(false);
    await expect(p).resolves.toBe(false);
    expect(getConfirm()).toBeNull();
  });

  it('notifies subscribers on open and on answer', () => {
    const seen: (boolean)[] = [];
    const unsub = subscribeConfirm(() => seen.push(getConfirm() !== null));
    confirm(OPTS);
    answerConfirm(true);
    expect(seen).toEqual([true, false]);
    unsub();
  });

  it('queues a second confirm while one is active and shows it after the first is answered', async () => {
    const p1 = confirm({ ...OPTS, title: 'First' });
    const p2 = confirm({ ...OPTS, title: 'Second' });
    // Only the first is shown.
    expect(getConfirm()?.title).toBe('First');

    answerConfirm(true);
    await expect(p1).resolves.toBe(true);
    // The queued second now becomes active.
    expect(getConfirm()?.title).toBe('Second');

    answerConfirm(false);
    await expect(p2).resolves.toBe(false);
    expect(getConfirm()).toBeNull();
  });

  it('answerConfirm is a no-op when there is no active request', () => {
    expect(() => answerConfirm(true)).not.toThrow();
    expect(getConfirm()).toBeNull();
  });
});
