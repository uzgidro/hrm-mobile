// «Mening kunim» hero kartasi (Duolingo "Today's review" + v2 grad-hero):
// binafsha→tomchi gradient, ism va lavozim, ish vaqti chipi, ikki mini tile
// (bugun keldim / ish vaqti), o'ngda Tomchi maskoti, pastda oq lab'li tugma.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { gradients, radii } from '@/theme/tokens';
import { Avatar, Button, Text } from '@/ui';
import { Tomchi } from '@/ui/mascot/Tomchi';
import type { DayTimeline } from '../../utils/dayTimeline';

export function formatWorked(minutes: number, t: (k: string, o?: Record<string, unknown>) => string): string {
  return t('dashboard.home.hoursMinutes', { h: Math.floor(minutes / 60), m: minutes % 60 });
}

export function MyDayHero({
  name,
  position,
  photo,
  scheduleRange,
  timeline,
}: {
  name: string;
  position?: string;
  photo?: string | null;
  scheduleRange?: string | null;
  timeline: DayTimeline;
}) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const arrived = !!timeline.firstIn;
  return (
    <LinearGradient
      colors={[...(isDark ? gradients.heroDark : gradients.hero)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={styles.top}>
        {/* Oq halqa — gradient ustida avatar (bosh harflar) ko'rinsin. */}
        <View style={styles.avatarRing}>
          <Avatar name={name} uri={photo} size={50} />
        </View>
        <View style={styles.who}>
          <Text variant="caption" tone="onBrand" style={styles.eyebrow}>
            {t('dashboard.home.myDay')}
          </Text>
          <Text variant="title" tone="onBrand" numberOfLines={2} style={styles.name}>
            {name}
          </Text>
          {!!position && (
            <Text variant="caption" tone="onBrand" numberOfLines={1} style={styles.dim}>
              {position}
            </Text>
          )}
        </View>
        <View style={styles.mascot} pointerEvents="none">
          <Tomchi mood={arrived ? 'happy' : 'idle'} size={64} />
        </View>
      </View>

      {!!scheduleRange && (
        <View style={styles.chip}>
          <Text variant="caption" tone="onBrand">
            {t('dashboard.home.schedule', { range: scheduleRange })}
          </Text>
        </View>
      )}

      <View style={styles.tiles}>
        <View style={styles.mini}>
          <Text variant="caption" tone="onBrand" style={styles.dim}>
            {arrived ? t('dashboard.home.arrivedToday') : t('dashboard.home.notArrived')}
          </Text>
          <Text variant="number" tone="onBrand">
            {timeline.firstIn ?? '—:—'}
          </Text>
        </View>
        <View style={styles.mini}>
          <Text variant="caption" tone="onBrand" style={styles.dim}>
            {t('dashboard.home.workTime')}
          </Text>
          <Text variant="heading" tone="onBrand" style={styles.worked}>
            {arrived ? formatWorked(timeline.workedMinutes, t) : '—'}
          </Text>
        </View>
      </View>

      <Button
        label={t('dashboard.home.myAttendanceBtn')}
        variant="white"
        full
        onPress={() => router.push('/(tabs)/attendance' as Href)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radii.xl, padding: 16, gap: 12, overflow: 'hidden' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarRing: { padding: 3, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.92)' },
  who: { flex: 1, minWidth: 0 },
  eyebrow: { opacity: 0.85, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '700' },
  name: { fontSize: 19, lineHeight: 24 },
  dim: { opacity: 0.85 },
  mascot: { marginRight: -4 },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  tiles: { flexDirection: 'row', gap: 10 },
  mini: { flex: 1, borderRadius: radii.md, padding: 12, backgroundColor: 'rgba(255,255,255,0.16)', gap: 2 },
  worked: { fontSize: 16 },
});
