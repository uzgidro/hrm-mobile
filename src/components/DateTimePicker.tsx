// Date + time bottom-sheet picker (hour/minute), used by forms that need a
// precise moment (e.g. visitor valid_from / valid_until — matches the web's
// datetime-local input). Returns an ISO string via onConfirm.
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import dayjs, { Dayjs } from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/palettes';
import { Icon } from './Icon';
import { monthName, weekdayNameShort } from '@/i18n/dates';

// Monday-first weekday header. dayjs day() indexes Sunday=0..Saturday=6, and the
// calendar grid below is Monday-first, so order the localized short names to match.
const WEEK_DAY_INDEXES = [1, 2, 3, 4, 5, 6, 0];

export function DateTimePickerModal({
  visible, value, title, onConfirm, onClose,
}: { visible: boolean; value?: string | null; title: string; onConfirm: (iso: string) => void; onClose: () => void }) {
  const dp = useThemedStyles(makeDp);
  const { colors } = useTheme();
  const { t } = useTranslation();
  const init = value ? dayjs(value) : dayjs();
  const [tab, setTab] = useState<'date' | 'time'>('date');
  const [month, setMonth] = useState<Dayjs>(init.startOf('month'));
  const [selected, setSelected] = useState<Dayjs>(init);

  // Re-sync to the latest value each time the sheet opens.
  useEffect(() => {
    if (visible) {
      const v = value ? dayjs(value) : dayjs();
      setSelected(v);
      setMonth(v.startOf('month'));
      setTab('date');
    }
  }, [visible, value]);

  const daysInMonth = month.daysInMonth();
  const firstDow = (month.day() + 6) % 7;
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const changeHour = (d: number) => setSelected((s) => s.hour((s.hour() + d + 24) % 24));
  const changeMinute = (d: number) => setSelected((s) => s.minute((s.minute() + d + 60) % 60));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={dp.overlay}>
        <View style={dp.sheet}>
          <View style={dp.header}>
            <TouchableOpacity onPress={onClose}><Text style={dp.cancelText}>{t('common.cancel')}</Text></TouchableOpacity>
            <Text style={dp.title}>{title}</Text>
            <TouchableOpacity onPress={() => { onConfirm(selected.second(0).toISOString()); onClose(); }}>
              <Text style={dp.confirmText}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>

          <View style={dp.tabs}>
            <TouchableOpacity style={[dp.tab, dp.tabRow, tab === 'date' && dp.tabActive]} onPress={() => setTab('date')}>
              <Icon name="calendar" size={16} color={tab === 'date' ? colors.onPrimary : colors.textMuted} />
              <Text style={[dp.tabText, tab === 'date' && dp.tabTextActive]}>{selected.format('DD.MM.YYYY')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[dp.tab, dp.tabRow, tab === 'time' && dp.tabActive]} onPress={() => setTab('time')}>
              <Icon name="clock" size={16} color={tab === 'time' ? colors.onPrimary : colors.textMuted} />
              <Text style={[dp.tabText, tab === 'time' && dp.tabTextActive]}>{selected.format('HH:mm')}</Text>
            </TouchableOpacity>
          </View>

          {tab === 'date' ? (
            <View style={dp.calWrap}>
              <View style={dp.monthNav}>
                <TouchableOpacity onPress={() => setMonth(month.subtract(1, 'month'))} style={dp.navBtn}><Icon name="chevronLeft" size={20} color={colors.text} /></TouchableOpacity>
                <Text style={dp.monthLabel}>{monthName(month.month())} {month.year()}</Text>
                <TouchableOpacity onPress={() => setMonth(month.add(1, 'month'))} style={dp.navBtn}><Icon name="chevronRight" size={20} color={colors.text} /></TouchableOpacity>
              </View>
              <View style={dp.weekRow}>{WEEK_DAY_INDEXES.map((d) => <Text key={d} style={dp.weekDay}>{weekdayNameShort(d)}</Text>)}</View>
              <View style={dp.grid}>
                {cells.map((day, i) => {
                  if (!day) return <View key={`e-${i}`} style={dp.cell} />;
                  const dt = month.date(day);
                  const isSel = selected.format('YYYY-MM-DD') === dt.format('YYYY-MM-DD');
                  const isToday = dt.format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD');
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[dp.cell, isToday && dp.cellToday, isSel && dp.cellSel]}
                      onPress={() => { setSelected(dt.hour(selected.hour()).minute(selected.minute())); setTab('time'); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[dp.cellText, isToday && dp.cellTextToday, isSel && dp.cellTextSel]}>{String(day).padStart(2, '0')}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={dp.timePicker}>
              <View style={dp.timeRow}>
                <View style={dp.timeCol}>
                  <TouchableOpacity style={dp.timeBtn} onPress={() => changeHour(1)}><Icon name="arrowUp" size={20} color={colors.primary} /></TouchableOpacity>
                  <Text style={dp.timeVal}>{String(selected.hour()).padStart(2, '0')}</Text>
                  <TouchableOpacity style={dp.timeBtn} onPress={() => changeHour(-1)}><Icon name="arrowDown" size={20} color={colors.primary} /></TouchableOpacity>
                  <Text style={dp.timeUnit}>{t('components.hourUnit')}</Text>
                </View>
                <Text style={dp.timeSep}>:</Text>
                <View style={dp.timeCol}>
                  <TouchableOpacity style={dp.timeBtn} onPress={() => changeMinute(5)}><Icon name="arrowUp" size={20} color={colors.primary} /></TouchableOpacity>
                  <Text style={dp.timeVal}>{String(selected.minute()).padStart(2, '0')}</Text>
                  <TouchableOpacity style={dp.timeBtn} onPress={() => changeMinute(-5)}><Icon name="arrowDown" size={20} color={colors.primary} /></TouchableOpacity>
                  <Text style={dp.timeUnit}>{t('components.minuteUnit')}</Text>
                </View>
              </View>
              <View style={dp.quickMins}>
                {[0, 15, 30, 45].map((mm) => (
                  <TouchableOpacity key={mm} style={[dp.quickBtn, selected.minute() === mm && dp.quickBtnActive]} onPress={() => setSelected((s) => s.minute(mm))}>
                    <Text style={[dp.quickBtnText, selected.minute() === mm && dp.quickBtnTextActive]}>:{String(mm).padStart(2, '0')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const makeDp = (c: ThemeColors) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
    sheet: { backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 28 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    title: { fontSize: 16, fontWeight: '700', color: c.text },
    cancelText: { fontSize: 14, color: c.textSecondary },
    confirmText: { fontSize: 14, color: c.primary, fontWeight: '700' },

    tabs: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 14 },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder, alignItems: 'center', justifyContent: 'center' },
    tabRow: { flexDirection: 'row', gap: 6 },
    tabActive: { backgroundColor: c.primary, borderColor: c.primary },
    tabText: { fontSize: 14, fontWeight: '700', color: c.textSecondary },
    tabTextActive: { color: c.onPrimary },

    calWrap: { paddingTop: 6 },
    monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 14 },
    navBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    monthLabel: { fontSize: 15, fontWeight: '700', color: c.text },
    weekRow: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 10 },
    weekDay: { flex: 1, textAlign: 'center', fontSize: 11, color: c.textMuted, fontWeight: '600' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingTop: 6 },
    cell: { width: `${100 / 7}%`, aspectRatio: 1.15, alignItems: 'center', justifyContent: 'center' },
    cellToday: { borderWidth: 1, borderColor: c.primary, borderRadius: 12 },
    cellSel: { backgroundColor: c.primary, borderRadius: 12, borderColor: c.primary },
    cellText: { fontSize: 14, color: c.text },
    cellTextToday: { color: c.primary, fontWeight: '700' },
    cellTextSel: { color: c.onPrimary },

    timePicker: { paddingTop: 24, paddingBottom: 8, alignItems: 'center', gap: 18 },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
    timeCol: { alignItems: 'center', gap: 6 },
    timeBtn: { width: 48, height: 36, alignItems: 'center', justifyContent: 'center' },
    timeVal: { fontSize: 40, fontWeight: '800', color: c.text, letterSpacing: 1, minWidth: 64, textAlign: 'center' },
    timeUnit: { fontSize: 11, color: c.textMuted, marginTop: 2 },
    timeSep: { fontSize: 36, fontWeight: '800', color: c.textMuted, marginBottom: 18 },
    quickMins: { flexDirection: 'row', gap: 8 },
    quickBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder },
    quickBtnActive: { backgroundColor: c.primarySoft, borderColor: c.primary },
    quickBtnText: { fontSize: 14, fontWeight: '700', color: c.textSecondary },
    quickBtnTextActive: { color: c.primary },
  });
