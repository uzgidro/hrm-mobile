// Qo'shimcha maydonlar (web v2 CustomFieldsPage + features/system/useCustomFields, TZ 4.2.6) — sof mantiq:
// guruh va maydon formalarining urug'i, tekshiruvi va tanasi (v2 bilan aynan), kalit yasash.
//
// Ikki daraja: GURUH — kartochkadagi bo'lim («Harbiy hisob», obyekt turi guruhda), MAYDON — uning ichidagi
// savol. Huquq: sahifa — `canAccessSystemAdmin` (admin hisobi, master-admin, AKT xodimi); ta'rifni
// yozish — server `require_structure_manager` (master-admin, admin hisobi, kadr) = `canManageStructure`.

/** Obyekt turlari — server `/custom-fields/meta` (meta kelmaguncha shu tartib). KODLAR tarjima qilinmaydi. */
export const ENTITY_TYPES = ['employee', 'department', 'job_position', 'staff_position', 'organization_branch'];

/** Maydon turlari — server `/custom-fields/meta` `field_types` (kodlar). */
export const FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'date',
  'boolean',
  'select',
  'multiselect',
  'radio',
  'dictionary',
  'employee',
  'email',
  'phone',
  'url',
];

export interface CustomField {
  id: number;
  group_id: number;
  key?: string | null;
  label?: string | null;
  field_type?: string | null;
  is_required?: boolean;
  placeholder?: string | null;
  help_text?: string | null;
  options?: { value?: string; label?: string }[] | null;
  dictionary_type_code?: string | null;
  min_value?: number | null;
  max_value?: number | null;
  position?: number;
  is_active?: boolean;
  show_in_list?: boolean;
}

export interface CustomFieldGroup {
  id: number;
  title?: string | null;
  entity_type?: string | null;
  description?: string | null;
  position?: number;
  is_active?: boolean;
  branch_ids?: number[] | null;
  fields?: CustomField[];
}

export interface CustomFieldMeta {
  entity_types: { value: string; label: string }[];
  field_types: { value: string; label: string }[];
}

/** Faqat tanlov turlarida variantlar ro'yxati bor (sana maydoniga variant so'rash — hech kim o'qimaydi). */
export const needsOptions = (type: string) => ['select', 'multiselect', 'radio'].includes(type);
export const needsDictionary = (type: string) => type === 'dictionary';
export const isNumeric = (type: string) => type === 'number';

/**
 * Nom → saqlash kaliti (v2 `slugKey`). O'zbek harflari tutuq belgisini YO'QOTADI (o‘ → o), pastki
 * chiziqqa aylanmaydi: «Ish o‘rni» → `ish_orni`, `ish_o_rni` emas.
 */
export function slugKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[‘’ʻʼ']/g, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

export type BuildResult = { ok: true; body: Record<string, unknown> } | { ok: false; error: string };

// ── Guruh ────────────────────────────────────────────────────────────────

export interface GroupForm {
  title: string;
  description: string;
  active: boolean;
}

export function seedGroupForm(row: CustomFieldGroup | null): GroupForm {
  return { title: row?.title ?? '', description: row?.description ?? '', active: row?.is_active !== false };
}

/**
 * v2 `GroupModal.submit`. `entity_type` faqat YARATISHDA — guruh mavjud bo'lgach obyekt turi o'zgarmaydi
 * (tahrir sxemasi uni qabul qilmaydi).
 */
export function buildGroupBody(form: GroupForm, isNew: boolean, entityType: string): BuildResult {
  if (!form.title.trim()) return { ok: false, error: 'customFields.titleRequired' };
  return {
    ok: true,
    body: {
      title: form.title.trim(),
      ...(isNew ? { entity_type: entityType } : {}),
      description: form.description.trim() || null,
      is_active: form.active,
    },
  };
}

// ── Maydon ───────────────────────────────────────────────────────────────

export interface FieldForm {
  label: string;
  key: string;
  /** Kalitga qo'l tekkanmi — tegmagan bo'lsa nomdan yasaladi. */
  keyTouched: boolean;
  type: string;
  required: boolean;
  showInList: boolean;
  active: boolean;
  help: string;
  optionsText: string;
  dictType: string;
  minValue: string;
  maxValue: string;
  position: string;
}

export function seedFieldForm(field: CustomField | null): FieldForm {
  return {
    label: field?.label ?? '',
    key: field?.key ?? '',
    keyTouched: !!field?.key,
    type: field?.field_type ?? 'text',
    required: !!field?.is_required,
    showInList: !!field?.show_in_list,
    active: field?.is_active !== false,
    help: field?.help_text ?? '',
    optionsText: (field?.options ?? []).map((o) => o.label ?? o.value ?? '').join('\n'),
    dictType: field?.dictionary_type_code ?? '',
    minValue: field?.min_value != null ? String(field.min_value) : '',
    maxValue: field?.max_value != null ? String(field.max_value) : '',
    position: field?.position != null ? String(field.position) : '',
  };
}

/** Nom o'zgardi: kalitga qo'l tegmagan bo'lsa u nomdan qayta yasaladi (v2). */
export function withLabel(form: FieldForm, label: string): FieldForm {
  return { ...form, label, key: form.keyTouched ? form.key : slugKey(label) };
}

/** Kalit qo'lda yozildi: darhol kalit shakliga keltiriladi va endi nomga ergashmaydi (v2). */
export function withKey(form: FieldForm, key: string): FieldForm {
  return { ...form, key: slugKey(key), keyTouched: true };
}

/** Bo'sh — `null`; vergul nuqtaga; son bo'lmasa — `NaN` (forma xatosi). */
function parseNum(raw: string): number | null {
  const s = raw.trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * v2 `FieldModal.submit`. `group_id` faqat YARATISHDA (maydon o'z guruhida qoladi). Kalit — server
 * majburiy talab qiladi; bo'sh bo'lsa nomdan yasaladi. Tahrirda kalit o'zgarmaydi (eski qiymatlar
 * yetim qolardi) — urug'dagi kalit qayta yuboriladi.
 */
export function buildFieldBody(form: FieldForm, groupId: number, isNew: boolean): BuildResult {
  if (!form.label.trim()) return { ok: false, error: 'customFields.labelRequired' };
  const key = (form.key || slugKey(form.label)).trim();
  if (!key) return { ok: false, error: 'customFields.keyRequired' };
  const choice = needsOptions(form.type);
  const dict = needsDictionary(form.type);
  const numeric = isNumeric(form.type);
  const options = choice
    ? form.optionsText
        .split('\n')
        .map((x) => x.trim())
        .filter(Boolean)
        .map((x) => ({ value: x, label: x }))
    : null;
  if (choice && !options?.length) return { ok: false, error: 'customFields.optionsRequired' };
  if (dict && !form.dictType) return { ok: false, error: 'customFields.dictionaryRequired' };
  const min = numeric ? parseNum(form.minValue) : null;
  const max = numeric ? parseNum(form.maxValue) : null;
  const pos = parseNum(form.position);
  if (Number.isNaN(min) || Number.isNaN(max)) return { ok: false, error: 'customFields.numberInvalid' };
  if (Number.isNaN(pos) || (pos != null && !Number.isInteger(pos)))
    return { ok: false, error: 'customFields.positionInvalid' };
  return {
    ok: true,
    body: {
      ...(isNew ? { group_id: groupId } : {}),
      key,
      label: form.label.trim(),
      field_type: form.type,
      is_required: form.required,
      show_in_list: form.showInList,
      is_active: form.active,
      help_text: form.help.trim() || null,
      options,
      dictionary_type_code: dict ? form.dictType || null : null,
      min_value: min,
      max_value: max,
      position: pos ?? 0,
    },
  };
}
