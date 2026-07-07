// Bottom-sheet date+time picker used by the create-leave form. Extracted
// verbatim from the old create-leave.tsx (a leave-specific calendar/time modal;
// distinct from the shared DatePicker components).
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import dayjs, { type Dayjs } from 'dayjs';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';

const MONTHS_UZ = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentyabr','Oktyabr','Noyabr','Dekabr'];
const DAYS_SHORT = ['du','se','chor','pay','ju','sha','ya'];

export function LeaveDateTimePicker({ value, visible, title, minDate, onConfirm, onClose }: {
  value: Dayjs; visible: boolean; title: string; minDate?: Dayjs; onConfirm: (v: Dayjs) => void; onClose: () => void;
}) {
  const dp = useThemedStyles(makeDp);
  const { colors } = useTheme();
  const [tab, setTab] = useState<'date' | 'time'>('date');
  const [month, setMonth] = useState(value.startOf('month'));
  const [selected, setSelected] = useState(value);

  const daysInMonth = month.daysInMonth();
  const firstDow = (month.day() + 6) % 7;
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const handleDayPress = (day: number) => {
    const nd = month.date(day).hour(selected.hour()).minute(selected.minute()).second(0);
    if (minDate && nd.isBefore(minDate, 'day')) return;
    setSelected(nd);
    setTab('time');
  };
  const changeHour = (d: number) => setSelected((s) => s.hour((s.hour() + d + 24) % 24));
  const changeMinute = (d: number) => setSelected((s) => s.minute((s.minute() + d + 60) % 60));

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={dp.overlay}>
        <View style={dp.sheet}>
          <View style={dp.header}>
            <TouchableOpacity onPress={onClose}><Text style={dp.cancelText}>Bekor</Text></TouchableOpacity>
            <Text style={dp.title}>{title}</Text>
            <TouchableOpacity onPress={() => { onConfirm(selected); onClose(); }}><Text style={dp.confirmText}>Tayyor</Text></TouchableOpacity>
          </View>

          <View style={dp.tabs}>
            <TouchableOpacity style={[dp.tab, tab === 'date' && dp.tabActive, dp.tabRow]} onPress={() => setTab('date')}>
              <Icon name="calendar" size={16} color={tab === 'date' ? '#fff' : colors.textMuted} />
              <Text style={[dp.tabText, tab === 'date' && dp.tabTextActive]}>{selected.format('DD.MM.YYYY')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[dp.tab, tab === 'time' && dp.tabActive, dp.tabRow]} onPress={() => setTab('time')}>
              <Icon name="clock" size={16} color={tab === 'time' ? '#fff' : colors.textMuted} />
              <Text style={[dp.tabText, tab === 'time' && dp.tabTextActive]}>{selected.format('HH:mm')}</Text>
            </TouchableOpacity>
          </View>

          {tab === 'date' ? (
            <View style={dp.calWrap}>
              <View style={dp.monthNav}>
                <TouchableOpacity onPress={() => setMonth(month.subtract(1, 'month'))} style={dp.navBtn}><Icon name="chevronLeft" size={20} color={colors.text} /></TouchableOpacity>
                <Text style={dp.monthLabel}>{MONTHS_UZ[month.month()]} {month.year()}</Text>
                <TouchableOpacity onPress={() => setMonth(month.add(1, 'month'))} style={dp.navBtn}><Icon name="chevronRight" size={20} color={colors.text} /></TouchableOpacity>
              </View>
              <View style={dp.weekRow}>{DAYS_SHORT.map((d) => <Text key={d} style={dp.weekDay}>{d}</Text>)}</View>
              <View style={dp.grid}>
                {cells.map((day, i) => {
                  if (!day) return <View key={`e-${i}`} style={dp.cell} />;
                  const dt = month.date(day);
                  const isSel = selected.format('YYYY-MM-DD') === dt.format('YYYY-MM-DD');
                  const isToday = dt.format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD');
                  const disabled = !!minDate && dt.isBefore(minDate, 'day');
                  return (
                    <TouchableOpacity key={day} style={[dp.cell, isToday && dp.cellToday, isSel && dp.cellSel, disabled && dp.cellDis]} onPress={() => !disabled && handleDayPress(day)} activeOpacity={disabled ? 1 : 0.7}>
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
                  <TouchableOpacity style={dp.timeBtn} onPress={() => changeHour(1)}><Icon name="arrowUp" size={20} color={colors.primaryLight} /></TouchableOpacity>
                  <Text style={dp.timeVal}>{String(selected.hour()).padStart(2, '0')}</Text>
                  <TouchableOpacity style={dp.timeBtn} onPress={() => changeHour(-1)}><Icon name="arrowDown" size={20} color={colors.primaryLight} /></TouchableOpacity>
                </View>
                <Text style={dp.timeSep}>:</Text>
                <View style={dp.timeCol}>
                  <TouchableOpacity style={dp.timeBtn} onPress={() => changeMinute(5)}><Icon name="arrowUp" size={20} color={colors.primaryLight} /></TouchableOpacity>
                  <Text style={dp.timeVal}>{String(selected.minute()).padStart(2, '0')}</Text>
                  <TouchableOpacity style={dp.timeBtn} onPress={() => changeMinute(-5)}><Icon name="arrowDown" size={20} color={colors.primaryLight} /></TouchableOpacity>
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
    sheet: { backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    cancelText: { fontSize: 15, color: c.textMuted },
    title: { fontSize: 16, fontWeight: '700', color: c.text },
    confirmText: { fontSize: 15, color: c.primaryLight, fontWeight: '700' },
    tabs: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    tab: { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: c.bg, alignItems: 'center', borderWidth: 1, borderColor: c.cardBorder },
    tabRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
    tabActive: { backgroundColor: c.primary, borderColor: c.primary },
    tabText: { fontSize: 13, color: c.textMuted, fontWeight: '600' },
    tabTextActive: { color: '#fff' },
    calWrap: { paddingHorizontal: 16, paddingBottom: 8 },
    monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    navBtn: { width: 36, height: 36, backgroundColor: c.bg, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    monthLabel: { fontSize: 15, fontWeight: '700', color: c.text },
    weekRow: { flexDirection: 'row', marginBottom: 6 },
    weekDay: { flex: 1, textAlign: 'center', fontSize: 11, color: c.textMuted, fontWeight: '600' },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 },
    cellToday: { backgroundColor: c.primarySoft, borderRadius: 8 },
    cellSel: { backgroundColor: c.primary, borderRadius: 8 },
    cellDis: { opacity: 0.25 },
    cellText: { fontSize: 13, fontWeight: '600', color: c.text },
    cellTextToday: { color: c.primaryLight },
    cellTextSel: { color: '#fff' },
    timePicker: { paddingHorizontal: 16, paddingVertical: 16, alignItems: 'center' },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    timeCol: { alignItems: 'center', gap: 8 },
    timeBtn: { width: 48, height: 36, backgroundColor: c.bg, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    timeVal: { fontSize: 40, fontWeight: '800', color: c.text, width: 68, textAlign: 'center' },
    timeSep: { fontSize: 40, fontWeight: '800', color: c.text, marginBottom: 8 },
    quickMins: { flexDirection: 'row', gap: 10, marginTop: 20 },
    quickBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: c.bg, borderRadius: 10, borderWidth: 1, borderColor: c.cardBorder },
    quickBtnActive: { backgroundColor: c.primary, borderColor: c.primary },
    quickBtnText: { fontSize: 14, color: c.textMuted, fontWeight: '600' },
    quickBtnTextActive: { color: '#fff' },
  });
