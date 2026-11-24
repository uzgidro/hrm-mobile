// Text size of the whole app, chosen by the person (2026-11-24: older employees find the
// details too small). Same steps and ids as web v2 `a11y/lowVisionStore` — the choice is
// copied to the account under one key, so a new device starts with it.
import { create } from 'zustand';
import { storage } from '../api/storage';

export const TEXT_SIZE_STEPS = [
  { id: 'normal', scale: 1 },
  { id: 'medium', scale: 1.125 },
  { id: 'large', scale: 1.25 },
  { id: 'larger', scale: 1.375 },
  { id: 'xlarge', scale: 1.5 },
] as const;
export type TextSizeId = (typeof TEXT_SIZE_STEPS)[number]['id'];

/** The phone's own setting multiplies ours; together they never go past this. */
export const MAX_TOTAL_SCALE = 1.6;

const KEY = 'text_size';

export const isTextSizeId = (v: unknown): v is TextSizeId => TEXT_SIZE_STEPS.some((s) => s.id === v);
export const scaleOf = (id: TextSizeId): number => TEXT_SIZE_STEPS.find((s) => s.id === id)?.scale ?? 1;

interface TextSizeState {
  id: TextSizeId;
  /** The person chose a size on THIS device — it wins over the account's copy. */
  picked: boolean;
  hydrated: boolean;
  set: (id: TextSizeId, picked: boolean) => void;
  hydrate: () => Promise<void>;
}

export const useTextSizeStore = create<TextSizeState>((set) => ({
  id: 'normal',
  picked: false,
  hydrated: false,

  set: (id, picked) => {
    set({ id, picked });
    storage.setItem(KEY, JSON.stringify({ id, picked })).catch(() => {});
  },

  // Awaited by the auth bootstrap before the splash hides: the first frame already has
  // the chosen size. Never throws.
  hydrate: async () => {
    try {
      const raw = JSON.parse((await storage.getItem(KEY)) ?? 'null') as { id?: unknown; picked?: unknown } | null;
      if (raw && isTextSizeId(raw.id)) return set({ id: raw.id, picked: raw.picked === true, hydrated: true });
    } catch {
      /* unreadable — the normal size */
    }
    set({ hydrated: true });
  },
}));

/** Enlarged enough that a name no longer fits one line. */
export const LARGE_SCALE = 1.25;

/** How much the chosen step enlarges the text (1 = normal). */
export const useTextScale = (): number => useTextSizeStore((s) => scaleOf(s.id));
/**
 * Factor for labels whose width is fixed by their number (seven weekdays in a row): the size
 * they are drawn at never passes 112 %, whatever the step.
 */
export const useTightLabel = (): number => {
  const scale = useTextScale();
  return Math.min(scale, 1.125) / scale;
};

export const useLargeText = (): boolean => useTextScale() >= LARGE_SCALE;
