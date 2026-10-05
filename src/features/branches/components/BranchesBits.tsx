// Filiallar ekranining kichik umumiy bo'laklari: kalit–qiymat qatori, filial nomlari xaritasi.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/ui';
import { branchesQuery } from '../api/queries';
import { branchName } from '../utils/branches';

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

/** Filial nomi ro'yxatdan (topilmasa `#id`) — manzillar va manzil formasi uchun. */
export function useBranchNames() {
  const branches = useQuery(branchesQuery());
  const map = new Map((branches.data ?? []).map((b) => [b.id, branchName(b)]));
  return { branches, nameOf: (id: number) => map.get(id) ?? `#${id}` };
}

const styles = StyleSheet.create({
  kv: { flexDirection: 'row', gap: 12, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  kvLabel: { width: '40%' },
  kvValue: { flex: 1 },
});
