import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import { DICTIONARY_ENTRIES, DICTIONARY_ENTRY_USAGE, DICTIONARY_OPTIONS } from '@/api/urls';
import { DICTIONARIES_KEY, dictionaryTypesQuery } from '@/utils/dictionaries';
import {
  DICT_PAGE_SIZE,
  entryParams,
  type DictionaryEntry,
  type DictionaryUsage,
  type EntryArgs,
} from '../utils/dictionaries';

// Ildiz v2 bilan bir xil (`['dictionaries']`): katalog (`types`, Qo'shimcha maydonlar formasi ham o'qiydi),
// yozuvlar va formalardagi tanlagichlar (`options` — masalan, ta'til sabablari) bitta kalit ostida.
export const dictionariesKeys = {
  all: DICTIONARIES_KEY,
  entries: (code: string, a: EntryArgs) => [...DICTIONARIES_KEY, 'entries', code, a] as const,
  options: (code: string) => [...DICTIONARIES_KEY, 'options', code] as const,
};

export { dictionaryTypesQuery };

export interface PagedEntries {
  items: DictionaryEntry[];
  total: number;
  pages: number;
}

/** Bitta ma'lumotnoma yozuvlari — server qidiruvi va sahifalash (25 tadan). */
export function dictionaryEntriesQuery(code: string, a: EntryArgs) {
  return queryOptions({
    queryKey: dictionariesKeys.entries(code, a),
    queryFn: () =>
      apiClient.get(DICTIONARY_ENTRIES(code), { params: entryParams(a) }).then((r): PagedEntries => {
        const items = unwrapList<DictionaryEntry>(r.data);
        const meta = (r.data && !Array.isArray(r.data) ? r.data : {}) as { total?: number; pages?: number };
        const total = meta.total ?? items.length;
        return { items, total, pages: meta.pages ?? Math.max(1, Math.ceil(total / DICT_PAGE_SIZE)) };
      }),
    placeholderData: keepPreviousData,
  });
}

/** Faol yozuvlar, sahifasiz — ierarxik ma'lumotnomaning OTA yozuvlari (filtr va forma uchun). */
export function dictionaryOptionsQuery(code: string) {
  return queryOptions({
    queryKey: dictionariesKeys.options(code),
    queryFn: () => apiClient.get(DICTIONARY_OPTIONS(code)).then((r) => unwrapList<DictionaryEntry>(r.data)),
    staleTime: 5 * 60 * 1000,
  });
}

/** Yozuv qayerda ishlatilyapti — o'chirishdan oldin so'raladi (maslahat; o'chirishning o'zi hal qiladi). */
export const fetchEntryUsage = (id: number) =>
  apiClient.get<DictionaryUsage>(DICTIONARY_ENTRY_USAGE(id)).then((r) => r.data);
