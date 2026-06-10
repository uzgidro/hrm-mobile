import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, FlatList, Image,
} from 'react-native';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import dayjs, { Dayjs } from 'dayjs';
import { useAuthStore } from '../src/store/authStore';
import { apiClient } from '../src/api/client';
import { WORK_LEAVES, EMPLOYEES_LIST } from '../src/api/urls';
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

// ─── SignerPickerModal ───────────────────────────────────────────────────────

interface SignerPickerProps {
  visible: boolean;
  title: string;
  queryParams: Record<string, unknown>;
  selected: Employee | null;
  onSelect: (emp: Employee) => void;
  onClose: () => void;
}

function SignerPickerModal({ visible, title, queryParams, selected, onSelect, onClose }: SignerPickerProps) {
  const [search, setSearch] = useState('');

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ['signer-employees', queryParams],
    queryFn: () =>
      apiClient.get(EMPLOYEES_LIST, {
        params: { ...queryParams, size: 100, page: 1 },
      }).then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : (d?.items ?? []);
      }),
    enabled: visible,
    staleTime: 10 * 60 * 1000,
  });

  const filtered = search.trim()
    ? employees.filter((e) => e.legal_name?.toLowerCase().includes(search.trim().toLowerCase()))
    : employees;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={sp.overlay} activeOpacity={1} onPress={onClose} />
      <View style={sp.sheet}>
        <View style={sp.handle} />
        <Text style={sp.title}>{title}</Text>

        <View style={sp.searchRow}>
          <TextInput
            style={sp.searchInput}
            placeholder="Ism bo'yicha qidirish..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
        </View>

        {isLoading ? (
          <View style={sp.center}>
            <ActivityIndicator color={COLORS.primaryLight} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={sp.center}>
            <Text style={sp.emptyText}>Xodimlar topilmadi</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(e) => String(e.id)}
            style={sp.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item: emp }) => {
              const isSel = selected?.id === emp.id;
              return (
                <TouchableOpacity
                  style={[sp.empRow, isSel && sp.empRowActive]}
                  onPress={() => { onSelect(emp); onClose(); }}
                  activeOpacity={0.7}
                >
                  {emp.photo_path ? (
                    <Image source={{ uri: emp.photo_path }} style={sp.avatar} />
                  ) : (
                    <View style={sp.avatarFallback}>
                      <Text style={sp.avatarText}>{(emp.legal_name || 'X').charAt(0)}</Text>
                    </View>
                  )}
                  <View style={sp.empInfo}>
                    <Text style={[sp.empName, isSel && sp.empNameActive]} numberOfLines={1}>
                      {emp.legal_name}
                    </Text>
                    <Text style={sp.empSub} numberOfLines={1}>
                      {emp.job_position?.name ?? emp.department?.name ?? '—'}
                    </Text>
                  </View>
                  {isSel && <Text style={sp.check}>✓</Text>}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function CreateLeaveScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const orgBranchId =
    user?.employee?.organization_branches?.[0]?.id ??
    user?.employee?.department?.organization_branch_id;

  const now = dayjs();
  const [leaveType, setLeaveType] = useState(LEAVE_TYPES[0]);
  const [startDate, setStartDate] = useState(now.minute(0).second(0));
  const [endDate, setEndDate] = useState(now.add(1, 'hour').minute(0).second(0));
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showTypeSheet, setShowTypeSheet] = useState(false);
  const [activePicker, setActivePicker] = useState<'start' | 'end' | null>(null);

  // Signers
  const [deputySigner, setDeputySigner] = useState<Employee | null>(null);
  const [hrSigner, setHrSigner] = useState<Employee | null>(null);
  const [activeSigner, setActiveSigner] = useState<'deputy' | 'hr' | null>(null);

  const deputyParams: Record<string, unknown> = {
    is_head_department: true,
    ...(orgBranchId ? { organization_branch_id: orgBranchId } : {}),
  };
  const hrParams: Record<string, unknown> = {
    include_multi_org: true,
    multi_org_employee_role: ['hr'],
  };

  const handleSubmit = useCallback(async () => {
    if (endDate.isBefore(startDate) || endDate.isSame(startDate)) {
      Alert.alert('Xato', "Tugash vaqti boshlanish vaqtidan keyin bo'lishi kerak");
      return;
    }
    setSubmitting(true);
    try {
      const signerIds = [deputySigner?.id, hrSigner?.id].filter(Boolean) as number[];
      await apiClient.post(WORK_LEAVES, {
        type: leaveType,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        description: description.trim() || undefined,
        ...(signerIds.length > 0 ? { assigned_signer_ids: signerIds } : {}),
      });
      queryClient.invalidateQueries({ queryKey: ['work-leaves'] });
      Alert.alert("Muvaffaqiyat", "So'rov yuborildi", [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Xato', "So'rov yuborishda xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  }, [leaveType, startDate, endDate, description, deputySigner, hrSigner, queryClient]);

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

        {/* Deputy signer */}
        <Text style={s.label}>Zam (Mas'ul o'rinbosar)</Text>
        <TouchableOpacity
          style={s.selector}
          onPress={() => setActiveSigner('deputy')}
          activeOpacity={0.7}
        >
          {deputySigner ? (
            <View style={s.signerSelected}>
              <Text style={s.signerName} numberOfLines={1}>{deputySigner.legal_name}</Text>
              <Text style={s.signerSub} numberOfLines={1}>
                {deputySigner.job_position?.name ?? deputySigner.department?.name ?? ''}
              </Text>
            </View>
          ) : (
            <Text style={[s.selectorText, { color: COLORS.textMuted }]}>Tanlang...</Text>
          )}
          <View style={s.selectorRight}>
            {deputySigner && (
              <TouchableOpacity onPress={() => setDeputySigner(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={s.clearBtn}>✕</Text>
              </TouchableOpacity>
            )}
            <Text style={s.selectorArrow}>›</Text>
          </View>
        </TouchableOpacity>

        {/* HR signer */}
        <Text style={s.label}>Inson resurslarini boshqarish</Text>
        <TouchableOpacity
          style={s.selector}
          onPress={() => setActiveSigner('hr')}
          activeOpacity={0.7}
        >
          {hrSigner ? (
            <View style={s.signerSelected}>
              <Text style={s.signerName} numberOfLines={1}>{hrSigner.legal_name}</Text>
              <Text style={s.signerSub} numberOfLines={1}>
                {hrSigner.job_position?.name ?? hrSigner.department?.name ?? ''}
              </Text>
            </View>
          ) : (
            <Text style={[s.selectorText, { color: COLORS.textMuted }]}>Tanlang...</Text>
          )}
          <View style={s.selectorRight}>
            {hrSigner && (
              <TouchableOpacity onPress={() => setHrSigner(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={s.clearBtn}>✕</Text>
              </TouchableOpacity>
            )}
            <Text style={s.selectorArrow}>›</Text>
          </View>
        </TouchableOpacity>

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
      <SignerPickerModal
        visible={activeSigner === 'deputy'}
        title="Zam (Mas'ul o'rinbosar)"
        queryParams={deputyParams}
        selected={deputySigner}
        onSelect={setDeputySigner}
        onClose={() => setActiveSigner(null)}
      />
      <SignerPickerModal
        visible={activeSigner === 'hr'}
        title="Inson resurslarini boshqarish"
        queryParams={hrParams}
        selected={hrSigner}
        onSelect={setHrSigner}
        onClose={() => setActiveSigner(null)}
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
  signerSelected: { flex: 1 },
  signerName: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  signerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  selectorRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clearBtn: { fontSize: 14, color: COLORS.textMuted, paddingHorizontal: 4 },
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

const sp = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingBottom: 32,
    maxHeight: '80%',
  },
  handle: { width: 40, height: 4, backgroundColor: COLORS.cardBorder, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  searchRow: { marginBottom: 12 },
  searchInput: {
    backgroundColor: COLORS.bg, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    paddingHorizontal: 12, paddingVertical: 10,
    color: COLORS.text, fontSize: 14,
  },
  center: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },
  list: { maxHeight: 400 },
  empRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder,
  },
  empRowActive: { },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary + '33',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 17, fontWeight: '700', color: COLORS.primaryLight },
  empInfo: { flex: 1 },
  empName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  empNameActive: { color: COLORS.primaryLight },
  empSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  check: { fontSize: 16, color: COLORS.primaryLight, fontWeight: '700' },
});
