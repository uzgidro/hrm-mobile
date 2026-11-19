// Small form controls for the learning builder sheets: a choice field backed by
// the picker modal, a date field and a switch row (same shape as the other modules).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { DatePickerModal } from '@/components/DatePicker';
import { PickerModal } from '@/components/PickerModal';
import { SelectField, Text, Toggle } from '@/ui';
import { fmtDate } from '../utils/learning';

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

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, marginBottom: 6 },
  flex: { flex: 1 },
});
