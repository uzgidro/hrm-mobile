// Tanlangan (faol) filial — web v2 `branchStore` ning mobil nusxasi (2026-10-07).
//
// NEGA: tizim administratori / master-admin hisobida xodim kartasi yo'q, ekranlar filialni
// faqat `employee` dan o'qirdi → `organization_branch_id` yuborilmay BUTUN tashkilot
// yuklanardi va ilova qotardi; ko'p filialli xodimlar esa boshqa filialga o'ta olmasdi.
//
// Qiymat hisobga bog'lab saqlanadi (`userId`): boshqa odam shu telefonda kirsa eski tanlov
// unga o'tmaydi. `selected`: raqam — filial, `null` — «Barcha filiallar» (faqat ruxsat
// berilganlarga), `undefined` — tanlanmagan (standart qoida ishlaydi, `useActiveBranchId`).
import { create } from 'zustand';
import { storage } from '../api/storage';

const KEY = 'active_branch_v1';

interface BranchState {
  userId: number | null;
  selected: number | null | undefined;
  hydrated: boolean;
  setSelected: (userId: number, id: number | null) => void;
  hydrate: () => Promise<void>;
}

export const useBranchStore = create<BranchState>((set) => ({
  userId: null,
  selected: undefined,
  hydrated: false,
  setSelected: (userId, id) => {
    set({ userId, selected: id });
    storage.setItem(KEY, JSON.stringify({ userId, selected: id })).catch(() => {});
  },
  hydrate: async () => {
    try {
      const raw = await storage.getItem(KEY);
      const v = raw ? (JSON.parse(raw) as { userId?: number; selected?: number | null }) : null;
      set({
        userId: typeof v?.userId === 'number' ? v.userId : null,
        selected: v && 'selected' in v ? (v.selected ?? null) : undefined,
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },
}));
