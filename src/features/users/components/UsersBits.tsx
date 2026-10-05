// Foydalanuvchilar ekranining kichik umumiy bo'laklari: kalit–qiymat qatori, «ruxsat yo'q» kartasi,
// filial tanlagichi (v2 global filial tanlagichi o'rnida — bo'sh = barcha filiallar).
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { PickerModal } from '@/components/PickerModal';
import { Card, EmptyState, Text } from '@/ui';
import { usersBranchesQuery } from '../api/queries';

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

export function Denied({ hint }: { hint: string }) {
  const { t } = useTranslation();
  return (
    <Card>
      <EmptyState title={t('users.noAccess')} message={hint} pose="sad" />
    </Card>
  );
}

/** Filial nomi katalogdan (topilmasa `#id`). Katalog faqat kerak bo'lganda yuklanadi. */
export function useBranchName(enabled = true) {
  const branches = useQuery({ ...usersBranchesQuery(), enabled });
  const map = new Map((branches.data ?? []).map((b) => [b.id, b.name || `#${b.id}`]));
  return { branches, nameOf: (id: number) => map.get(id) ?? `#${id}` };
}

const ALL = -1;

export function BranchPicker({
  visible,
  selected,
  allLabel,
  onClose,
  onSelect,
}: {
  visible: boolean;
  selected: number | null;
  allLabel: string;
  onClose: () => void;
  onSelect: (id: number | null) => void;
}) {
  const { t } = useTranslation();
  const { branches } = useBranchName(visible);
  return (
    <PickerModal
      visible={visible}
      title={t('users.colBranch')}
      options={[
        { value: ALL, label: allLabel },
        ...(branches.data ?? []).map((b) => ({ value: b.id, label: b.name || `#${b.id}` })),
      ]}
      loading={branches.isFetching}
      selected={selected ?? ALL}
      onClose={onClose}
      onSelect={(v) => {
        onClose();
        onSelect(v === ALL ? null : v);
      }}
    />
  );
}

const styles = StyleSheet.create({
  kv: { flexDirection: 'row', gap: 12, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  kvLabel: { width: '40%' },
  kvValue: { flex: 1 },
});
