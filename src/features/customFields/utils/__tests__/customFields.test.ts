import {
  buildFieldBody,
  buildGroupBody,
  needsDictionary,
  needsOptions,
  seedFieldForm,
  seedGroupForm,
  slugKey,
  withKey,
  withLabel,
  type CustomField,
} from '../customFields';

describe('slugKey (v2)', () => {
  it('tutuq belgisi yo‘qoladi, boshqa belgilar pastki chiziq, chetlari kesiladi', () => {
    expect(slugKey('Ish o‘rni')).toBe('ish_orni');
    expect(slugKey("G'aznachi bo'limi")).toBe('gaznachi_bolimi');
    expect(slugKey('  Harbiy hisob №1 ')).toBe('harbiy_hisob_1');
    expect(slugKey('Пасспорт')).toBe('');
    expect(slugKey('a'.repeat(80))).toHaveLength(64);
  });
});

describe('guruh formasi', () => {
  it('urug‘: yangi — bo‘sh va faol; mavjud — qiymatlari', () => {
    expect(seedGroupForm(null)).toEqual({ title: '', description: '', active: true });
    expect(seedGroupForm({ id: 1, title: 'Harbiy', description: 'Izoh', is_active: false })).toEqual({
      title: 'Harbiy',
      description: 'Izoh',
      active: false,
    });
  });

  it('nom majburiy; entity_type faqat yaratishda', () => {
    expect(buildGroupBody({ title: ' ', description: '', active: true }, true, 'employee')).toEqual({
      ok: false,
      error: 'customFields.titleRequired',
    });
    expect(buildGroupBody({ title: ' Harbiy ', description: ' ', active: true }, true, 'department')).toEqual({
      ok: true,
      body: { title: 'Harbiy', entity_type: 'department', description: null, is_active: true },
    });
    expect(buildGroupBody({ title: 'Harbiy', description: 'Izoh', active: false }, false, 'department')).toEqual({
      ok: true,
      body: { title: 'Harbiy', description: 'Izoh', is_active: false },
    });
  });
});

describe('maydon formasi', () => {
  const field: CustomField = {
    id: 5,
    group_id: 2,
    key: 'harbiy_unvon',
    label: 'Harbiy unvon',
    field_type: 'select',
    is_required: true,
    show_in_list: true,
    is_active: true,
    help_text: 'Yordam',
    options: [{ value: 'a', label: 'Leytenant' }, { value: 'Kapitan' }],
    position: 3,
  };

  it('urug‘: yangi — matn turi, kalitga qo‘l tegmagan; mavjud — variantlar qatorma-qator', () => {
    const n = seedFieldForm(null);
    expect(n.type).toBe('text');
    expect(n.keyTouched).toBe(false);
    expect(n.active).toBe(true);
    const f = seedFieldForm(field);
    expect(f.keyTouched).toBe(true);
    expect(f.optionsText).toBe('Leytenant\nKapitan');
    expect(f.position).toBe('3');
    expect(f.minValue).toBe('');
  });

  it('kalit nomga ergashadi, qo‘lda yozilgach — yo‘q', () => {
    let f = withLabel(seedFieldForm(null), 'Ish o‘rni');
    expect(f.key).toBe('ish_orni');
    f = withKey(f, 'Maxsus Kalit');
    expect(f.key).toBe('maxsus_kalit');
    expect(withLabel(f, 'Boshqa').key).toBe('maxsus_kalit');
  });

  it('nom va kalit majburiy', () => {
    expect(buildFieldBody(seedFieldForm(null), 2, true)).toEqual({ ok: false, error: 'customFields.labelRequired' });
    expect(buildFieldBody({ ...seedFieldForm(null), label: 'Пасспорт' }, 2, true)).toEqual({
      ok: false,
      error: 'customFields.keyRequired',
    });
  });

  it('yangi matn maydoni: tana v2 bilan aynan (group_id, kalit nomdan, tartib 0)', () => {
    const f = withLabel(seedFieldForm(null), ' Ish o‘rni ');
    expect(buildFieldBody(f, 2, true)).toEqual({
      ok: true,
      body: {
        group_id: 2,
        key: 'ish_orni',
        label: 'Ish o‘rni',
        field_type: 'text',
        is_required: false,
        show_in_list: false,
        is_active: true,
        help_text: null,
        options: null,
        dictionary_type_code: null,
        min_value: null,
        max_value: null,
        position: 0,
      },
    });
  });

  it('tahrir: group_id yuborilmaydi; variantlar value=label; bo‘sh qatorlar tashlanadi', () => {
    const f = { ...seedFieldForm(field), optionsText: 'Leytenant\n\n Kapitan \n' };
    const r = buildFieldBody(f, 2, false);
    expect(r.ok && r.body).toMatchObject({
      key: 'harbiy_unvon',
      options: [
        { value: 'Leytenant', label: 'Leytenant' },
        { value: 'Kapitan', label: 'Kapitan' },
      ],
      position: 3,
    });
    expect(r.ok && 'group_id' in r.body).toBe(false);
  });

  it('tanlov turi variantsiz va ma‘lumotnoma turi tanlanmagan — forma xatosi', () => {
    expect(needsOptions('radio')).toBe(true);
    expect(needsDictionary('dictionary')).toBe(true);
    const base = withLabel(seedFieldForm(null), 'Tanlov');
    expect(buildFieldBody({ ...base, type: 'multiselect' }, 2, true)).toEqual({
      ok: false,
      error: 'customFields.optionsRequired',
    });
    expect(buildFieldBody({ ...base, type: 'dictionary' }, 2, true)).toEqual({
      ok: false,
      error: 'customFields.dictionaryRequired',
    });
    const ok = buildFieldBody({ ...base, type: 'dictionary', dictType: 'regions', optionsText: 'x' }, 2, true);
    expect(ok.ok && ok.body).toMatchObject({ dictionary_type_code: 'regions', options: null });
  });

  it('son chegaralari faqat son turida; vergul nuqtaga; noto‘g‘ri son — xato', () => {
    const base = { ...withLabel(seedFieldForm(null), 'Yosh'), minValue: '1,5', maxValue: '99' };
    const num = buildFieldBody({ ...base, type: 'number' }, 2, true);
    expect(num.ok && num.body).toMatchObject({ min_value: 1.5, max_value: 99 });
    const txt = buildFieldBody(base, 2, true);
    expect(txt.ok && txt.body).toMatchObject({ min_value: null, max_value: null });
    expect(buildFieldBody({ ...base, type: 'number', maxValue: 'abc' }, 2, true)).toEqual({
      ok: false,
      error: 'customFields.numberInvalid',
    });
    expect(buildFieldBody({ ...base, position: '2.5' }, 2, true)).toEqual({
      ok: false,
      error: 'customFields.positionInvalid',
    });
  });
});
