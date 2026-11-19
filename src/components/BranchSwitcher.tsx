// Faol filial tanlagichi (web v2 sarlavhadagi `BranchSelector` ning mobil shakli, 2026-10-07).
// Faqat global hisob (master-admin, ministr) yoki bir nechta filialga biriktirilgan hisobda
// ko'rinadi; boshqalarda hech narsa chizmaydi. Tanlov `branchStore` ga yoziladi — filialga
// bog'liq ekranlar (`useActiveBranchId`) so'rov kalitida filial bo'lgani uchun o'zi yangilanadi.
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/authStore';
import { useBranchStore } from '@/store/branchStore';
import { pickerBranchesQuery, useActiveBranchId } from '@/lib/useActiveBranch';
import { canSwitchBranchScope } from '@/utils/roles';
import { findExecutiveBranchId } from '@/utils/branch';
import { hasGlobalBranchScope, needsBranchPicker, userBranchIds } from '@/utils/userBranch';
import { Icon } from './Icon';
import { PickerModal } from './PickerModal';
import { Text } from '@/ui';

const ALL = -1;

export function BranchSwitcher() {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const user = useAuthStore((s) => s.user);
  const setSelected = useBranchStore((s) => s.setSelected);
  const active = useActiveBranchId();
  const [open, setOpen] = useState(false);
  const show = needsBranchPicker(user);
  const { data: branches = [] } = useQuery(pickerBranchesQuery(show));

  const options = useMemo(() => {
    const own = userBranchIds(user);
    const allowed = hasGlobalBranchScope(user) ? branches : branches.filter((b) => own.includes(b.id));
    const execId = findExecutiveBranchId(branches.map((b) => ({ id: b.id, name: b.name ?? '' })));
    const head = canSwitchBranchScope(user, execId) ? [{ value: ALL, label: t('common.allBranches') }] : [];
    return [...head, ...allowed.map((b) => ({ value: b.id, label: b.name || `#${b.id}` }))];
  }, [branches, user, t]);

  if (!show || !user) return null;
  const label = active == null ? t('common.allBranches') : branches.find((b) => b.id === active)?.name ?? '…';
  return (
    <>
      <Pressable
        testID="branch-switcher"
        accessibilityRole="button"
        accessibilityLabel={`${t('common.branch')}: ${label}`}
        onPress={() => setOpen(true)}
        hitSlop={6}
        style={({ pressed }) => [styles.chip, { backgroundColor: c.brandSoft }, pressed && styles.pressed]}
      >
        <Icon name="building" size={13} color={c.brand} />
        <Text variant="caption" tone="brand" numberOfLines={1} style={styles.label}>
          {label}
        </Text>
        <Icon name="chevronRight" size={13} color={c.brand} />
      </Pressable>
      <PickerModal
        visible={open}
        avatars={false}
        title={t('common.branch')}
        options={options}
        selected={active ?? ALL}
        onClose={() => setOpen(false)}
        onSelect={(v) => {
          setSelected(user.id, v === ALL ? null : Number(v));
          setOpen(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4, maxWidth: '100%' },
  label: { flexShrink: 1 },
  pressed: { opacity: 0.8 },
});
