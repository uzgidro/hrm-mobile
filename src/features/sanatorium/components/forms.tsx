// Form controls shared by the registrar's sheets: a choice field backed by the picker modal,
// a date field, a switch row and a small error line.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { DatePickerModal } from '@/components/DatePicker';
import { PickerModal } from '@/components/PickerModal';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { SelectField, Text, Toggle } from '@/ui';
import { fmtDate } from '../utils/sanatorium';

export type Choice<T extends string | number> = { value: T; label: string; sub?: string };

/** Picks one of `options` (or none when `noneLabel` is given). Values may be strings or ids. */
export function ChoiceField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  noneLabel,
  placeholder,
  loading,
  title,
  testID,
}: {
  label: string;
  value: T | null;
  options: Choice<T>[];
  onChange: (v: T | null) => void;
  /** When set, the list starts with a «none» row that clears the value. */
  noneLabel?: string;
  placeholder?: string;
  loading?: boolean;
  title?: string;
  testID?: string;
}) {
  const [open, setOpen] = useState(false);
  // The picker speaks numbers: 0 = none, i + 1 = options[i].
  const list = [...(noneLabel ? [{ value: 0, label: noneLabel }] : []), ...options.map((o, i) => ({ value: i + 1, label: o.label, subLabel: o.sub }))];
  const idx = options.findIndex((o) => o.value === value);
  const shown = idx >= 0 ? options[idx]!.label : noneLabel && value == null ? noneLabel : undefined;
  return (
    <>
      <SelectField label={label} value={shown} placeholder={placeholder} onPress={() => setOpen(true)} testID={testID} />
      <PickerModal
        visible={open}
        title={title ?? label}
        options={list}
        loading={loading}
        selected={idx >= 0 ? idx + 1 : noneLabel ? 0 : null}
        avatars={false}
        onClose={() => setOpen(false)}
        onSelect={(n) => {
          onChange(n === 0 ? null : options[n - 1]!.value);
          setOpen(false);
        }}
      />
    </>
  );
}

export function DateField({
  label,
  value,
  onChange,
  testID,
}: {
  label: string;
  value: string | null;
  onChange: (iso: string) => void;
  testID?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SelectField label={label} value={value ? fmtDate(value) : undefined} placeholder="—" icon="calendar" onPress={() => setOpen(true)} testID={testID} />
      <DatePickerModal visible={open} value={value} title={label} onConfirm={onChange} onClose={() => setOpen(false)} />
    </>
  );
}

export function SwitchRow({
  label,
  value,
  onChange,
  testID,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  testID?: string;
}) {
  return (
    <View style={styles.switchRow}>
      <Text variant="body" style={styles.flex}>
        {label}
      </Text>
      <Toggle value={value} onValueChange={onChange} accessibilityLabel={label} testID={testID} />
    </View>
  );
}

export function ErrorLine({ message, testID }: { message: string | null; testID?: string }) {
  const { colors: c } = useTheme();
  if (!message) return null;
  return (
    <View style={styles.err}>
      <Icon name="close" size={14} color={c.danger} />
      <Text variant="label" tone="danger" style={styles.flex} testID={testID}>
        {message}
      </Text>
    </View>
  );
}

/** Optional text → `undefined` when blank so strict bodies never carry empty strings. */
export const opt = (s: string): string | undefined => (s.trim() ? s.trim() : undefined);
/** Optional text for PUT/PATCH bodies: blank clears the field. */
export const optNull = (s: string): string | null => (s.trim() ? s.trim() : null);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  err: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 4 },
});
