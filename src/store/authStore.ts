import { create } from 'zustand';
import { storage } from '../api/storage';
import { setAccessToken, setRefreshToken, clearTokens } from '../api/authToken';
import { User } from '../types';

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

export const useAuthStore = create<AuthState>((set) => ({
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
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    await clearTokens();
    await storage.deleteItem(USER_CACHE_KEY);
    set({ user: null, isAuthenticated: false });
  },

  setLoading: (v) => set({ isLoading: v }),
}));

export { USER_CACHE_KEY };

export function isMasterAdmin(user: User | null) {
  return user?.type === 'master-admin' || user?.employee?.multi_org_employee_role === 'ministr';
}

export function isEmployee(user: User | null) {
  return user?.type === 'employee' && !user?.employee?.is_multi_org_user;
}

export function isHR(user: User | null) {
  return user?.employee?.multi_org_employee_role === 'hr';
}
