// Turniketlar ekranining kichik umumiy bo'laklari: kalit–qiymat qatori va manzillar tanlagichi.
import React from 'react';
import { Platform, StyleSheet, View, type KeyboardTypeOptions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { PickerModal } from '@/components/PickerModal';
import { Text } from '@/ui';
import { turnstileLocationsQuery } from '../api/queries';

/**
 * IP manzil klaviaturasi. `decimal-pad` ru/uz lokalida o'nlik ajratuvchini «,» qilib beradi — IP ni
 * (10.2.90.6) yozib bo'lmaydi. iOS da raqam + tinish belgilari, Android da oddiy klaviatura.
 */
export const IP_KEYBOARD: KeyboardTypeOptions = Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default';

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

/** Manzil nomlari (`null` — barcha ko'rinadigan manzillar; filial berilsa — faqat o'sha filialniki). */
export function useLocationNames(branchId: number | null, enabled = true) {
  const locations = useQuery({ ...turnstileLocationsQuery(branchId), enabled });
  const map = new Map((locations.data ?? []).map((l) => [l.id, l.name || `#${l.id}`]));
  return { locations, nameOf: (id: number) => map.get(id) ?? `#${id}` };
}

/** Bir nechta manzil tanlash (v2 Combobox + chiplar o'rnida). */
export function LocationsPicker({
  branchId,
  selected,
  onToggle,
  onClose,
}: {
  branchId: number | null;
  selected: number[];
  onToggle: (id: number) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { locations } = useLocationNames(branchId);
  return (
    <PickerModal
      avatars={false}
      visible
      multiple
      title={t('turnstiles.fieldLocations')}
      options={(locations.data ?? []).map((l) => ({ value: l.id, label: l.name || `#${l.id}` }))}
      loading={locations.isFetching}
      selected={selected}
      onClose={onClose}
      onSelect={onToggle}
      onToggle={onToggle}
    />
  );
}

const styles = StyleSheet.create({
  kv: { flexDirection: 'row', gap: 12, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  kvLabel: { width: '40%' },
  kvValue: { flex: 1 },
});
