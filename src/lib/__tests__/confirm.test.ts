import {
  confirm,
  getConfirm,
  answerConfirm,
  dismissAllConfirms,
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

  it('dismissAllConfirms resolves the active and every queued request to false', async () => {
    const p1 = confirm({ ...OPTS, title: 'First' });
    const p2 = confirm({ ...OPTS, title: 'Second' });

    dismissAllConfirms();

    await expect(p1).resolves.toBe(false);
    await expect(p2).resolves.toBe(false);
    expect(getConfirm()).toBeNull();
  });

  it('dismissAllConfirms is a no-op when idle', () => {
    expect(() => dismissAllConfirms()).not.toThrow();
    expect(getConfirm()).toBeNull();
  });

  it('de-duplicates an identical confirm (double-tap) into one dialog and one answer', async () => {
    const p1 = confirm(OPTS);
    const p2 = confirm(OPTS); // same title+message → rides along, no second dialog

    // Only one dialog is active; nothing queued.
    expect(getConfirm()?.title).toBe('Delete?');
    answerConfirm(true);

    // Both awaiters get the single answer.
    await expect(p1).resolves.toBe(true);
    await expect(p2).resolves.toBe(true);
    // No leftover queued duplicate.
    expect(getConfirm()).toBeNull();
  });

  it('does not de-duplicate confirms with different text', () => {
    confirm({ ...OPTS, title: 'A' });
    confirm({ ...OPTS, title: 'B' });
    // Distinct dialogs: first active, second queued.
    expect(getConfirm()?.title).toBe('A');
    answerConfirm(true);
    expect(getConfirm()?.title).toBe('B');
  });

  it('ignores an answer whose requestId no longer matches the active request', async () => {
    const p1 = confirm({ ...OPTS, title: 'A' });
    const p2 = confirm({ ...OPTS, title: 'B' });
    const firstId = getConfirm()!.id;

    // First tick: answer A (correct id). This promotes B into active.
    answerConfirm(true, firstId);
    await expect(p1).resolves.toBe(true);

    // A stale second handler for A fires in the same interaction: it must NOT
    // answer B (now active) with A's answer.
    answerConfirm(false, firstId);
    expect(getConfirm()?.title).toBe('B'); // B still waiting

    // B is answered only by its own handler.
    answerConfirm(false, getConfirm()!.id);
    await expect(p2).resolves.toBe(false);
  });
});
