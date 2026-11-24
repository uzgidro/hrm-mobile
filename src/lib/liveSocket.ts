// The attendance stream (`/ws/attendance`, web v2 `useAttendanceSocket`): turnstile passes and
// guest cards the moment they happen. The token goes as a `bearer` subprotocol, never in the URL.
//
// Pure: the caller brings the token, the clock-free rules are tested without React.

export type LiveStatus = 'connecting' | 'live' | 'down';

/** Only what the screens look at; the server sends more. */
export interface LiveMessage {
  id?: number;
  event_id?: number | string;
  employee_id?: number | null;
  visitor_id?: number | null;
  visible_branch_ids?: number[];
  employee_branch_id?: number | null;
  terminal_branch_id?: number | null;
  visitor?: { organization_branch_id?: number | null } | null;
  organization_branch_id?: number | null;
  /** `visitor` — a guest CARD was created, changed or deleted (not a pass). */
  _type?: string;
  /** `work_leave_notification` — no pass either. */
  type?: string;
}

export const isGuestCard = (m: LiveMessage) => m._type === 'visitor';
export const isPass = (m: LiveMessage) => !isGuestCard(m) && m.type !== 'work_leave_notification';

/** Does this pass belong to the branch on the screen? No branch — every branch does. */
export function passInBranch(m: LiveMessage, branchId: number | null | undefined): boolean {
  if (branchId == null) return true;
  const ids = m.visible_branch_ids?.length
    ? m.visible_branch_ids
    : m.employee_id
      ? [m.employee_branch_id]
      : [m.visitor?.organization_branch_id, m.terminal_branch_id];
  return ids.some((id) => id != null && Number(id) === Number(branchId));
}

export const PING_MS = 25_000;
/** A socket that has answered nothing for this long is dead (a phone that lost its network). */
export const SILENCE_MS = 70_000;

/** Full-jitter backoff: never hammers a server that is struggling. */
export const backoffMs = (attempt: number, random = Math.random()) =>
  Math.round(1_000 + random * Math.min(30_000, 1_000 * 2 ** attempt));

export function openLiveSocket({
  url,
  getToken,
  onMessage,
  onStatus,
}: {
  url: string;
  /** A token good for the handshake, or null when there is none (signed out, no network). */
  getToken: () => Promise<string | null>;
  onMessage: (m: LiveMessage) => void;
  onStatus: (s: LiveStatus) => void;
}): { close: () => void } {
  let socket: WebSocket | null = null;
  let closed = false;
  let attempt = 0;
  let heard = 0;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let beat: ReturnType<typeof setInterval> | undefined;

  const again = () => {
    clearInterval(beat);
    if (closed) return;
    onStatus('down');
    clearTimeout(retry);
    retry = setTimeout(() => void connect(), backoffMs(attempt));
    attempt = Math.min(attempt + 1, 10);
  };

  const connect = async () => {
    if (closed) return;
    const token = await getToken().catch(() => null);
    if (closed) return;
    if (!token) return again();
    let s: WebSocket;
    try {
      s = new WebSocket(url, ['bearer', token]);
    } catch {
      return again();
    }
    socket = s;
    s.onopen = () => {
      if (closed) return;
      heard = Date.now();
      onStatus('live');
      clearInterval(beat);
      beat = setInterval(() => {
        // Nothing back — the network went without telling: start over.
        if (Date.now() - heard > SILENCE_MS) return s.close();
        if (s.readyState === 1) s.send('ping');
      }, PING_MS);
    };
    s.onmessage = (ev: { data?: unknown }) => {
      heard = Date.now();
      // Reset on the first message, not on open: a server that accepts and closes at once
      // would turn the backoff into a reconnect every second.
      attempt = 0;
      if (typeof ev.data !== 'string' || ev.data === 'pong') return;
      try {
        const m: unknown = JSON.parse(ev.data);
        if (m && typeof m === 'object') onMessage(m as LiveMessage);
      } catch {
        /* not JSON — not for us */
      }
    };
    s.onerror = () => {}; // `close` always follows
    s.onclose = () => {
      if (socket === s) again();
    };
  };

  onStatus('connecting');
  void connect();
  return {
    close: () => {
      closed = true;
      clearTimeout(retry);
      clearInterval(beat);
      const s = socket;
      socket = null;
      s?.close();
    },
  };
}
