// Unsaved-form drafts (2026-09-13). A long letter / order / ticket used to be
// lost whenever Android killed the app in the background (a phone call, low
// memory) or the user navigated away by accident. Text-shaped form state is
// autosaved to disk while typing and offered back on the next open; picked
// files are not (they are URIs into a picker cache that may be gone).
//
// Storage: `expo-file-system` (`Paths.document`) on native — a document
// exceeds SecureStore's 2 KB value ceiling — and `localStorage` on web. The
// module is a dependency of `expo` itself (autolinked), so no new native
// requirement is introduced. Every call is try/catch'ed: a storage failure
// must never break the form.
import { Platform } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';

const DRAFT_DIR = 'form-drafts';
const AUTOSAVE_MS = 800;

async function fileFor(key: string) {
  const fs = await import('expo-file-system');
  const dir = new fs.Directory(fs.Paths.document, DRAFT_DIR);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return new fs.File(dir, `${encodeURIComponent(key)}.json`);
}

export async function loadDraft<T>(key: string): Promise<T | null> {
  try {
    if (Platform.OS === 'web') {
      const raw = globalThis.localStorage?.getItem(`draft:${key}`);
      return raw ? (JSON.parse(raw) as T) : null;
    }
    const f = await fileFor(key);
    if (!f.exists) return null;
    return JSON.parse(await f.text()) as T;
  } catch {
    return null;
  }
}

export async function saveDraft<T>(key: string, value: T): Promise<void> {
  try {
    const raw = JSON.stringify(value);
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(`draft:${key}`, raw);
      return;
    }
    const f = await fileFor(key);
    f.write(raw);
  } catch {
    /* never break the form */
  }
}

export async function clearDraft(key: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.removeItem(`draft:${key}`);
      return;
    }
    const f = await fileFor(key);
    if (f.exists) f.delete();
  } catch {
    /* ignore */
  }
}

/**
 * Autosave `values` under `key` while `enabled` (create mode, form dirty) and
 * hand back a previously saved draft ONCE via `onRestore`. The caller decides
 * what "dirty" means (usually: any text typed) so an untouched form never
 * writes a draft.
 */
export function useFormDraft<T>(
  key: string,
  values: T,
  opts: { enabled: boolean; dirty: boolean; onRestore: (draft: T) => void },
) {
  const [pending, setPending] = useState<T | null>(null);
  const loadedRef = useRef(false);
  // Latest restore callback without re-subscribing (written in an effect,
  // not during render, per the react-hooks refs rule).
  const restoreRef = useRef(opts.onRestore);
  useEffect(() => { restoreRef.current = opts.onRestore; });

  // Load once.
  useEffect(() => {
    if (!opts.enabled || loadedRef.current) return;
    loadedRef.current = true;
    let cancelled = false;
    void loadDraft<T>(key).then((d) => {
      if (!cancelled && d != null) setPending(d);
    });
    return () => { cancelled = true; };
  }, [key, opts.enabled]);

  // Debounced autosave.
  const serialized = JSON.stringify(values);
  useEffect(() => {
    if (!opts.enabled || !opts.dirty) return;
    const id = setTimeout(() => { void saveDraft(key, values); }, AUTOSAVE_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, key, opts.enabled, opts.dirty]);

  const restore = useCallback(() => {
    if (pending != null) restoreRef.current(pending);
    setPending(null);
  }, [pending]);
  const discard = useCallback(() => {
    setPending(null);
    void clearDraft(key);
  }, [key]);
  const clear = useCallback(() => clearDraft(key), [key]);

  return { pendingDraft: pending, restore, discard, clear };
}
