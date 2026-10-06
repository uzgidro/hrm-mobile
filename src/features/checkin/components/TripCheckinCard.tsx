// Bosh sahifadagi «Keldim» kartasi (foydalanuvchi talabi 2026-10-06: tugma asosiy sahifada
// chiqib tursin). Faqat kadr vaqtinchalik buyruq bilan qo'ygan xizmat safari kunida ko'rinadi
// (yoki bugungi belgi / yuborilmagan navbat bo'lsa) — boshqa kunlarda joy egallamaydi.
// Dizayn: MyDayHero bilan bir oila — gradient hero, oq lab'li asosiy tugma.
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme/ThemeProvider';
import { gradients, radii } from '@/theme/tokens';
import { Icon } from '@/components/Icon';
import { Button, Text } from '@/ui';
import { checkinStatusQuery } from '../api/queries';
import { useCheckinQueue } from '../lib/useCheckinQueue';
import { formatDistance } from '../lib/capture';
import type { CheckinDirection, MobileCheckin } from '../types';

/** Bugungi oxirgi FAOL belgi «Keldim» bo'lsa keyingi taklif — «Ketdim», aks holda «Keldim». */
export function nextDirection(today: MobileCheckin[]): CheckinDirection {
  const active = today.filter((c) => c.status === 'active');
  const last = active.sort((a, b) => a.happen_time.localeCompare(b.happen_time)).at(-1);
  return last?.direction_type === 'entrance' ? 'exit' : 'entrance';
}

export function TripCheckinCard() {
  const { t } = useTranslation();
  const { colors: c, isDark } = useTheme();
  const hasEmployee = useAuthStore((s) => !!s.user?.employee?.id);
  const status = useQuery(checkinStatusQuery(hasEmployee)).data;
  const { pending, flush } = useCheckinQueue(hasEmployee);

  const today = status?.today ?? [];
  if (!hasEmployee || !status || (!status.can_check_in && !today.length && !pending.length)) return null;

  const trip = status.trip;
  const dir = nextDirection(today);
  const last = [...today].sort((a, b) => a.happen_time.localeCompare(b.happen_time)).at(-1);
  const place = trip?.destination_branch?.name || t('checkin.noDestination');
  const range = trip
    ? t('checkin.tripDates', { from: dayjs(trip.start_date).format('D MMM'), to: dayjs(trip.end_date).format('D MMM') })
    : null;

  return (
    <LinearGradient
      testID="trip-checkin-card"
      colors={[...(isDark ? gradients.tripDark : gradients.trip)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.top}>
        <View style={styles.pin}>
          <Icon name="mapPin" size={22} color={c.fgOnBrand} />
        </View>
        <View style={styles.who}>
          <Text variant="caption" tone="onBrand" style={styles.eyebrow}>
            {t('checkin.eyebrow')}
            {range ? ` · ${range}` : ''}
          </Text>
          <Text variant="title" tone="onBrand" numberOfLines={2} style={styles.place}>
            {place}
          </Text>
        </View>
      </View>

      <View style={styles.status}>
        <Text variant="label" tone="onBrand" style={styles.dim}>
          {last
            ? t('checkin.last', { time: dayjs(last.happen_time).format('HH:mm'), dir: t(`checkin.dir_${last.direction_type}`) })
            : t('checkin.todayNone')}
        </Text>
        {last?.distance_m != null && (
          <View style={[styles.pill, last.is_far && styles.pillFar]}>
            <Text variant="caption" tone="onBrand">
              {last.is_far ? `${t('checkin.far')} · ` : ''}
              {formatDistance(last.distance_m)}
            </Text>
          </View>
        )}
      </View>

      {pending.length > 0 && (
        <Pressable
          testID="trip-checkin-pending"
          onPress={() => void flush()}
          accessibilityRole="button"
          style={styles.pending}
        >
          <Icon name="refresh" size={16} color={c.fgOnBrand} />
          <Text variant="caption" tone="onBrand" style={styles.flex}>
            {t('checkin.pending', { count: pending.length })}
          </Text>
          <Text variant="caption" tone="onBrand" style={styles.bold}>
            {t('checkin.retry')}
          </Text>
        </Pressable>
      )}

      {status.can_check_in && (
        <Button
          testID="trip-checkin-button"
          label={dir === 'entrance' ? t('checkin.arrive') : t('checkin.leave')}
          icon="camera"
          variant="white"
          size="lg"
          full
          onPress={() => router.push(`/keldim?dir=${dir}` as Href)}
        />
      )}
      <Pressable onPress={() => router.push('/keldim' as Href)} accessibilityRole="link" hitSlop={8}>
        <Text variant="label" tone="onBrand" style={styles.link}>
          {t('checkin.history')} ›
        </Text>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, padding: 16, gap: 12, overflow: 'hidden' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pin: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  who: { flex: 1, minWidth: 0 },
  eyebrow: { opacity: 0.9, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '700' },
  place: { fontSize: 19, lineHeight: 24 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  dim: { opacity: 0.92, flexShrink: 1 },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.pill, backgroundColor: 'rgba(255,255,255,0.2)' },
  pillFar: { backgroundColor: 'rgba(214,40,57,0.55)' },
  pending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: radii.md,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  flex: { flex: 1 },
  bold: { fontWeight: '700', textDecorationLine: 'underline' },
  link: { textAlign: 'center', fontWeight: '700', opacity: 0.95 },
});
