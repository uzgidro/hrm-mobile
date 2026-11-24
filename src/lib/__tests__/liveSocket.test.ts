import { backoffMs, isGuestCard, isPass, openLiveSocket, passInBranch, type LiveMessage } from '../liveSocket';

class FakeSocket {
  static all: FakeSocket[] = [];
  readyState = 1;
  sent: string[] = [];
  onopen?: () => void;
  onmessage?: (e: { data?: unknown }) => void;
  onclose?: () => void;
  onerror?: () => void;
  constructor(public url: string, public protocols: string[]) {
    FakeSocket.all.push(this);
  }
  send(s: string) {
    this.sent.push(s);
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
}
const real = global.WebSocket;
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

describe('openLiveSocket', () => {
  const got: LiveMessage[] = [];
  const statuses: string[] = [];
  let token: string | null = 't1';
  const open = () =>
    openLiveSocket({
      url: 'wss://x/ws',
      getToken: async () => token,
      onMessage: (m) => got.push(m),
      onStatus: (s) => statuses.push(s),
    });

  beforeEach(() => {
    jest.useFakeTimers();
    FakeSocket.all = [];
    got.length = 0;
    statuses.length = 0;
    token = 't1';
    (global as { WebSocket: unknown }).WebSocket = FakeSocket;
  });
  afterEach(() => {
    jest.useRealTimers();
    (global as { WebSocket: unknown }).WebSocket = real;
  });

  it('the token travels as a subprotocol; every message is delivered, pings are not', async () => {
    const live = open();
    await flush();
    const s = FakeSocket.all[0]!;
    expect([s.url, s.protocols]).toEqual(['wss://x/ws', ['bearer', 't1']]);
    s.onopen!();
    for (const data of ['{"id":1}', 'pong', 'not json', '{"id":2}']) s.onmessage!({ data });
    expect(got.map((m) => m.id)).toEqual([1, 2]);
    expect(statuses).toEqual(['connecting', 'live']);
    jest.advanceTimersByTime(25_000);
    expect(s.sent).toEqual(['ping']);
    live.close();
  });

  it('reconnects after a drop with a fresh token, and never after close()', async () => {
    const live = open();
    await flush();
    FakeSocket.all[0]!.onopen!();
    FakeSocket.all[0]!.close();
    expect(statuses.at(-1)).toBe('down');
    token = 't2';
    jest.advanceTimersByTime(3_000);
    await flush();
    expect(FakeSocket.all[1]!.protocols).toEqual(['bearer', 't2']);
    FakeSocket.all[1]!.onopen!();
    expect(statuses.at(-1)).toBe('live');
    live.close();
    jest.advanceTimersByTime(120_000);
    await flush();
    expect(FakeSocket.all).toHaveLength(2);
  });

  it('no token — tries again instead of opening a socket that would be refused', async () => {
    token = null;
    const live = open();
    await flush();
    expect(FakeSocket.all).toHaveLength(0);
    token = 't1';
    jest.advanceTimersByTime(3_000);
    await flush();
    expect(FakeSocket.all).toHaveLength(1);
    live.close();
  });

  it('a socket that answers nothing is dropped and opened again', async () => {
    const live = open();
    await flush();
    FakeSocket.all[0]!.onopen!();
    jest.advanceTimersByTime(75_000);
    expect(statuses.at(-1)).toBe('down');
    jest.advanceTimersByTime(3_000);
    await flush();
    expect(FakeSocket.all).toHaveLength(2);
    live.close();
  });
});

it('backoff grows and stays bounded', () => {
  expect(backoffMs(0, 0)).toBe(1_000);
  expect(backoffMs(3, 1)).toBe(9_000);
  expect(backoffMs(20, 1)).toBe(31_000);
});

it('kinds of messages', () => {
  expect(isGuestCard({ _type: 'visitor', id: 5 })).toBe(true);
  expect([isPass({ id: 1, employee_id: 2 }), isPass({ _type: 'visitor' }), isPass({ type: 'work_leave_notification' })]).toEqual([true, false, false]);
});

it('passInBranch', () => {
  expect(passInBranch({ employee_id: 1, visible_branch_ids: [2, 3] }, 3)).toBe(true);
  expect(passInBranch({ employee_id: 1, employee_branch_id: 2 }, 3)).toBe(false);
  expect(passInBranch({ visitor_id: 1, visitor: { organization_branch_id: 7 }, terminal_branch_id: 3 }, 3)).toBe(true);
  expect(passInBranch({ visitor_id: 1 }, 3)).toBe(false);
  expect(passInBranch({ visitor_id: 1 }, undefined)).toBe(true);
});
