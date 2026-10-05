import type { DictionaryType } from '@/utils/dictionaries';
import {
  buildEntryBody,
  entryParams,
  entrySubtitle,
  filterTypes,
  isReadOnly,
  seedEntryForm,
  usageLines,
} from '../dictionaries';

const T = (x: Partial<DictionaryType>): DictionaryType => ({ id: 1, code: 'x', name: 'X', ...x });

describe('ma‘lumotnomalar ro‘yxati', () => {
  const types = [
    T({ id: 1, code: 'nationalities', name: 'Millatlar', name_ru: 'Национальности' }),
    T({ id: 2, code: 'regions', name: 'Viloyatlar', name_ru: 'Области' }),
  ];
  it('qidiruv: nom, ruscha nom, kod — katta-kichik harf farqsiz', () => {
    expect(filterTypes(types, ' ')).toHaveLength(2);
    expect(filterTypes(types, 'MILLAT').map((x) => x.id)).toEqual([1]);
    expect(filterTypes(types, 'облас').map((x) => x.id)).toEqual([2]);
    expect(filterTypes(types, 'region').map((x) => x.id)).toEqual([2]);
  });

  it('faqat o‘qish: huquq yo‘q / tashqi manba / tizim (o‘zgarmas)', () => {
    expect(isReadOnly(T({ is_editable: true }), true)).toBe(false);
    expect(isReadOnly(T({ is_editable: true }), false)).toBe(true);
    expect(isReadOnly(T({ is_editable: true, external_source: 'departments' }), true)).toBe(true);
    expect(isReadOnly(T({ is_editable: false }), true)).toBe(true);
  });
});

describe('yozuvlar', () => {
  it('so‘rov parametrlari: bo‘shlari yuborilmaydi; holat → is_active', () => {
    expect(entryParams({ page: 1, search: ' ', parentId: null, status: '' })).toEqual({ page: 1, size: 25 });
    expect(entryParams({ page: 3, search: ' tosh ', parentId: 7, status: 'inactive' })).toEqual({
      page: 3,
      size: 25,
      search: 'tosh',
      parent_id: 7,
      is_active: false,
    });
  });

  it('qator osti: ruscha nom · tegishli (faqat ierarxikda) · kod', () => {
    const e = { id: 1, code: 'chilonzor', name: 'Chilonzor', name_ru: 'Чиланзар', parent_name: 'Toshkent' };
    expect(entrySubtitle(e, true)).toBe('Чиланзар · Toshkent · chilonzor');
    expect(entrySubtitle(e, false)).toBe('Чиланзар · chilonzor');
  });

  it('forma: urug‘, nom majburiy, kod bo‘sh bo‘lsa yuborilmaydi, tartib son bo‘lmasa 0', () => {
    expect(seedEntryForm(null)).toEqual({
      name: '',
      nameRu: '',
      code: '',
      description: '',
      parentId: null,
      sortOrder: '0',
      active: true,
    });
    expect(buildEntryBody(seedEntryForm(null))).toEqual({ ok: false, error: 'dictionaries.nameRequired' });
    expect(buildEntryBody({ ...seedEntryForm(null), name: ' Qozoq ', sortOrder: 'abc' })).toEqual({
      ok: true,
      body: { name: 'Qozoq', name_ru: null, description: null, parent_id: null, sort_order: 0, is_active: true },
    });
    const edit = seedEntryForm({
      id: 4,
      code: 'uz',
      name: "O'zbek",
      name_ru: 'Узбек',
      parent_id: 2,
      sort_order: 5,
      is_active: false,
    });
    expect(buildEntryBody({ ...edit, code: ' uzb ' })).toEqual({
      ok: true,
      body: {
        name: "O'zbek",
        name_ru: 'Узбек',
        description: null,
        parent_id: 2,
        sort_order: 5,
        is_active: false,
        code: 'uzb',
      },
    });
  });

  it('«qayerda ishlatilyapti» satrlari: 3 ta namuna', () => {
    expect(usageLines(null)).toEqual([]);
    expect(usageLines({ entry_id: 1, used: false, refs: [] })).toEqual([]);
    expect(
      usageLines({
        entry_id: 1,
        used: true,
        refs: [
          { label: 'Xodimlar', count: 4, sample: ['Ali', 'Vali', 'Soli', 'Gani'] },
          { label: 'Tumanlar', count: 2, sample: [] },
        ],
      }),
    ).toEqual(['Xodimlar — 4 (Ali, Vali, Soli…)', 'Tumanlar — 2']);
  });
});
