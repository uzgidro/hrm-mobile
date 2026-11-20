// The nurse's card at the top of the home screen (2026-11-20): today's progress at a
// glance and one tap back into the queue. Shown only to a nurse (a branch to grade in)
// while the health module is on; everyone else gets nothing.
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { LIP, moduleTint, radii } from '@/theme/tokens';
import { useAuthStore } from '@/store/authStore';
import { canAccessPage } from '@/utils/roles';
import { ProgressBar, Text } from '@/ui';
import { healthRosterQuery } from '../api/queries';
import { useHealthBranch } from '../hooks/useHealthBranch';
import { rosterCounts } from '../utils/health';
import { HealthCounts } from './HealthProgress';

export function HealthHomeCard() {
  const user = useAuthStore((s) => s.user);
  if (!user?.nurse_branch_ids?.length || !canAccessPage(user, 'health')) return null;
  return <NurseCard />;
}

function NurseCard() {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const { branchId } = useHealthBranch({ withPicker: false });
  const roster = useQuery(healthRosterQuery(branchId, dayjs().format('YYYY-MM-DD')));
  const counts = rosterCounts(roster.data ?? []);
  const tint = moduleTint(c, 'pink');
  const done = counts.total > 0 && counts.unchecked === 0;
  return (
    <Pressable
      testID="health-home-card"
      accessibilityRole="button"
      accessibilityLabel={t('health.title')}
      onPress={() => router.push('/sogliq-korigi')}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: tint.wash,
          borderColor: tint.fg,
          borderBottomWidth: pressed ? 1.5 : 1.5 + LIP,
          transform: [{ translateY: pressed ? LIP : 0 }],
        },
      ]}
    >
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: tint.fg }]}>
          <Icon name="check" size={20} color={c.fgOnBrand} />
        </View>
        <View style={styles.flex}>
          <Text variant="title">{t('health.title')}</Text>
          <Text variant="caption" tone={done ? 'success' : 'muted'}>
            {roster.data
              ? done
                ? t('health.allDoneShort')
                : t('health.homeWaiting', { count: counts.unchecked, total: counts.total })
              : t('health.subtitleShort')}
          </Text>
        </View>
        <Icon name="chevronRight" size={20} color={c.fgMuted} />
      </View>
      {roster.data && counts.total > 0 ? (
        <View style={styles.body}>
          <ProgressBar value={counts.checked / counts.total} color={done ? c.success : tint.fg} />
          <HealthCounts counts={counts} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, borderWidth: 1.5, padding: 16, marginBottom: 12, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  icon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  body: { gap: 10 },
});
