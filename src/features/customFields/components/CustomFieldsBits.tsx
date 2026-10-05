// Qo'shimcha maydonlar ekranining kichik umumiy bo'laklari: kalit–qiymat qatori, kalitli almashtirgich,
// tur nomlari (KODLAR tarjima qilinmaydi — faqat ko'rinadigan nomi; noma'lum kod — server nomi, so'ng kodning o'zi).
import React from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/ui';
import { customFieldMetaQuery } from '../api/queries';

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

export function ToggleRow({
  label,
  value,
  onChange,
  testID,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  testID: string;
}) {
  const { colors: c } = useTheme();
  return (
    <View style={styles.toggle}>
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
  );
}

/** Obyekt va maydon turlarining ko'rinadigan nomi: mobil katalog → server nomi → kod. */
export function useTypeLabels() {
  const { t } = useTranslation();
  const meta = useQuery(customFieldMetaQuery());
  const serverLabel = (list: { value: string; label: string }[] | undefined, code: string) =>
    list?.find((x) => x.value === code)?.label ?? code;
  return {
    meta,
    entityLabel: (code: string) =>
      t(`customFields.entity_${code}`, { defaultValue: serverLabel(meta.data?.entity_types, code) }),
    typeLabel: (code?: string | null) =>
      code ? t(`customFields.type_${code}`, { defaultValue: serverLabel(meta.data?.field_types, code) }) : '—',
  };
}

const styles = StyleSheet.create({
  kv: { flexDirection: 'row', gap: 12, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  kvLabel: { width: '40%' },
  kvValue: { flex: 1 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 },
  flex: { flex: 1 },
});
