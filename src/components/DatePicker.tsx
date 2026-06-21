import { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import dayjs, { Dayjs } from 'dayjs';
import { useThemedStyles } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/palettes';

const MONTHS_UZ = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
const DAYS_SHORT = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

export function DatePickerModal({
  visible, value, title, onConfirm, onClose,
}: { visible: boolean; value?: string | null; title: string; onConfirm: (iso: string) => void; onClose: () => void }) {
  const dp = useThemedStyles(makeDp);
  const init = value ? dayjs(value) : dayjs();
  const [month, setMonth] = useState<Dayjs>(init.startOf('month'));
  const [selected, setSelected] = useState<Dayjs>(init);

  const daysInMonth = month.daysInMonth();
  const firstDow = (month.day() + 6) % 7;
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={dp.overlay}>
        <View style={dp.sheet}>
          <View style={dp.header}>
            <TouchableOpacity onPress={onClose}><Text style={dp.cancelText}>Bekor</Text></TouchableOpacity>
            <Text style={dp.title}>{title}</Text>
            <TouchableOpacity onPress={() => { onConfirm(selected.format('YYYY-MM-DD')); onClose(); }}>
              <Text style={dp.confirmText}>Tayyor</Text>
            </TouchableOpacity>
          </View>
          <View style={dp.monthNav}>
            <TouchableOpacity onPress={() => setMonth(month.subtract(1, 'month'))} style={dp.navBtn}><Text style={dp.navText}>{'<'}</Text></TouchableOpacity>
            <Text style={dp.monthLabel}>{MONTHS_UZ[month.month()]} {month.year()}</Text>
            <TouchableOpacity onPress={() => setMonth(month.add(1, 'month'))} style={dp.navBtn}><Text style={dp.navText}>{'>'}</Text></TouchableOpacity>
          </View>
          <View style={dp.weekRow}>{DAYS_SHORT.map((d) => <Text key={d} style={dp.weekDay}>{d}</Text>)}</View>
          <View style={dp.grid}>
            {cells.map((day, i) => {
              if (!day) return <View key={`e-${i}`} style={dp.cell} />;
              const dt = month.date(day);
              const isSel = selected.format('YYYY-MM-DD') === dt.format('YYYY-MM-DD');
              const isToday = dt.format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD');
              return (
                <TouchableOpacity key={day} style={[dp.cell, isToday && dp.cellToday, isSel && dp.cellSel]} onPress={() => setSelected(dt)} activeOpacity={0.7}>
                  <Text style={[dp.cellText, isToday && dp.cellTextToday, isSel && dp.cellTextSel]}>{String(day).padStart(2, '0')}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
    monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 14 },
    navBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    navText: { fontSize: 18, color: c.text },
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
    cellDis: { opacity: 0.3 },
  });
