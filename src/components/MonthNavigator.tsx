// "◀ Avgust 2026 ▶" month stepper shared by the timesheet/duty/calendar
// screens, which each had a byte-identical copy (one screen — MyDutyGridScreen
// — had drifted to a c.card nav-button background; this standardizes on c.bg,
// the majority across the other three).
//
// The month itself stays in the caller's useState; this only renders and steps.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Dayjs } from 'dayjs';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { monthName } from '@/i18n/dates';
import { Icon } from './Icon';

export function MonthNavigator({
  month,
  onChange,
}: {
  month: Dayjs;
  onChange: (next: Dayjs) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.monthNav}>
      <TouchableOpacity style={styles.navBtn} onPress={() => onChange(month.subtract(1, 'month'))}>
        <Icon name="chevronLeft" size={20} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.monthTitle}>{monthName(month.month())} {month.year()}</Text>
      <TouchableOpacity style={styles.navBtn} onPress={() => onChange(month.add(1, 'month'))}>
        <Icon name="chevronRight" size={20} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    navBtn: { width: 40, height: 40, backgroundColor: c.bg, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.cardBorder },
    monthTitle: { fontSize: 16, fontWeight: '700', color: c.text },
  });
