// Ma'lumotnomalar (web v2 DictionariesPage + features/dictionaries, TZ 4.2.5 / D1 / D2) — sof mantiq:
// ro'yxat qidiruvi, faqat-o'qish qoidasi, yozuvlar so'rovi parametrlari, yozuv formasi va «qayerda
// ishlatilyapti» satrlari (v2 bilan aynan).
//
// Huquq: o'qish — barcha rollar (server har kimga bir xil katalog beradi). Yozish — `canManageDictionaries`
// (master-admin, kadr). Tashqi manbali (filiallar, bo'limlar, lavozimlar — boshqa modul egasi) va tizim
// (`is_editable: false`) ma'lumotnomalari hech kimga yozilmaydi.
import type { DictionaryType } from '@/utils/dictionaries';
import { foldText } from '@/utils/searchFold';

export const DICT_PAGE_SIZE = 25;

export interface DictionaryEntry {
  id: number;
  type_id?: number | null;
  type_code?: string | null;
  code: string;
  name: string;
  name_ru?: string | null;
  description?: string | null;
  parent_id?: number | null;
  parent_name?: string | null;
  sort_order?: number;
  is_active?: boolean;
  extra?: Record<string, unknown> | null;
  is_external?: boolean;
}

export interface DictionaryUsage {
  entry_id: number;
  used: boolean;
  refs: { label: string; count: number; sample?: string[] }[];
}

export type StatusFilter = '' | 'active' | 'inactive';

/** v2: ma'lumotnoma ro'yxatidagi qidiruv — nom, ruscha nom yoki kod bo'yicha, mijozda. */
export function filterTypes(types: DictionaryType[], query: string): DictionaryType[] {
  const s = foldText(query.trim());
  if (!s) return types;
  return types.filter(
    (x) =>
      foldText((x.name ?? '')).includes(s) ||
      foldText((x.name_ru ?? '')).includes(s) ||
      foldText(x.code).includes(s),
  );
}

/** v2 `readOnly`: huquq yo'q, yoki yozuvlar boshqa modulniki, yoki tizim ma'lumotnomasi. */
export function isReadOnly(type: DictionaryType, manage: boolean): boolean {
  return !manage || !!type.external_source || !type.is_editable;
}

export interface EntryArgs {
  page: number;
  search: string;
  parentId: number | null;
  status: StatusFilter;
}

/** v2 `useDictionaryEntries` parametrlari: bo'shlari yuborilmaydi. */
export function entryParams(a: EntryArgs): Record<string, unknown> {
  return {
    page: a.page,
    size: DICT_PAGE_SIZE,
    ...(a.search.trim() ? { search: a.search.trim() } : {}),
    ...(a.parentId != null ? { parent_id: a.parentId } : {}),
    ...(a.status ? { is_active: a.status === 'active' } : {}),
  };
}

/** Qator osti: ruscha nom · tegishli (ierarxik bo'lsa) · kod. */
export function entrySubtitle(e: DictionaryEntry, hierarchical: boolean): string {
  return [e.name_ru, hierarchical ? e.parent_name : null, e.code].filter(Boolean).join(' · ');
}

export type BuildResult = { ok: true; body: Record<string, unknown> } | { ok: false; error: string };

export interface EntryForm {
  name: string;
  nameRu: string;
  code: string;
  description: string;
  parentId: number | null;
  sortOrder: string;
  active: boolean;
}

export function seedEntryForm(e: DictionaryEntry | null): EntryForm {
  return {
    name: e?.name ?? '',
    nameRu: e?.name_ru ?? '',
    code: e?.code ?? '',
    description: e?.description ?? '',
    parentId: e?.parent_id ?? null,
    sortOrder: String(e?.sort_order ?? 0),
    active: e?.is_active ?? true,
  };
}

/**
 * v2 `DictionaryEntryModal.submit`. Kod bo'sh bo'lsa yuborilmaydi — server nomdan barqaror kod yasaydi
 * (qo'lda yozilgan kod ma'lumotnomalar bir-biriga havola qila olmay qolishining eng ko'p sababi).
 * Tartib son bo'lmasa — 0 (v2 `Number(x) || 0`).
 */
export function buildEntryBody(form: EntryForm): BuildResult {
  if (!form.name.trim()) return { ok: false, error: 'dictionaries.nameRequired' };
  const body: Record<string, unknown> = {
    name: form.name.trim(),
    name_ru: form.nameRu.trim() || null,
    description: form.description.trim() || null,
    parent_id: form.parentId,
    sort_order: Number(form.sortOrder) || 0,
    is_active: form.active,
  };
  if (form.code.trim()) body.code = form.code.trim();
  return { ok: true, body };
}

/** v2 o'chirish oynasi: «Xodimlar — 3 (Ali, Vali, Soli…)». */
export function usageLines(u: DictionaryUsage | null): string[] {
  if (!u?.used) return [];
  return u.refs.map(
    (r) => `${r.label} — ${r.count}${r.sample?.length ? ` (${r.sample.slice(0, 3).join(', ')}…)` : ''}`,
  );
}
