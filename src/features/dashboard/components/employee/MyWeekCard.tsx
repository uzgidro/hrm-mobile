// «Oxirgi kunlar»: har kun uchun kelish–ketish va holat belgisi (weekSummary).
import React from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { weekdayName } from '@/i18n/dates';
import { tabelCodeMeta } from '@/utils/tabelCodes';
import { Badge, Card, Text } from '@/ui';
import type { DaySummary } from '../../utils/dayTimeline';

export function MyWeekCard({ days }: { days: DaySummary[] }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const tone = { present: 'success', late: 'warning', none: 'danger', off: 'neutral', leave: 'info' } as const;
  const label = (d: DaySummary) =>
    ({
      present: t('dashboard.home.weekPresent'),
      late: t('dashboard.home.weekLate'),
      none: t('dashboard.home.weekNone'),
      off: t('dashboard.home.weekOff'),
      // Sababli yo'qlik — tabel kodi yorlig'i (Ruxsat, Ta'til, Safar …), Davomat tabi bilan bir xil.
      leave: t(tabelCodeMeta(d.code).labelKey),
    })[d.status];
  return (
    <Card
      title={t('dashboard.home.myWeek')}
      icon="calendar"
      tint="green"
      action={{ label: t('common.all'), onPress: () => router.push('/(tabs)/attendance' as Href) }}
    >
      {days.map((d, i) => {
        const date = dayjs(d.date);
        const bar =
          d.status === 'none'
            ? c.dangerMark
            : d.status === 'late'
              ? c.warningMark
              : d.status === 'off'
                ? c.borderStrong
                : d.status === 'leave'
                  ? c.brand
                  : c.successMark;
        return (
          <View key={d.date} style={[styles.row, i > 0 && { borderTopColor: c.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
            <View style={[styles.bar, { backgroundColor: bar }]} />
            <View style={styles.text}>
              <Text variant="label" style={styles.day}>
                {i === 0 ? t('dashboard.home.today') : `${weekdayName(date.day())}, ${date.format('DD.MM')}`}
              </Text>
              <Text variant="caption" tone="subtle" style={styles.times}>
                {d.firstIn ? `${d.firstIn} – ${d.lastOut ?? '…'}` : '—'}
              </Text>
            </View>
            <Badge label={label(d)} tone={tone[d.status]} testID={`week-${d.date}`} />
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  bar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  text: { flex: 1 },
  day: { fontWeight: '600' },
  times: { fontVariant: ['tabular-nums'] },
});
