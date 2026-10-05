// Ma'lumotnomalar katalogi (web v2 `useDictionaryTypes`) — bir nechta feature o'qiydi: Ma'lumotnomalar
// ekrani (ro'yxat) va Qo'shimcha maydonlar formasi («Ma'lumotnomadan» turidagi maydon qaysi
// ma'lumotnomadan o'qishi). Kalit v2 bilan bir xil — `['dictionaries', ...]` ostidagi har yozuv
// (`dictionaries` feature mutatsiyalari) uni ham, ta'til sabablari ro'yxatini ham yangilaydi.
import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { unwrapList } from '../api/response';
import { DICTIONARIES } from '../api/urls';

export interface DictionaryType {
  id: number;
  code: string;
  name: string;
  name_ru?: string | null;
  description?: string | null;
  /** Ierarxik ma'lumotnoma (tumanlar → viloyatlar) — ota ma'lumotnoma kodi. */
  parent_type_code?: string | null;
  is_system?: boolean;
  is_editable?: boolean;
  /** Yozuvlar boshqa modulga tegishli (filiallar, bo'limlar, lavozimlar) — faqat o'qiladi. */
  external_source?: string | null;
  sort_order?: number;
  is_active?: boolean;
  entry_count?: number;
  is_hierarchical?: boolean;
}

export const DICTIONARIES_KEY = ['dictionaries'] as const;

export function dictionaryTypesQuery() {
  return queryOptions({
    queryKey: [...DICTIONARIES_KEY, 'types'] as const,
    queryFn: () => apiClient.get(DICTIONARIES).then((r) => unwrapList<DictionaryType>(r.data)),
  });
}
