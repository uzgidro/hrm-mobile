// Hisobot parametrlari formasi (web v2 `ReportParamsForm`): har tur o'z boshqaruvi bilan,
// tanlov ro'yxatlari serverdan (`reports/{code}/options/{param}`, `depends_on` → `branch_ids`).
// Mobil chiza olmaydigan tur ko'rsatilmaydi (majburiy bo'lsa butun hisobot «Web versiyada»).
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { DatePickerModal } from '@/components/DatePicker';
import { FormInput } from '@/components/FormInput';
import { MonthNavigator } from '@/components/MonthNavigator';
import { Chip, SelectField, Text, Toggle } from '@/ui';
import { reportOptionsQuery } from '../api/queries';
import { reportLabel } from '../utils/labels';
import { branchDeps, selectionSummary, toggleOne, visibleParams, type ParamError, type Range } from '../utils/params';
import type { ParamDef, ReportOption, ReportParams } from '../utils/types';
import { OptionsSheet } from './OptionsSheet';

type Value = string | number;

const fmtDate = (iso?: string) =>
  iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : '';
const label = (def: ParamDef) => `${reportLabel(def.label_key, def.name)}${def.required ? ' *' : ''}`;

export function ParamsForm({
  code,
  defs,
  value,
  errors,
  onChange,
}: {
  code: string;
  defs: ParamDef[];
  value: ReportParams;
  errors: Record<string, ParamError>;
  onChange: (next: ReportParams) => void;
}) {
  useTranslation();
  return (
    <View style={styles.form}>
      {visibleParams(defs).map((d) => (
        <ParamControl
          key={d.name}
          code={code}
          def={d}
          value={value[d.name]}
          all={value}
          error={errors[d.name]}
          onChange={(v) => onChange({ ...value, [d.name]: v })}
        />
      ))}
    </View>
  );
}

function ParamControl({
  code,
  def,
  value,
  all,
  error,
  onChange,
}: {
  code: string;
  def: ParamDef;
  value: unknown;
  all: ReportParams;
  error?: ParamError;
  onChange: (v: unknown) => void;
}) {
  const { t } = useTranslation();
  const [dateOpen, setDateOpen] = useState<null | 'from' | 'to' | 'date'>(null);
  const tid = `report-param-${def.name}`;

  switch (def.kind) {
    case 'date_range': {
      const r = (value ?? {}) as Range;
      return (
        <View style={styles.block}>
          <Text variant="label" tone="muted">
            {label(def)}
          </Text>
          <View style={styles.pair}>
            <View style={styles.half}>
              <SelectField
                testID={`${tid}-from`}
                label={t('reports.dateFrom')}
                value={fmtDate(r.from)}
                placeholder={t('reports.pickPlaceholder')}
                icon="calendar"
                onPress={() => setDateOpen('from')}
              />
            </View>
            <View style={styles.half}>
              <SelectField
                testID={`${tid}-to`}
                label={t('reports.dateTo')}
                value={fmtDate(r.to)}
                placeholder={t('reports.pickPlaceholder')}
                icon="calendar"
                onPress={() => setDateOpen('to')}
              />
            </View>
          </View>
          {(error === 'range' || error === 'long') && (
            <Text variant="caption" tone="danger">
              {t(error === 'range' ? 'reports.invalidRange' : 'reports.invalidLong')}
            </Text>
          )}
          {(dateOpen === 'from' || dateOpen === 'to') && (
            <DatePickerModal
              visible
              title={dateOpen === 'from' ? t('reports.dateFrom') : t('reports.dateTo')}
              value={(dateOpen === 'from' ? r.from : r.to) || null}
              onConfirm={(iso) => onChange({ ...r, [dateOpen]: iso })}
              onClose={() => setDateOpen(null)}
            />
          )}
        </View>
      );
    }
    case 'date': {
      const v = typeof value === 'string' ? value : '';
      return (
        <View style={styles.block}>
          <SelectField
            testID={tid}
            label={label(def)}
            value={fmtDate(v)}
            placeholder={t('reports.pickPlaceholder')}
            icon="calendar"
            onPress={() => setDateOpen('date')}
          />
          {dateOpen === 'date' && (
            <DatePickerModal
              visible
              title={reportLabel(def.label_key, def.name)}
              value={v || null}
              onConfirm={(iso) => onChange(iso)}
              onClose={() => setDateOpen(null)}
            />
          )}
        </View>
      );
    }
    case 'month': {
      const raw = String(value ?? '').slice(0, 7);
      const month = /^\d{4}-\d{2}$/.test(raw) ? dayjs(`${raw}-01`) : dayjs().startOf('month');
      return (
        <View style={styles.block} testID={tid}>
          <Text variant="label" tone="muted">
            {label(def)}
          </Text>
          <MonthNavigator month={month} onChange={(m) => onChange(m.format('YYYY-MM'))} />
        </View>
      );
    }
    case 'text':
      return (
        <FormInput
          testID={tid}
          label={reportLabel(def.label_key, def.name)}
          required={def.required}
          value={value == null ? '' : String(value)}
          onChangeText={(v) => onChange(v.slice(0, 200))}
        />
      );
    case 'time_range': {
      const r = (value ?? {}) as Range;
      return (
        <View style={styles.block}>
          <Text variant="label" tone="muted">
            {label(def)}
          </Text>
          <View style={styles.pair}>
            <View style={styles.half}>
              <FormInput
                testID={`${tid}-from`}
                label={t('reports.timeFrom')}
                placeholder="00:00"
                value={r.from ?? ''}
                onChangeText={(v) => onChange({ ...r, from: v.trim() })}
              />
            </View>
            <View style={styles.half}>
              <FormInput
                testID={`${tid}-to`}
                label={t('reports.timeTo')}
                placeholder="23:59"
                value={r.to ?? ''}
                onChangeText={(v) => onChange({ ...r, to: v.trim() })}
              />
            </View>
          </View>
          {error === 'time' && (
            <Text variant="caption" tone="danger">
              {t('reports.invalidTime')}
            </Text>
          )}
        </View>
      );
    }
    case 'bool':
      return (
        <View style={styles.switchRow}>
          <Text variant="body" style={styles.switchLabel}>
            {reportLabel(def.label_key, def.name)}
          </Text>
          <Toggle
            testID={tid}
            value={!!value}
            onValueChange={onChange}
          />
        </View>
      );
    case 'int':
      if (def.options_source) return <PickerParam code={code} def={def} value={value} all={all} onChange={onChange} />;
      return (
        <FormInput
          testID={tid}
          label={reportLabel(def.label_key, def.name)}
          required={def.required}
          keyboardType="number-pad"
          value={value == null ? '' : String(value)}
          error={error === 'int' ? t('reports.invalidInt') : undefined}
          onChangeText={(v) => {
            const s = v.trim();
            // Butun son bo'lmasa xom satr qoladi — `paramErrors` uni ushlaydi (yuborilmaydi).
            onChange(s === '' ? null : /^-?\d+$/.test(s) ? Number(s) : s);
          }}
        />
      );
    case 'enum':
      if (def.choices.length) return <ChoiceChips def={def} value={value} onChange={onChange} />;
      return <PickerParam code={code} def={def} value={value} all={all} onChange={onChange} />;
    case 'branch_multi':
    case 'division_tree':
    case 'job_multi':
    case 'employee_multi':
      return <PickerParam code={code} def={def} value={value} all={all} onChange={onChange} />;
    default:
      return null;
  }
}

/** Statik tanlovlar (masalan lavozim guruhlari, kesim turi) — chiplar; ixtiyoriy yakkada «Barchasi». */
function ChoiceChips({ def, value, onChange }: { def: ParamDef; value: unknown; onChange: (v: unknown) => void }) {
  const { t } = useTranslation();
  const list = Array.isArray(value) ? (value as Value[]) : [];
  return (
    <View style={styles.block}>
      <Text variant="label" tone="muted">
        {label(def)}
      </Text>
      <View style={styles.chips}>
        {!def.multiple && !def.required && (
          <Chip label={t('reports.any')} selected={value == null || value === ''} onPress={() => onChange(null)} />
        )}
        {def.choices.map((ch) => {
          const on = def.multiple ? list.some((v) => String(v) === ch.value) : value === ch.value;
          return (
            <Chip
              key={ch.value}
              testID={`report-param-${def.name}-${ch.value}`}
              label={reportLabel(ch.label_key, ch.value)}
              selected={on}
              onPress={() =>
                def.multiple ? onChange(toggleOne(list, ch.value)) : onChange(on && !def.required ? null : ch.value)
              }
            />
          );
        })}
      </View>
    </View>
  );
}

/**
 * Server ro'yxatli parametr. Ro'yxat varaq ochilganda (yoki tanlangan nomlarni ko'rsatish
 * kerak bo'lsa) yuklanadi; xodimlar — server qidiruvi, `limit` 50 dan 200 gacha (v2 «ko'proq»),
 * tanlanganlar nomi `ids` bilan alohida (qidiruv sahifasida bo'lmasligi mumkin).
 */
function PickerParam({
  code,
  def,
  value,
  all,
  onChange,
}: {
  code: string;
  def: ParamDef;
  value: unknown;
  all: ReportParams;
  onChange: (v: unknown) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const debounced = useDebouncedValue(q);
  // Bo'sh qidiruv kechiktirilmaydi: qayta ochilganda 400 ms davomida eski filtr ko'rinmasin.
  const dq = q === '' ? '' : debounced;
  const [limit, setLimit] = useState(50);
  const remote = def.kind === 'employee_multi';
  const multiple = !(def.kind === 'int' || (def.kind === 'enum' && !def.multiple));
  const selected: Value[] = multiple
    ? Array.isArray(value)
      ? (value as Value[])
      : []
    : value == null || value === ''
      ? []
      : [value as Value];
  const deps = branchDeps(def, all);

  const opts = useQuery(
    reportOptionsQuery(
      code,
      def.name,
      { branch_ids: deps, q: remote ? dq : undefined, limit: remote ? limit : undefined },
      open != null || (!remote && selected.length > 0),
    ),
  );
  // Tanlanganlar nomi — filialsiz: filial o'zgargach boshqa filialdagi tanlangan xodim «#123» bo'lib qolmasin.
  const chosen = useQuery(reportOptionsQuery(code, def.name, { ids: selected }, remote && selected.length > 0));

  const labels = useMemo(() => {
    const m: Record<string, string> = {};
    for (const o of [...(opts.data ?? []), ...(chosen.data ?? [])] as ReportOption[]) {
      if (!o.is_branch) m[String(o.value)] = o.label;
    }
    return m;
  }, [opts.data, chosen.data]);

  const options = opts.data ?? [];
  return (
    <View style={styles.block}>
      <SelectField
        testID={`report-param-${def.name}`}
        label={label(def)}
        value={selectionSummary(selected, labels)}
        placeholder={multiple ? t('reports.any') : t('reports.pickPlaceholder')}
        onPress={() => {
          // Varaq qidiruvsiz ochiladi — oldingi qidiruv natijasi qolib ketmasin.
          setQ('');
          setLimit(50);
          setOpen(Date.now());
        }}
      />
      {open != null && (
        <OptionsSheet
          key={open}
          testID={`report-options-${def.name}`}
          title={reportLabel(def.label_key, def.name)}
          options={options}
          loading={opts.isFetching}
          multiple={multiple}
          tree={def.kind === 'division_tree'}
          selected={selected}
          clearable={multiple || !def.required}
          onChange={(next) => onChange(multiple ? next : (next[0] ?? null))}
          onClose={() => setOpen(null)}
          onSearchChange={
            remote
              ? (s) => {
                  setQ(s);
                  setLimit(50);
                }
              : undefined
          }
          hasMore={remote && options.length >= limit && limit < 200}
          onLoadMore={() => setLimit((l) => Math.min(200, l + 50))}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  block: { gap: 6 },
  pair: { flexDirection: 'row', gap: 10 },
  half: { flex: 1, minWidth: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  switchLabel: { flex: 1 },
});
