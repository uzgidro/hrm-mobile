import { create } from 'zustand';
import { storage } from '../api/storage';

const ONLY_SUBORDINATES_KEY = 'pref_only_subordinates';

interface PrefsState {
  onlySubordinates: boolean;
  hydrated: boolean;
  setOnlySubordinates: (v: boolean) => void;
  hydrate: () => Promise<void>;
}

export const usePrefsStore = create<PrefsState>((set) => ({
  onlySubordinates: false,
  hydrated: false,

  setOnlySubordinates: (v) => {
    set({ onlySubordinates: v });
    storage.setItem(ONLY_SUBORDINATES_KEY, v ? '1' : '0').catch(() => {});
  },

  hydrate: async () => {
    try {
      const saved = await storage.getItem(ONLY_SUBORDINATES_KEY);
      set({ onlySubordinates: saved === '1', hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
}));
