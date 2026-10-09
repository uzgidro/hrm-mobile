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
//
// Owner scoping (2026-10-09, xavfsizlik auditi): qoralamalar va «Keldim» oflayn
// navbati ilgari BUTUN QURILMA uchun bitta edi — A xodim oflayn belgi qo'yib
// chiqib ketsa, keyin kirgan B tokeni bilan A ning surati va GPS'i B nomidan
// yuborilardi, A ning xat qoralamasi esa B ga taklif qilinardi. Endi har bir
// yozuv foydalanuvchi papkasida (`form-drafts/u<id>/`); egasiz (sessiyasiz)
// holatda hech narsa o'qilmaydi ham, yozilmaydi ham. Egasi noma'lum eski
// (`form-drafts/<kalit>.json`) fayllar birinchi ega o'rnatilganda o'chiriladi.
import { Platform } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';

const DRAFT_DIR = 'form-drafts';
const AUTOSAVE_MS = 800;

let owner: string | null = null;
let legacyPurged = false;

/** authStore chaqiradi: joriy foydalanuvchi id'si (yoki sessiya yo'q — null). */
export function setDraftOwner(userId: number | string | null | undefined): void {
  owner = userId == null || userId === '' ? null : `u${userId}`;
  if (owner && !legacyPurged) {
    legacyPurged = true;
    void purgeLegacyDrafts();
  }
}

export function getDraftOwner(): string | null {
  return owner;
}

const webKey = (o: string, key: string) => `draft:${o}:${key}`;

async function ownerDir(o: string) {
  const fs = await import('expo-file-system');
  const root = new fs.Directory(fs.Paths.document, DRAFT_DIR);
  if (!root.exists) root.create({ intermediates: true, idempotent: true });
  const dir = new fs.Directory(root, o);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return { fs, dir };
}

async function fileFor(o: string, key: string) {
  const { fs, dir } = await ownerDir(o);
  return new fs.File(dir, `${encodeURIComponent(key)}.json`);
}

/** Egasi noma'lum (scoping'dan oldingi) qoralamalarni o'chiradi. */
async function purgeLegacyDrafts(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      const ls = globalThis.localStorage;
      if (!ls) return;
      const stale: string[] = [];
      for (let i = 0; i < ls.length; i++) {
        const k = ls.key(i);
        if (k && k.startsWith('draft:') && !/^draft:u[^:]+:/.test(k)) stale.push(k);
      }
      stale.forEach((k) => ls.removeItem(k));
      return;
    }
    const fs = await import('expo-file-system');
    const root = new fs.Directory(fs.Paths.document, DRAFT_DIR);
    if (!root.exists) return;
    for (const entry of root.list()) {
      if (entry instanceof fs.File) entry.delete();
    }
  } catch {
    /* ignore */
  }
}

/**
 * Chiqishda: shu foydalanuvchining qoralamalarini o'chiradi. `keep` dagi
 * kalitlar (masalan, hali yuborilmagan «Keldim» navbati) qoladi — ular egasiga
 * bog'langan, shuning uchun faqat o'sha xodim qayta kirganda yuboriladi.
 */
export async function clearOwnerDrafts(o: string | null, keep: string[] = []): Promise<void> {
  if (!o) return;
  try {
    if (Platform.OS === 'web') {
      const ls = globalThis.localStorage;
      if (!ls) return;
      const prefix = `draft:${o}:`;
      const keepKeys = new Set(keep.map((k) => webKey(o, k)));
      const stale: string[] = [];
      for (let i = 0; i < ls.length; i++) {
        const k = ls.key(i);
        if (k && k.startsWith(prefix) && !keepKeys.has(k)) stale.push(k);
      }
      stale.forEach((k) => ls.removeItem(k));
      return;
    }
    const { fs, dir } = await ownerDir(o);
    const keepNames = new Set(keep.map((k) => `${encodeURIComponent(k)}.json`));
    for (const entry of dir.list()) {
      if (entry instanceof fs.File && !keepNames.has(entry.name)) entry.delete();
    }
  } catch {
    /* ignore */
  }
}

export async function loadDraft<T>(key: string): Promise<T | null> {
  const o = owner;
  if (!o) return null;
  try {
    if (Platform.OS === 'web') {
      const raw = globalThis.localStorage?.getItem(webKey(o, key));
      return raw ? (JSON.parse(raw) as T) : null;
    }
    const f = await fileFor(o, key);
    if (!f.exists) return null;
    return JSON.parse(await f.text()) as T;
  } catch {
    return null;
  }
}

export async function saveDraft<T>(key: string, value: T): Promise<void> {
  const o = owner;
  if (!o) return;
  try {
    const raw = JSON.stringify(value);
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(webKey(o, key), raw);
      return;
    }
    const f = await fileFor(o, key);
    f.write(raw);
  } catch {
    /* never break the form */
  }
}

export async function clearDraft(key: string): Promise<void> {
  const o = owner;
  if (!o) return;
  try {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.removeItem(webKey(o, key));
      return;
    }
    const f = await fileFor(o, key);
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
