// Tabel sozlamalari ekranining kichik umumiy bo'laklari: kalit–qiymat qatori, bo'lim sarlavhasi, yoqgich
// qatori, o'nlik son maydoni va soat tanlagichi (v2 `ClockSelect`: soat ro'yxati + 5 daqiqalik qadam —
// Zoom formasidagi SelectField + PickerModal naqshi).
import React, { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { FormInput } from '@/components/FormInput';
import { PickerModal } from '@/components/PickerModal';
import { SelectField, Text } from '@/ui';
import { parseDecimal } from '../utils/blank';
import { CLOCK_HOURS, CLOCK_MINUTES, setClockHour, setClockMinute, splitClock } from '../utils/tabelConfig';

export function KeyValue({ label, value, testID }: { label: string; value?: string | null; testID?: string }) {
  const { colors: c } = useTheme();
  return (
    <View style={[styles.kv, { borderBottomColor: c.border }]}>
      <Text variant="caption" tone="muted" style={styles.kvLabel}>
        {label}
      </Text>
      <Text variant="body" style={styles.kvValue} testID={testID}>
        {value || '—'}
      </Text>
    </View>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return (
    <Text variant="label" tone="brand" weight="700" style={styles.section}>
      {children}
    </Text>
  );
}

export function SwitchRow({
  label,
  hint,
  value,
  onChange,
  testID,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  testID?: string;
}) {
  const { colors: c } = useTheme();
  return (
    <View style={styles.switchWrap}>
      <View style={styles.switchRow}>
        <Text variant="body" style={styles.flex}>
          {label}
        </Text>
        <Switch
          testID={testID}
          value={value}
          onValueChange={onChange}
          trackColor={{ false: c.border, true: c.brand }}
          thumbColor={c.surface}
        />
      </View>
      {!!hint && (
        <Text variant="caption" tone="subtle">
          {hint}
        </Text>
      )}
    </View>
  );
}

/**
 * O'nlik son maydoni: matn o'zida saqlanadi (yozilayotgan «2,» yo'qolmasin), tashqariga — son yoki
 * undefined (bo'sh / son emas — v2 `num`). Ota `key` bilan qayta mount qilinadi.
 */
export function DecimalField({
  label,
  value,
  onChange,
  placeholder,
  testID,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  testID?: string;
}) {
  const [text, setText] = useState(value != null ? String(value) : '');
  return (
    <FormInput
      testID={testID}
      label={label}
      value={text}
      placeholder={placeholder}
      keyboardType="decimal-pad"
      onChangeText={(v) => {
        setText(v);
        onChange(parseDecimal(v));
      }}
    />
  );
}

const NONE = -1;

/** v2 `ClockSelect`: "HH:MM" yoki '' (bo'sh = umumiy qiymat). Daqiqa soat tanlanmaguncha o'chiq. */
export function ClockField({
  label,
  value,
  onChange,
  testID,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testID: string;
}) {
  const { t } = useTranslation();
  const [picker, setPicker] = useState<null | 'h' | 'm'>(null);
  const { h, m } = splitClock(value);
  const empty = t('tabelSettings.lateGracePlaceholder');
  return (
    <View style={styles.clock}>
      <Text variant="label" tone="muted">
        {label}
      </Text>
      <View style={styles.pair}>
        <View style={styles.flex}>
          <SelectField
            testID={`${testID}-hour`}
            label={t('tabelSettings.clockHour')}
            value={h ? `${h}:00` : ''}
            placeholder={empty}
            icon="clock"
            onPress={() => setPicker('h')}
          />
        </View>
        <View style={styles.flex}>
          <SelectField
            testID={`${testID}-minute`}
            label={t('tabelSettings.clockMinute')}
            value={h ? m || '00' : ''}
            placeholder="00"
            disabled={!h}
            onPress={() => setPicker('m')}
          />
        </View>
      </View>
      {picker === 'h' && (
        <PickerModal
          visible
          title={`${label} · ${t('tabelSettings.clockHour')}`}
          options={[{ value: NONE, label: empty }, ...CLOCK_HOURS.map((x, i) => ({ value: i, label: `${x}:00` }))]}
          selected={h ? Number(h) : NONE}
          onClose={() => setPicker(null)}
          onSelect={(v) => {
            onChange(setClockHour(value, v === NONE ? '' : CLOCK_HOURS[v]!));
            setPicker(null);
          }}
        />
      )}
      {picker === 'm' && (
        <PickerModal
          visible
          title={`${label} · ${t('tabelSettings.clockMinute')}`}
          options={CLOCK_MINUTES.map((x) => ({ value: Number(x), label: x }))}
          selected={m ? Number(m) : null}
          onClose={() => setPicker(null)}
          onSelect={(v) => {
            onChange(setClockMinute(value, String(v).padStart(2, '0')));
            setPicker(null);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  kv: { flexDirection: 'row', gap: 12, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  kvLabel: { width: '40%' },
  kvValue: { flex: 1 },
  section: { marginTop: 6 },
  switchWrap: { gap: 4 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  clock: { gap: 6 },
  pair: { flexDirection: 'row', gap: 8 },
});
