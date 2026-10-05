// Foydalanuvchilar ekranining kichik umumiy bo'laklari: kalit–qiymat qatori, «ruxsat yo'q» kartasi,
// filial tanlagichi (v2 global filial tanlagichi o'rnida — bo'sh = barcha filiallar).
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { PickerModal } from '@/components/PickerModal';
import { Card, EmptyState, Text, WEB_BREAK } from '@/ui';
import { usersBranchesQuery } from '../api/queries';
import { isLongToken } from '../utils/users';

export function KeyValue({ label, value, testID }: { label: string; value?: string | null; testID?: string }) {
  const { colors: c } = useTheme();
  // Bo'linmas uzun qiymat (pochta) — yorliq ostida to'liq kenglikda, aks holda so'z o'rtasidan bo'linadi.
  const stacked = isLongToken(value);
  return (
    <View style={[styles.kv, stacked && styles.kvStacked, { borderBottomColor: c.border }]}>
      <Text variant="caption" tone="muted" style={stacked ? undefined : styles.kvLabel}>
        {label}
      </Text>
      <Text variant="body" selectable style={[stacked ? undefined : styles.kvValue, WEB_BREAK]} testID={testID}>
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
      avatars={false}
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
  // Yorliq eni qat'iy (uzun bo'linmas qiymat uni siqib 3 qatorga tushirmasin), qiymat o'raladi.
  kvLabel: { width: '40%', flexShrink: 0 },
  kvValue: { flex: 1, minWidth: 0 },
  kvStacked: { flexDirection: 'column', gap: 2 },
});
