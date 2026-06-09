import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Modal, SafeAreaView, ActivityIndicator, Alert,
} from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/uz';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../src/store/authStore';
import { apiClient } from '../../src/api/client';
import { WORK_LEAVES, WORK_LEAVE_CATEGORIES, TURNSTILE_ATTENDANCE_EVENTS } from '../../src/api/urls';
import { COLORS } from '../../src/constants';
import { WorkLeave, WorkLeaveCategory, AttendanceEvent } from '../../src/types';

dayjs.locale('uz');

const DAYS_UZ = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
const MONTHS_UZ = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Kutilmoqda', color: '#F59E0B' },
  approved: { label: 'Tasdiqlangan', color: '#22C55E' },
  rejected: { label: 'Rad etildi', color: '#EF4444' },
};

const MODULE_ITEMS = [
  { key: 'attendance', emoji: '🏃', label: 'Qatnashish' },
  { key: 'requests', emoji: '📋', label: "So'rovlar" },
  { key: 'team', emoji: '👥', label: 'Jamoa' },
  { key: 'pay', emoji: '💳', label: "To'lov" },
];

export default function HomeScreen() {
  const { user } = useAuthStore();
  const employee = user?.employee;

  const [refreshing, setRefreshing] = useState(false);
  const [workLeaves, setWorkLeaves] = useState<WorkLeave[]>([]);
  const [categories, setCategories] = useState<WorkLeaveCategory[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTypeSheet, setShowTypeSheet] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<WorkLeaveCategory | null>(null);
  const [creating, setCreating] = useState(false);

  const now = dayjs();
  const dateStr = `${DAYS_UZ[now.day()]} - ${now.date()} ${MONTHS_UZ[now.month()]} ${now.year()}`;
  const monthStart = now.startOf('month').format('YYYY-MM-DD');
  const monthEnd = now.endOf('month').format('YYYY-MM-DD');
  const todayStr = now.format('YYYY-MM-DD');

  // Oy bo'yicha so'rov — calendar bilan bir xil query key (cache share qiladi)
  const { data: monthEvents = [], refetch: refetchEvents } = useQuery<AttendanceEvent[]>({
    queryKey: ['attendance', employee?.id, now.format('YYYY-MM')],
    queryFn: () =>
      apiClient.get(TURNSTILE_ATTENDANCE_EVENTS, {
        params: {
          date_from: monthStart,
          date_to: monthEnd,
          employee_id: employee!.id,
        },
      }).then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : (d?.items ?? []);
      }),
    enabled: !!employee?.id,
    staleTime: 2 * 60 * 1000,
  });

  // Bugungi eventlarni filterlash
  const todayEvents = useMemo<AttendanceEvent[]>(() =>
    monthEvents.filter((e) =>
      dayjs(e.happen_time).format('YYYY-MM-DD') === todayStr
    ),
    [monthEvents, todayStr]
  );

  const loadOtherData = useCallback(async () => {
    if (!employee?.id) return;
    try {
      const [leavesRes, catsRes] = await Promise.all([
        apiClient.get(WORK_LEAVES, { params: { employee_id: employee.id, size: 5 } }),
        apiClient.get(WORK_LEAVE_CATEGORIES),
      ]);
      const leaves = Array.isArray(leavesRes.data)
        ? leavesRes.data
        : (leavesRes.data?.items || []);
      setWorkLeaves(leaves.slice(0, 5));
      setCategories(catsRes.data || []);
    } catch {}
  }, [employee?.id]);

  useEffect(() => { loadOtherData(); }, [loadOtherData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchEvents(), loadOtherData()]);
    setRefreshing(false);
  }, [refetchEvents, loadOtherData]);

  // Birinchi kirish va oxirgi chiqish
  const entryEvents = todayEvents
    .filter((e) => e.direction_type === 'entrance')
    .sort((a, b) => dayjs(a.happen_time).diff(dayjs(b.happen_time)));
  const exitEvents = todayEvents
    .filter((e) => e.direction_type === 'exit')
    .sort((a, b) => dayjs(a.happen_time).diff(dayjs(b.happen_time)));
  const entry = entryEvents[0];
  const exit = exitEvents[exitEvents.length - 1];

  const handleCreateRequest = async () => {
    if (!selectedCategory) {
      Alert.alert('Xato', "So'rov turini tanlang");
      return;
    }
    setCreating(true);
    try {
      await apiClient.post(WORK_LEAVES, {
        category_id: selectedCategory.id,
        employee_id: employee?.id,
        start_time: now.toISOString(),
        end_time: now.endOf('day').toISOString(),
      });
      setShowCreateModal(false);
      setSelectedCategory(null);
      await Promise.all([refetchEvents(), loadOtherData()]);
      Alert.alert('Muvaffaqiyat', "So'rov yuborildi");
    } catch {
      Alert.alert('Xato', "So'rov yuborishda xatolik");
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryLight} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Asosiy</Text>
            <Text style={styles.headerDate}>{dateStr}</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn}>
            <Text style={styles.bellEmoji}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* Jadval card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleRow}>
              <View style={styles.dot} />
              <Text style={styles.cardTitle}>Jadval</Text>
            </View>
            {employee?.working_hours_start && (
              <Text style={styles.scheduleTime}>
                {employee.working_hours_start} - {employee.working_hours_end}
              </Text>
            )}
          </View>
          <View style={styles.attendanceRow}>
            <View style={styles.attendanceItem}>
              <Text style={styles.attendanceArrow}>🔽</Text>
              <Text style={styles.attendanceTime}>
                {entry ? dayjs(entry.happen_time).format('HH:mm') : '--:--'}
              </Text>
            </View>
            <View style={styles.attendanceDivider} />
            <View style={styles.attendanceItem}>
              <Text style={styles.attendanceArrowUp}>🔼</Text>
              <Text style={styles.attendanceTime}>
                {exit ? dayjs(exit.happen_time).format('HH:mm') : '--:--'}
              </Text>
            </View>
          </View>
        </View>

        {/* Qaydnoma card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardIcon}>🎯</Text>
              <Text style={styles.cardTitle}>Qaydnoma</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.linkText}>Barchasi</Text>
            </TouchableOpacity>
          </View>
          {todayEvents.length === 0 ? (
            <Text style={styles.emptyText}>Ro'yxat bo'sh</Text>
          ) : (
            todayEvents.slice(0, 3).map((ev) => (
              <View key={ev.id} style={styles.eventRow}>
                <Text style={styles.eventTime}>{dayjs(ev.happen_time).format('HH:mm')}</Text>
                <Text style={styles.eventDir}>
                  {ev.direction_type === 'entrance' ? '➡️ Kirish' : '⬅️ Chiqish'}
                </Text>
                <Text style={styles.eventTurnstile}>{ev.turnstile?.acs_dev_name || ''}</Text>
              </View>
            ))
          )}
        </View>

        {/* Modullar */}
        <View style={styles.modulesSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Modullar</Text>
            <TouchableOpacity>
              <Text style={styles.linkText}>Hammasi {'>'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modulesGrid}>
            {MODULE_ITEMS.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={styles.moduleBtn}
                activeOpacity={0.75}
                onPress={() => m.key === 'team' ? router.push('/team') : undefined}
              >
                <Text style={styles.moduleEmoji}>{m.emoji}</Text>
                <Text style={styles.moduleLabel}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* So'rovlar card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardIcon}>📋</Text>
              <Text style={styles.cardTitle}>So'rovlar</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.linkText}>Barchasi</Text>
            </TouchableOpacity>
          </View>

          {workLeaves.length === 0 ? (
            <Text style={styles.emptyText}>So'rovlar yo'q</Text>
          ) : (
            workLeaves.map((leave) => {
              const st = STATUS_MAP[leave.status] || STATUS_MAP.pending;
              return (
                <View key={leave.id} style={styles.leaveRow}>
                  <View style={styles.leaveInfo}>
                    <Text style={styles.leaveName}>
                      {leave.category?.name || "Ruxsat so'rovi"}
                    </Text>
                    <Text style={styles.leaveDate}>
                      {dayjs(leave.start_time).format('D MMM. YYYY, HH:mm')}-
                      {dayjs(leave.end_time).format('HH:mm')}
                    </Text>
                    <Text style={styles.leaveEmployee}>
                      {leave.employee?.legal_name || employee?.legal_name || ''}
                    </Text>
                  </View>
                  <Text style={[styles.leaveStatus, { color: st.color }]}>{st.label}</Text>
                </View>
              );
            })
          )}

          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => setShowTypeSheet(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.createBtnText}>So'rov yaratish</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* So'rov turi bottom sheet */}
      <Modal visible={showTypeSheet} transparent animationType="slide">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowTypeSheet(false)}
        />
        <View style={styles.bottomSheet}>
          <Text style={styles.sheetTitle}>So'rov turini tanlang</Text>
          {categories.length === 0 ? (
            <Text style={styles.emptyText}>Yuklanmoqda...</Text>
          ) : (
            categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.sheetItem}
                onPress={() => {
                  setSelectedCategory(cat);
                  setShowTypeSheet(false);
                  setShowCreateModal(true);
                }}
              >
                <Text style={styles.sheetItemEmoji}>🏃</Text>
                <Text style={styles.sheetItemText}>{cat.name}</Text>
              </TouchableOpacity>
            ))
          )}
          <TouchableOpacity style={styles.sheetCloseBtn} onPress={() => setShowTypeSheet(false)}>
            <Text style={styles.sheetCloseBtnText}>Yopish</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* So'rov yaratish confirm modal */}
      <Modal visible={showCreateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>So'rov yuborish</Text>
            <Text style={styles.confirmText}>
              {selectedCategory?.name} bo'yicha so'rov yuborilsinmi?
            </Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowCreateModal(false); setSelectedCategory(null); }}
              >
                <Text style={styles.cancelBtnText}>Bekor</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleCreateRequest}
                disabled={creating}
              >
                {creating
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.confirmBtnText}>Yuborish</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 32 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  headerDate: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  bellBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' },
  bellEmoji: { fontSize: 20 },

  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.cardBorder },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  cardIcon: { fontSize: 16 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  scheduleTime: { fontSize: 13, color: COLORS.textSecondary },
  linkText: { fontSize: 13, color: COLORS.primaryLight, fontWeight: '600' },

  attendanceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  attendanceItem: { flex: 1, alignItems: 'center', gap: 8 },
  attendanceArrow: { fontSize: 20 },
  attendanceArrowUp: { fontSize: 20 },
  attendanceTime: { fontSize: 22, fontWeight: '700', color: COLORS.text, letterSpacing: 1 },
  attendanceDivider: { width: 1, height: 40, backgroundColor: COLORS.cardBorder, marginHorizontal: 16 },

  emptyText: { color: COLORS.textMuted, textAlign: 'center', paddingVertical: 20, fontSize: 14 },

  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },
  eventTime: { fontSize: 14, fontWeight: '700', color: COLORS.text, width: 44 },
  eventDir: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  eventTurnstile: { fontSize: 12, color: COLORS.textMuted },

  modulesSection: { marginBottom: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  modulesGrid: { flexDirection: 'row', gap: 10 },
  moduleBtn: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  moduleEmoji: { fontSize: 24 },
  moduleLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600', textAlign: 'center' },

  leaveRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },
  leaveInfo: { flex: 1, gap: 3 },
  leaveName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  leaveDate: { fontSize: 12, color: COLORS.textSecondary },
  leaveEmployee: { fontSize: 12, color: COLORS.textMuted },
  leaveStatus: { fontSize: 12, fontWeight: '700', marginLeft: 8, marginTop: 2 },

  createBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  bottomSheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, gap: 4,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  sheetItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },
  sheetItemEmoji: { fontSize: 22 },
  sheetItemText: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  sheetCloseBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  sheetCloseBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmModal: { backgroundColor: COLORS.card, borderRadius: 20, padding: 24, width: '100%', gap: 12 },
  confirmTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  confirmText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  confirmBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: COLORS.cardBorder, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  cancelBtnText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '600' },
  confirmBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
