// The sanatorium card at the top of the home screen for staff whose home is the sanatorium
// (`sanatorium_home`): occupancy numbers at a glance and one tap into the module.
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { LIP, moduleTint, radii } from '@/theme/tokens';
import { useAuthStore } from '@/store/authStore';
import { Text } from '@/ui';
import { dashboardQuery } from '../api/queries';
import { canSeeSanatorium } from '../utils/sanatorium';

export function SanatoriumHomeCard() {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const user = useAuthStore((s) => s.user);
  const allowed = canSeeSanatorium(user);
  const q = useQuery(dashboardQuery(allowed));
  if (!allowed) return null;
  const tint = moduleTint(c, 'cyan');
  const s = q.data?.stats ?? {};
  const cells: { label: string; value: number | undefined }[] = [
    { label: t('sanatorium.stats.in_house'), value: s.in_house },
    { label: t('sanatorium.stats.arrivals_today'), value: s.arrivals_today },
    { label: t('sanatorium.stats.departures_today'), value: s.departures_today },
  ];
  return (
    <Pressable
      testID="sanatorium-home-card"
      accessibilityRole="button"
      accessibilityLabel={t('sanatorium.title')}
      onPress={() => router.push('/sanatorium')}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: tint.wash, borderColor: tint.fg, borderBottomWidth: pressed ? 1.5 : 1.5 + LIP, transform: [{ translateY: pressed ? LIP : 0 }] },
      ]}
    >
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: tint.fg }]}>
          <Icon name="sun" size={20} color={c.fgOnBrand} />
        </View>
        <View style={styles.flex}>
          <Text variant="title">{t('sanatorium.title')}</Text>
          <Text variant="caption" tone="muted">
            {t('sanatorium.homeSubtitle')}
          </Text>
        </View>
        <Icon name="chevronRight" size={20} color={c.fgMuted} />
      </View>
      <View style={styles.cells}>
        {cells.map((x) => (
          <View key={x.label} style={styles.cell}>
            <Text variant="number">{x.value ?? '–'}</Text>
            <Text variant="caption" tone="muted" numberOfLines={2}>
              {x.label}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, borderWidth: 1.5, padding: 16, marginBottom: 12, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  icon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cells: { flexDirection: 'row', gap: 10 },
  cell: { flex: 1 },
});
