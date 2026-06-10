import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import dayjs, { Dayjs } from 'dayjs';
import { useAuthStore } from '../src/store/authStore';
import { apiClient } from '../src/api/client';
import { WORK_LEAVES, WORK_LEAVE_CATEGORIES } from '../src/api/urls';
import { COLORS } from '../src/constants';
import { WorkLeaveCategory } from '../src/types';

const MONTHS_UZ = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentyabr','Oktyabr','Noyabr','Dekabr'];
const DAYS_SHORT = ['du','se','chor','pay','ju','sha','ya'];

// ─── DateTimePicker modal ────────────────────────────────────────────────────

interface DateTimePickerProps {
  value: Dayjs;
  visible: boolean;
  title: string;
  minDate?: Dayjs;
  onConfirm: (v: Dayjs) => void;
  onClose: () => void;
}

function DateTimePicker({ value, visible, title, minDate, onConfirm, onClose }: DateTimePickerProps) {
  const [tab, setTab] = useState<'date' | 'time'>('date');
  const [month, setMonth] = useState(value.startOf('month'));
  const [selectedDate, setSelectedDate] = useState(value);

  const daysInMonth = month.daysInMonth();
  const firstDow = (month.day() + 6) % 7; // Mon=0

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const changeHour = (delta: number) => {
    setSelectedDate((d) => d.hour((d.hour() + delta + 24) % 24));
  };
  const changeMinute = (delta: number) => {
    setSelectedDate((d) => d.minute((d.minute() + delta + 60) % 60));
  };

  const handleDayPress = (day: number) => {
    const newDate = month.date(day)
      .hour(selectedDate.hour())
      .minute(selectedDate.minute())
      .second(0);
    if (minDate && newDate.isBefore(minDate, 'day')) return;
    setSelectedDate(newDate);
    setTab('time');
  };

  const handleConfirm = () => {
    onConfirm(selectedDate);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={dp.overlay}>
        <View style={dp.sheet}>
          {/* Modal header */}
          <View style={dp.header}>
            <TouchableOpacity onPress={onClose} style={dp.cancelBtn}>
              <Text style={dp.cancelText}>Bekor</Text>
            </TouchableOpacity>
            <Text style={dp.title}>{title}</Text>
            <TouchableOpacity onPress={handleConfirm} style={dp.confirmBtn}>
              <Text style={dp.confirmText}>Tayyor</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={dp.tabs}>
            <TouchableOpacity
              style={[dp.tab, tab === 'date' && dp.tabActive]}
              onPress={() => setTab('date')}
            >
              <Text style={[dp.tabText, tab === 'date' && dp.tabTextActive]}>
                📅 {selectedDate.format('DD.MM.YYYY')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[dp.tab, tab === 'time' && dp.tabActive]}
              onPress={() => setTab('time')}
            >
              <Text style={[dp.tabText, tab === 'time' && dp.tabTextActive]}>
                🕐 {selectedDate.format('HH:mm')}
              </Text>
            </TouchableOpacity>
          </View>

          {tab === 'date' ? (
            <View style={dp.calendarWrap}>
              {/* Month nav */}
              <View style={dp.monthNav}>
                <TouchableOpacity onPress={() => setMonth(month.subtract(1, 'month'))} style={dp.navBtn}>
                  <Text style={dp.navText}>{'<'}</Text>
                </TouchableOpacity>
                <Text style={dp.monthLabel}>
                  {MONTHS_UZ[month.month()]} {month.year()}
                </Text>
                <TouchableOpacity onPress={() => setMonth(month.add(1, 'month'))} style={dp.navBtn}>
                  <Text style={dp.navText}>{'>'}</Text>
                </TouchableOpacity>
              </View>

              {/* Day headers */}
              <View style={dp.weekRow}>
                {DAYS_SHORT.map((d) => (
                  <Text key={d} style={dp.weekDay}>{d}</Text>
                ))}
              </View>

              {/* Grid */}
              <View style={dp.grid}>
                {cells.map((day, i) => {
                  if (!day) return <View key={`e-${i}`} style={dp.cell} />;
                  const dateObj = month.date(day);
                  const isSelected = selectedDate.format('YYYY-MM-DD') === dateObj.format('YYYY-MM-DD');
                  const isToday = dateObj.format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD');
                  const disabled = !!minDate && dateObj.isBefore(minDate, 'day');
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        dp.cell,
                        isToday && dp.cellToday,
                        isSelected && dp.cellSelected,
                        disabled && dp.cellDisabled,
                      ]}
                      onPress={() => !disabled && handleDayPress(day)}
                      activeOpacity={disabled ? 1 : 0.7}
                    >
                      <Text style={[
                        dp.cellText,
                        isToday && dp.cellTextToday,
                        isSelected && dp.cellTextSelected,
                        disabled && dp.cellTextDisabled,
                      ]}>
                        {String(day).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={dp.timePicker}>
              <Text style={dp.timeLabel}>Soat va daqiqa</Text>
              <View style={dp.timeRow}>
                {/* Hour */}
                <View style={dp.timeCol}>
                  <TouchableOpacity style={dp.timeBtn} onPress={() => changeHour(1)}>
                    <Text style={dp.timeBtnText}>▲</Text>
                  </TouchableOpacity>
                  <Text style={dp.timeValue}>{String(selectedDate.hour()).padStart(2, '0')}</Text>
                  <TouchableOpacity style={dp.timeBtn} onPress={() => changeHour(-1)}>
                    <Text style={dp.timeBtnText}>▼</Text>
                  </TouchableOpacity>
                </View>
                <Text style={dp.timeSep}>:</Text>
                {/* Minute */}
                <View style={dp.timeCol}>
                  <TouchableOpacity style={dp.timeBtn} onPress={() => changeMinute(5)}>
                    <Text style={dp.timeBtnText}>▲</Text>
                  </TouchableOpacity>
                  <Text style={dp.timeValue}>{String(selectedDate.minute()).padStart(2, '0')}</Text>
                  <TouchableOpacity style={dp.timeBtn} onPress={() => changeMinute(-5)}>
                    <Text style={dp.timeBtnText}>▼</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={dp.quickMins}>
                {[0, 15, 30, 45].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[dp.quickBtn, selectedDate.minute() === m && dp.quickBtnActive]}
                    onPress={() => setSelectedDate((d) => d.minute(m))}
                  >
                    <Text style={[dp.quickBtnText, selectedDate.minute() === m && dp.quickBtnTextActive]}>
                      :{String(m).padStart(2, '0')}
                    </Text>
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

// ─── CategorySheet ───────────────────────────────────────────────────────────

function CategorySheet({
  visible, categories, onSelect, onClose,
}: {
  visible: boolean;
  categories: WorkLeaveCategory[];
  onSelect: (c: WorkLeaveCategory) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={cs.overlay} activeOpacity={1} onPress={onClose} />
      <View style={cs.sheet}>
        <View style={cs.handle} />
        <Text style={cs.title}>So'rov turini tanlang</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={cs.item}
              onPress={() => { onSelect(cat); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={cs.itemText}>{cat.name}</Text>
              <Text style={cs.arrow}>›</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={cs.cancelBtn} onPress={onClose}>
          <Text style={cs.cancelText}>Bekor</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function CreateLeaveScreen() {
  const { user } = useAuthStore();
  const employee = user?.employee;
  const queryClient = useQueryClient();

  const now = dayjs();
  const [category, setCategory] = useState<WorkLeaveCategory | null>(null);
  const [startDate, setStartDate] = useState(now.minute(0).second(0));
  const [endDate, setEndDate] = useState(now.add(1, 'hour').minute(0).second(0));
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showCatSheet, setShowCatSheet] = useState(false);
  const [activePicker, setActivePicker] = useState<'start' | 'end' | null>(null);

  const { data: categories = [], isLoading: catsLoading } = useQuery<WorkLeaveCategory[]>({
    queryKey: ['work-leave-categories'],
    queryFn: () => apiClient.get(WORK_LEAVE_CATEGORIES).then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });

  const handleSubmit = useCallback(async () => {
    if (!category) {
      Alert.alert('Xato', "So'rov turini tanlang");
      return;
    }
    if (endDate.isBefore(startDate) || endDate.isSame(startDate)) {
      Alert.alert('Xato', 'Tugash vaqti boshlanish vaqtidan keyin bo\'lishi kerak');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(WORK_LEAVES, {
        category_id: category.id,
        employee_id: employee?.id,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        comment: comment.trim() || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['work-leaves'] });
      Alert.alert('Muvaffaqiyat', "So'rov yuborildi", [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Xato', "So'rov yuborishda xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  }, [category, startDate, endDate, comment, employee?.id, queryClient]);

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>So'rov yuborish</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Category */}
        <Text style={s.fieldLabel}>So'rov turi *</Text>
        <TouchableOpacity
          style={[s.selector, !category && s.selectorEmpty]}
          onPress={() => setShowCatSheet(true)}
          activeOpacity={0.7}
        >
          <Text style={category ? s.selectorText : s.selectorPlaceholder}>
            {category ? category.name : 'Turni tanlang...'}
          </Text>
          <Text style={s.selectorArrow}>›</Text>
        </TouchableOpacity>

        {/* Start date/time */}
        <Text style={s.fieldLabel}>Boshlanish</Text>
        <TouchableOpacity
          style={s.selector}
          onPress={() => setActivePicker('start')}
          activeOpacity={0.7}
        >
          <Text style={s.selectorText}>
            📅 {startDate.format('DD.MM.YYYY')}{'  '}🕐 {startDate.format('HH:mm')}
          </Text>
          <Text style={s.selectorArrow}>›</Text>
        </TouchableOpacity>

        {/* End date/time */}
        <Text style={s.fieldLabel}>Tugash</Text>
        <TouchableOpacity
          style={s.selector}
          onPress={() => setActivePicker('end')}
          activeOpacity={0.7}
        >
          <Text style={s.selectorText}>
            📅 {endDate.format('DD.MM.YYYY')}{'  '}🕐 {endDate.format('HH:mm')}
          </Text>
          <Text style={s.selectorArrow}>›</Text>
        </TouchableOpacity>

        {/* Duration info */}
        {endDate.isAfter(startDate) && (
          <View style={s.durationRow}>
            <Text style={s.durationIcon}>⏱</Text>
            <Text style={s.durationText}>
              {(() => {
                const diff = endDate.diff(startDate, 'minute');
                const days = Math.floor(diff / 1440);
                const hours = Math.floor((diff % 1440) / 60);
                const mins = diff % 60;
                const parts = [];
                if (days > 0) parts.push(`${days} kun`);
                if (hours > 0) parts.push(`${hours} soat`);
                if (mins > 0) parts.push(`${mins} daqiqa`);
                return parts.join(' ') || '—';
              })()}
            </Text>
          </View>
        )}

        {/* Comment */}
        <Text style={s.fieldLabel}>Izoh (ixtiyoriy)</Text>
        <TextInput
          style={s.commentInput}
          placeholder="Sababni qisqacha yozing..."
          placeholderTextColor={COLORS.textMuted}
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Submit */}
        <TouchableOpacity
          style={[s.submitBtn, submitting && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.submitBtnText}>Yuborish</Text>
          }
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Category sheet */}
      <CategorySheet
        visible={showCatSheet}
        categories={categories}
        onSelect={setCategory}
        onClose={() => setShowCatSheet(false)}
      />

      {/* Date pickers */}
      <DateTimePicker
        visible={activePicker === 'start'}
        title="Boshlanish vaqti"
        value={startDate}
        onConfirm={(v) => {
          setStartDate(v);
          if (v.isAfter(endDate)) setEndDate(v.add(1, 'hour'));
        }}
        onClose={() => setActivePicker(null)}
      />
      <DateTimePicker
        visible={activePicker === 'end'}
        title="Tugash vaqti"
        value={endDate}
        minDate={startDate}
        onConfirm={setEndDate}
        onClose={() => setActivePicker(null)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  backArrow: { fontSize: 22, color: COLORS.text, fontWeight: '300' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: COLORS.text, paddingLeft: 4 },

  content: { paddingHorizontal: 16, paddingTop: 20 },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, marginTop: 16 },

  selector: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  selectorEmpty: { borderColor: COLORS.cardBorder },
  selectorText: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '500' },
  selectorPlaceholder: { flex: 1, fontSize: 14, color: COLORS.textMuted },
  selectorArrow: { fontSize: 20, color: COLORS.textMuted },

  durationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, paddingHorizontal: 4,
  },
  durationIcon: { fontSize: 13 },
  durationText: { fontSize: 13, color: COLORS.primaryLight, fontWeight: '600' },

  commentInput: {
    backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.text, fontSize: 14, minHeight: 100,
  },

  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

// DateTimePicker styles
const dp = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 24,
    borderTopRightRadius: 24, paddingBottom: 32,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder,
  },
  cancelBtn: { paddingHorizontal: 4 },
  cancelText: { fontSize: 15, color: COLORS.textMuted },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  confirmBtn: { paddingHorizontal: 4 },
  confirmText: { fontSize: 15, color: COLORS.primaryLight, fontWeight: '700' },

  tabs: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8,
  },
  tab: {
    flex: 1, paddingVertical: 9, borderRadius: 10,
    backgroundColor: COLORS.bg, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  calendarWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  monthNav: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  navBtn: { width: 36, height: 36, backgroundColor: COLORS.bg, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  navText: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  monthLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 },
  cellToday: { backgroundColor: COLORS.primary + '44', borderRadius: 8 },
  cellSelected: { backgroundColor: COLORS.primary, borderRadius: 8 },
  cellDisabled: { opacity: 0.3 },
  cellText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  cellTextToday: { color: COLORS.primaryLight },
  cellTextSelected: { color: '#fff' },
  cellTextDisabled: {},

  timePicker: { paddingHorizontal: 16, paddingBottom: 8, alignItems: 'center' },
  timeLabel: { fontSize: 13, color: COLORS.textMuted, marginBottom: 20, alignSelf: 'flex-start' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  timeCol: { alignItems: 'center', gap: 8 },
  timeBtn: {
    width: 48, height: 36, backgroundColor: COLORS.bg,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  timeBtnText: { fontSize: 16, color: COLORS.primaryLight, fontWeight: '700' },
  timeValue: { fontSize: 40, fontWeight: '800', color: COLORS.text, width: 68, textAlign: 'center' },
  timeSep: { fontSize: 40, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  quickMins: { flexDirection: 'row', gap: 10, marginTop: 20 },
  quickBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: COLORS.bg, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  quickBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  quickBtnText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
  quickBtnTextActive: { color: '#fff' },
});

// CategorySheet styles
const cs = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingBottom: 32,
    maxHeight: '70%',
  },
  handle: {
    width: 40, height: 4, backgroundColor: COLORS.cardBorder,
    borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder,
  },
  itemText: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '500' },
  arrow: { fontSize: 20, color: COLORS.textMuted },
  cancelBtn: {
    marginTop: 12, backgroundColor: COLORS.bg,
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  cancelText: { fontSize: 15, color: COLORS.textMuted, fontWeight: '600' },
});
