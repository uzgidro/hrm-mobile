import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import dayjs, { Dayjs } from 'dayjs';
import { useAuthStore } from '../src/store/authStore';
import { apiClient } from '../src/api/client';
import { WORK_LEAVES, EMPLOYEE_DETAIL } from '../src/api/urls';
import { COLORS } from '../src/constants';
import { Employee } from '../src/types';

const MONTHS_UZ = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentyabr','Oktyabr','Noyabr','Dekabr'];
const DAYS_SHORT = ['du','se','chor','pay','ju','sha','ya'];

const LEAVE_TYPES = [
  "Xizmat topshirig'i",
  'Kasallik',
  "Ta'til",
  'Shaxsiy sabab',
  'Boshqa',
];

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
  const [selected, setSelected] = useState(value);

  const daysInMonth = month.daysInMonth();
  const firstDow = (month.day() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

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
            <TouchableOpacity onPress={onClose}>
              <Text style={dp.cancelText}>Bekor</Text>
            </TouchableOpacity>
            <Text style={dp.title}>{title}</Text>
            <TouchableOpacity onPress={() => { onConfirm(selected); onClose(); }}>
              <Text style={dp.confirmText}>Tayyor</Text>
            </TouchableOpacity>
          </View>

          <View style={dp.tabs}>
            <TouchableOpacity style={[dp.tab, tab === 'date' && dp.tabActive]} onPress={() => setTab('date')}>
              <Text style={[dp.tabText, tab === 'date' && dp.tabTextActive]}>
                📅 {selected.format('DD.MM.YYYY')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[dp.tab, tab === 'time' && dp.tabActive]} onPress={() => setTab('time')}>
              <Text style={[dp.tabText, tab === 'time' && dp.tabTextActive]}>
                🕐 {selected.format('HH:mm')}
              </Text>
            </TouchableOpacity>
          </View>

          {tab === 'date' ? (
            <View style={dp.calWrap}>
              <View style={dp.monthNav}>
                <TouchableOpacity onPress={() => setMonth(month.subtract(1, 'month'))} style={dp.navBtn}>
                  <Text style={dp.navText}>{'<'}</Text>
                </TouchableOpacity>
                <Text style={dp.monthLabel}>{MONTHS_UZ[month.month()]} {month.year()}</Text>
                <TouchableOpacity onPress={() => setMonth(month.add(1, 'month'))} style={dp.navBtn}>
                  <Text style={dp.navText}>{'>'}</Text>
                </TouchableOpacity>
              </View>
              <View style={dp.weekRow}>
                {DAYS_SHORT.map((d) => <Text key={d} style={dp.weekDay}>{d}</Text>)}
              </View>
              <View style={dp.grid}>
                {cells.map((day, i) => {
                  if (!day) return <View key={`e-${i}`} style={dp.cell} />;
                  const dt = month.date(day);
                  const isSel = selected.format('YYYY-MM-DD') === dt.format('YYYY-MM-DD');
                  const isToday = dt.format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD');
                  const disabled = !!minDate && dt.isBefore(minDate, 'day');
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[dp.cell, isToday && dp.cellToday, isSel && dp.cellSel, disabled && dp.cellDis]}
                      onPress={() => !disabled && handleDayPress(day)}
                      activeOpacity={disabled ? 1 : 0.7}
                    >
                      <Text style={[dp.cellText, isToday && dp.cellTextToday, isSel && dp.cellTextSel, disabled && dp.cellTextDis]}>
                        {String(day).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={dp.timePicker}>
              <View style={dp.timeRow}>
                <View style={dp.timeCol}>
                  <TouchableOpacity style={dp.timeBtn} onPress={() => changeHour(1)}>
                    <Text style={dp.timeBtnText}>▲</Text>
                  </TouchableOpacity>
                  <Text style={dp.timeVal}>{String(selected.hour()).padStart(2, '0')}</Text>
                  <TouchableOpacity style={dp.timeBtn} onPress={() => changeHour(-1)}>
                    <Text style={dp.timeBtnText}>▼</Text>
                  </TouchableOpacity>
                </View>
                <Text style={dp.timeSep}>:</Text>
                <View style={dp.timeCol}>
                  <TouchableOpacity style={dp.timeBtn} onPress={() => changeMinute(5)}>
                    <Text style={dp.timeBtnText}>▲</Text>
                  </TouchableOpacity>
                  <Text style={dp.timeVal}>{String(selected.minute()).padStart(2, '0')}</Text>
                  <TouchableOpacity style={dp.timeBtn} onPress={() => changeMinute(-5)}>
                    <Text style={dp.timeBtnText}>▼</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={dp.quickMins}>
                {[0, 15, 30, 45].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[dp.quickBtn, selected.minute() === m && dp.quickBtnActive]}
                    onPress={() => setSelected((s) => s.minute(m))}
                  >
                    <Text style={[dp.quickBtnText, selected.minute() === m && dp.quickBtnTextActive]}>
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

// ─── TypeSheet ───────────────────────────────────────────────────────────────

function TypeSheet({
  visible, selected, onSelect, onClose,
}: {
  visible: boolean; selected: string;
  onSelect: (t: string) => void; onClose: () => void;
}) {
  const [custom, setCustom] = useState('');

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={ts.overlay} activeOpacity={1} onPress={onClose} />
      <View style={ts.sheet}>
        <View style={ts.handle} />
        <Text style={ts.title}>So'rov turini tanlang</Text>
        {LEAVE_TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            style={[ts.item, selected === t && ts.itemActive]}
            onPress={() => { onSelect(t); onClose(); }}
            activeOpacity={0.7}
          >
            <Text style={[ts.itemText, selected === t && ts.itemTextActive]}>{t}</Text>
            {selected === t && <Text style={ts.check}>✓</Text>}
          </TouchableOpacity>
        ))}
        <View style={ts.customRow}>
          <TextInput
            style={ts.customInput}
            placeholder="Yoki o'zingiz yozing..."
            placeholderTextColor={COLORS.textMuted}
            value={custom}
            onChangeText={setCustom}
          />
          <TouchableOpacity
            style={[ts.customBtn, !custom.trim() && { opacity: 0.4 }]}
            disabled={!custom.trim()}
            onPress={() => { onSelect(custom.trim()); onClose(); }}
          >
            <Text style={ts.customBtnText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function CreateLeaveScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const employeeId = user?.employee?.id;

  const now = dayjs();
  const [leaveType, setLeaveType] = useState(LEAVE_TYPES[0]);
  const [startDate, setStartDate] = useState(now.minute(0).second(0));
  const [endDate, setEndDate] = useState(now.add(1, 'hour').minute(0).second(0));
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showTypeSheet, setShowTypeSheet] = useState(false);
  const [activePicker, setActivePicker] = useState<'start' | 'end' | null>(null);

  // Xodimning to'liq ma'lumotlarini olish (supervisor uchun)
  const { data: employeeFull, isLoading: supervisorLoading } = useQuery<Employee>({
    queryKey: ['employee-full', employeeId],
    queryFn: () => apiClient.get<Employee>(EMPLOYEE_DETAIL(employeeId!)).then((r) => r.data),
    enabled: !!employeeId,
    staleTime: 10 * 60 * 1000,
  });

  // Auth/me dan ham supervisor bo'lishi mumkin (fallback)
  const supervisor: Employee | undefined =
    employeeFull?.supervisor ?? user?.employee?.supervisor;

  const handleSubmit = useCallback(async () => {
    if (endDate.isBefore(startDate) || endDate.isSame(startDate)) {
      Alert.alert('Xato', "Tugash vaqti boshlanish vaqtidan keyin bo'lishi kerak");
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        type: leaveType,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        description: description.trim() || undefined,
      };
      if (supervisor?.id) {
        payload.assigned_signer_ids = [supervisor.id];
      }
      await apiClient.post(WORK_LEAVES, payload);
      queryClient.invalidateQueries({ queryKey: ['work-leaves'] });
      Alert.alert("Muvaffaqiyat", "So'rov yuborildi", [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Xato', "So'rov yuborishda xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  }, [leaveType, startDate, endDate, description, supervisor, queryClient]);

  const diffMin = endDate.diff(startDate, 'minute');
  const durationText = (() => {
    if (diffMin <= 0) return null;
    const days = Math.floor(diffMin / 1440);
    const hours = Math.floor((diffMin % 1440) / 60);
    const mins = diffMin % 60;
    return [days > 0 && `${days} kun`, hours > 0 && `${hours} soat`, mins > 0 && `${mins} daqiqa`]
      .filter(Boolean).join(' ');
  })();

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>So'rov yuborish</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Type */}
        <Text style={s.label}>So'rov turi *</Text>
        <TouchableOpacity style={s.selector} onPress={() => setShowTypeSheet(true)} activeOpacity={0.7}>
          <Text style={s.selectorText}>{leaveType}</Text>
          <Text style={s.selectorArrow}>›</Text>
        </TouchableOpacity>

        {/* Start */}
        <Text style={s.label}>Boshlanish *</Text>
        <TouchableOpacity style={s.selector} onPress={() => setActivePicker('start')} activeOpacity={0.7}>
          <Text style={s.selectorText}>
            📅 {startDate.format('DD.MM.YYYY')}{'   '}🕐 {startDate.format('HH:mm')}
          </Text>
          <Text style={s.selectorArrow}>›</Text>
        </TouchableOpacity>

        {/* End */}
        <Text style={s.label}>Tugash *</Text>
        <TouchableOpacity style={s.selector} onPress={() => setActivePicker('end')} activeOpacity={0.7}>
          <Text style={s.selectorText}>
            📅 {endDate.format('DD.MM.YYYY')}{'   '}🕐 {endDate.format('HH:mm')}
          </Text>
          <Text style={s.selectorArrow}>›</Text>
        </TouchableOpacity>

        {/* Duration */}
        {durationText && (
          <View style={s.durationRow}>
            <Text style={s.durationIcon}>⏱</Text>
            <Text style={s.durationText}>{durationText}</Text>
          </View>
        )}
        {diffMin <= 0 && endDate.isValid() && (
          <Text style={s.errorText}>Tugash vaqti boshlanishdan keyin bo'lishi kerak</Text>
        )}

        {/* Supervisor — read-only */}
        <Text style={s.label}>Rahbar (Tasdiqlovchi)</Text>
        <View style={s.supervisorCard}>
          {supervisorLoading ? (
            <ActivityIndicator size="small" color={COLORS.primaryLight} />
          ) : supervisor ? (
            <>
              <View style={s.supervisorAvatar}>
                <Text style={s.supervisorAvatarText}>
                  {(supervisor.legal_name || 'X').charAt(0)}
                </Text>
              </View>
              <View style={s.supervisorInfo}>
                <Text style={s.supervisorName}>{supervisor.legal_name}</Text>
                <Text style={s.supervisorSub} numberOfLines={1}>
                  {supervisor.job_position?.name ?? supervisor.department?.name ?? '—'}
                </Text>
              </View>
              <Text style={s.lockIcon}>🔒</Text>
            </>
          ) : (
            <Text style={s.noSupervisorText}>Rahbar biriktirilmagan</Text>
          )}
        </View>
        {!supervisorLoading && !supervisor && (
          <Text style={s.supervisorHint}>
            So'rov HR bo'limiga to'g'ridan-to'g'ri yuboriladi
          </Text>
        )}

        {/* Description */}
        <Text style={s.label}>Izoh (ixtiyoriy)</Text>
        <TextInput
          style={s.textarea}
          placeholder="Sababni qisqacha yozing..."
          placeholderTextColor={COLORS.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Submit */}
        <TouchableOpacity
          style={[s.submitBtn, (submitting || diffMin <= 0) && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting || diffMin <= 0}
          activeOpacity={0.85}
        >
          {submitting
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.submitBtnText}>Yuborish</Text>}
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      <TypeSheet
        visible={showTypeSheet}
        selected={leaveType}
        onSelect={setLeaveType}
        onClose={() => setShowTypeSheet(false)}
      />
      <DateTimePicker
        visible={activePicker === 'start'}
        title="Boshlanish vaqti"
        value={startDate}
        onConfirm={(v) => { setStartDate(v); if (v.isAfter(endDate)) setEndDate(v.add(1, 'hour')); }}
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
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, marginTop: 18 },
  selector: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  selectorText: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '500' },
  selectorArrow: { fontSize: 20, color: COLORS.textMuted },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 2 },
  durationIcon: { fontSize: 13 },
  durationText: { fontSize: 13, color: COLORS.primaryLight, fontWeight: '600' },
  errorText: { fontSize: 12, color: '#E5536A', marginTop: 6, paddingHorizontal: 2 },
  supervisorCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    paddingHorizontal: 14, paddingVertical: 14,
    minHeight: 56,
  },
  supervisorAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary + '33',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  supervisorAvatarText: { fontSize: 17, fontWeight: '700', color: COLORS.primaryLight },
  supervisorInfo: { flex: 1 },
  supervisorName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  supervisorSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  lockIcon: { fontSize: 16 },
  noSupervisorText: { flex: 1, fontSize: 14, color: COLORS.textMuted, fontStyle: 'italic' },
  supervisorHint: { fontSize: 12, color: COLORS.textMuted, marginTop: 6, paddingHorizontal: 2, fontStyle: 'italic' },
  textarea: {
    backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.text, fontSize: 14, minHeight: 100,
  },
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

const dp = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder,
  },
  cancelText: { fontSize: 15, color: COLORS.textMuted },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  confirmText: { fontSize: 15, color: COLORS.primaryLight, fontWeight: '700' },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: COLORS.bg, alignItems: 'center', borderWidth: 1, borderColor: COLORS.cardBorder },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  calWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  navBtn: { width: 36, height: 36, backgroundColor: COLORS.bg, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  navText: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  monthLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 },
  cellToday: { backgroundColor: COLORS.primary + '44', borderRadius: 8 },
  cellSel: { backgroundColor: COLORS.primary, borderRadius: 8 },
  cellDis: { opacity: 0.25 },
  cellText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  cellTextToday: { color: COLORS.primaryLight },
  cellTextSel: { color: '#fff' },
  cellTextDis: {},
  timePicker: { paddingHorizontal: 16, paddingVertical: 16, alignItems: 'center' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  timeCol: { alignItems: 'center', gap: 8 },
  timeBtn: { width: 48, height: 36, backgroundColor: COLORS.bg, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  timeBtnText: { fontSize: 16, color: COLORS.primaryLight, fontWeight: '700' },
  timeVal: { fontSize: 40, fontWeight: '800', color: COLORS.text, width: 68, textAlign: 'center' },
  timeSep: { fontSize: 40, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  quickMins: { flexDirection: 'row', gap: 10, marginTop: 20 },
  quickBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.bg, borderRadius: 10, borderWidth: 1, borderColor: COLORS.cardBorder },
  quickBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  quickBtnText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
  quickBtnTextActive: { color: '#fff' },
});

const ts = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingBottom: 32 },
  handle: { width: 40, height: 4, backgroundColor: COLORS.cardBorder, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },
  itemActive: { },
  itemText: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '500' },
  itemTextActive: { color: COLORS.primaryLight, fontWeight: '700' },
  check: { fontSize: 16, color: COLORS.primaryLight, fontWeight: '700' },
  customRow: { flexDirection: 'row', gap: 10, marginTop: 14, alignItems: 'center' },
  customInput: { flex: 1, backgroundColor: COLORS.bg, borderRadius: 10, borderWidth: 1, borderColor: COLORS.cardBorder, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.text, fontSize: 14 },
  customBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 11 },
  customBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
