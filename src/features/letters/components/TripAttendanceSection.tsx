// Safar davomati — web `TripAttendancePanel` pariteti: safar kunlari tabeli
// (holat, birinchi kirish / oxirgi chiqish, soat) va xulosa chiplari. Faqat
// o'qish; ma'lumot serverdan tayyor keladi (`/letters/{id}/trip-attendance`).
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import type { Letter } from '@/types';
import { tabelCodeMeta, tabelCodeColor } from '@/utils/tabelCodes';
import { Section } from './DetailParts';
import { tripAttendanceQuery } from '../api/queries';

const HIDDEN_STATUSES = ['draft', 'pending', 'cancelled', 'rejected'];

export function TripAttendanceSection({ letter }: { letter: Letter }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [expanded, setExpanded] = useState(false);
  // Web: only for a submitted trip (there is nothing to show on a draft).
  const enabled = letter.letter_type === 'business_trip' && !HIDDEN_STATUSES.includes(letter.status ?? '');
  const { data, isLoading } = useQuery(tripAttendanceQuery(letter.id, enabled));
  if (!enabled || isLoading || !data?.days?.length) return null;

  const days = expanded ? data.days : data.days.slice(0, 7);
  return (
    <Section title={t('letters.sectionTripAttendance')}>
      <View style={styles.chips}>
        <Chip value={data.present_days} label={t('letters.tripAttPresent')} color={colors.present} styles={styles} />
        <Chip value={data.late_days} label={t('letters.tripAttLate')} color={colors.warning} styles={styles} />
        <Chip value={data.absent_days} label={t('letters.tripAttAbsent')} color={colors.error} styles={styles} />
        <Chip value={data.total_work_hours} label={t('letters.tripAttHours')} color={colors.info} styles={styles} />
      </View>
      {days.map((d) => {
        const meta = tabelCodeMeta(d.status);
        const color = tabelCodeColor(d.status, colors);
        return (
          <View key={d.date} style={styles.dayRow}>
            <Text style={styles.dayDate}>{dayjs(d.date).format('DD.MM')}</Text>
            <View style={[styles.statusPill, { backgroundColor: `${color}22` }]}>
              <Text style={[styles.statusText, { color }]} numberOfLines={1}>{t(meta.labelKey)}</Text>
            </View>
            <Text style={styles.dayTimes} numberOfLines={1}>
              {d.first_entrance ? dayjs(d.first_entrance).format('HH:mm') : '--:--'}
              {' – '}
              {d.last_exit ? dayjs(d.last_exit).format('HH:mm') : '--:--'}
              {d.work_hours ? `  ·  ${d.work_hours} ${t('letters.tripAttHourShort')}` : ''}
            </Text>
          </View>
        );
      })}
      {data.days.length > 7 && (
        <TouchableOpacity onPress={() => setExpanded((v) => !v)} hitSlop={8} style={styles.moreBtn} testID="trip-att-more">
          <Text style={styles.moreText}>
            {expanded ? t('letters.tripAttLess') : t('letters.tripAttMore', { count: data.days.length - 7 })}
          </Text>
        </TouchableOpacity>
      )}
    </Section>
  );
}

function Chip({ value, label, color, styles }: { value: number; label: string; color: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={[styles.chip, { borderColor: color }]}>
      <Text style={[styles.chipValue, { color }]}>{value}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
    chip: { flexGrow: 1, minWidth: 70, borderRadius: 12, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center', backgroundColor: c.bg },
    chipValue: { fontSize: 18, fontWeight: '800' },
    chipLabel: { fontSize: 11, color: c.textMuted, marginTop: 2 },
    dayRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.cardBorder },
    dayDate: { width: 46, fontSize: 13, fontWeight: '700', color: c.text },
    statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, maxWidth: 130 },
    statusText: { fontSize: 11, fontWeight: '700' },
    dayTimes: { flex: 1, fontSize: 12, color: c.textSecondary, textAlign: 'right' },
    moreBtn: { alignSelf: 'center', paddingVertical: 10 },
    moreText: { fontSize: 13, fontWeight: '700', color: c.primary },
  });
