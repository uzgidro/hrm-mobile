import { create } from 'zustand';
import { storage } from '../api/storage';
import { setAccessToken, setRefreshToken, clearTokens, getAccessToken, getRefreshToken } from '../api/authToken';
import { useLockStore } from './lockStore';
import { endServerSession, silenceNotificationsLocally } from '../auth/sessionEnd';
import { setNotificationPresentationSuppressed } from '../services/notifications';
import { User } from '../types';
import { clearOwnerDrafts, getDraftOwner, setDraftOwner } from '../lib/formDraft';
import { QUEUE_KEY } from '../features/checkin/lib/queue';

const USER_CACHE_KEY = 'cached_user';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User) => void;
  login: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  setLoading: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => {
    storage.setItem(USER_CACHE_KEY, JSON.stringify(user)).catch(() => {});
    set({ user, isAuthenticated: true });
  },

  login: async (accessToken, refreshToken, user) => {
    // Route token writes through authToken so the in-memory cache stays in sync.
    await setAccessToken(accessToken);
    await setRefreshToken(refreshToken);
    await storage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    // Start every login from a clean lock: if a prior user was killed without
    // logging out, their PIN record must not carry over to whoever logs in now.
    await useLockStore.getState().reset();
    // A new session may show notifications again (they were silenced at logout).
    setNotificationPresentationSuppressed(false);
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    // Local wipe FIRST (F-38): the session must be gone from this device even
    // if the app is killed mid-logout or the network stalls. Tokens are
    // captured in memory so the best-effort server calls below can still
    // authenticate after the wipe.
    const access = await getAccessToken();
    const refresh = await getRefreshToken();
    await clearTokens();
    await storage.deleteItem(USER_CACHE_KEY);
    // Only now drop the PIN record - never the other way round, or a killed app
    // would be left with a live session and no PIN (= open first-run setup).
    await useLockStore.getState().reset();
    // Nothing from the old account may be shown from now on, even if the server
    // still pushes for a while. The account type is read before the user is cleared.
    const skipPush = get().user?.type === 'external-doctor';
    silenceNotificationsLocally();
    // Best-effort server side (push unbind -> one refresh if the access token
    // expired -> session revoke) with the in-memory captured tokens; neither
    // blocks nor can fail the logout.
    void endServerSession(access, refresh, { skipPush });
    set({ user: null, isAuthenticated: false });
    // Shu xodimning qoralamalari keyingi foydalanuvchiga qolmasin. Yuborilmagan
    // «Keldim» navbati esa saqlanadi — u egasiga bog'langan va faqat o'sha xodim
    // qayta kirganda yuboriladi.
    await clearOwnerDrafts(getDraftOwner(), [QUEUE_KEY]);
  },

  setLoading: (v) => set({ isLoading: v }),
}));

export { USER_CACHE_KEY };

// Qoralama/navbat egasi har doim joriy sessiyaga teng: login, setUser va
// bootstrap (keshdagi foydalanuvchi) — hammasi shu store orqali o'tadi.
setDraftOwner(useAuthStore.getState().user?.id);
useAuthStore.subscribe((s) => setDraftOwner(s.user?.id));
