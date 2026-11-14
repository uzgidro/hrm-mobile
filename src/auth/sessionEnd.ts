// Session end, shared by logout(), the forced PIN-limit logout and the
// launch-time wipe in lockStore.hydrate().
//
// Order matters: the caller destroys the local credentials FIRST (so a killed
// app can never keep a session), then calls endServerSession() with the values it
// captured beforehand. Those captured tokens live only in this call's closure
// (memory); nothing here writes a credential back to storage.
//
//   1. presentation off + delivered/scheduled notifications cleared (local, sync-ish)
//   2. DELETE push-tokens with the captured access token
//   3. on 401 (access token expired): ONE refresh with the captured refresh token,
//      then DELETE again with the new access token
//   4. POST auth/logout (revoke) with the newest tokens (refresh rotates)
//   5. offline at step 2/3: persist a marker holding ONLY the push token
import axios from 'axios';
import { API_BASE_URL } from '../constants';
import { revokeServerSession } from './session';
import {
  clearPresentedNotifications,
  savePendingUnbind,
  setNotificationPresentationSuppressed,
  unbindPushTokenOnce,
} from '../services/notifications';

/** Local-only part: nothing from the old account may be shown from now on. */
export function silenceNotificationsLocally(): void {
  setNotificationPresentationSuppressed(true);
  void clearPresentedNotifications();
}

async function refreshOnce(refresh: string): Promise<{ access: string; refresh: string | null } | null> {
  try {
    const { data } = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      { refresh_token: refresh },
      { timeout: 10000 },
    );
    if (!data?.access_token) return null;
    return { access: data.access_token as string, refresh: (data.refresh_token as string | undefined) ?? refresh };
  } catch {
    return null;
  }
}

/** Best-effort server side of a session end. Never throws. `skipPush` is for
 *  accounts that never bind a push token (external doctor). */
export async function endServerSession(
  access: string | null,
  refresh: string | null,
  opts: { skipPush?: boolean } = {},
): Promise<void> {
  let curAccess = access;
  let curRefresh = refresh;
  try {
    if (!opts.skipPush) {
      let pushToken: string | null = null;
      if (curAccess) {
        const first = await unbindPushTokenOnce(curAccess);
        pushToken = first.token;
        let outcome = first.outcome;
        if (outcome === 'unauthorized' && curRefresh) {
          const fresh = await refreshOnce(curRefresh);
          if (fresh) {
            curAccess = fresh.access;
            curRefresh = fresh.refresh;
            outcome = (await unbindPushTokenOnce(curAccess)).outcome;
          }
        }
        if (outcome === 'offline' && pushToken) await savePendingUnbind(pushToken);
      } else if (curRefresh) {
        // Launch-time wipe with only a refresh token left: refresh once to unbind.
        const fresh = await refreshOnce(curRefresh);
        if (fresh) {
          curAccess = fresh.access;
          curRefresh = fresh.refresh;
          const r = await unbindPushTokenOnce(curAccess);
          if (r.outcome === 'offline' && r.token) await savePendingUnbind(r.token);
        }
      }
    }
  } catch {
    // Never let the unbind break the revoke below.
  }
  await revokeServerSession(curAccess, curRefresh);
}
