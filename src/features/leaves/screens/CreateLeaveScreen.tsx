import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/api/client';
import { EMPLOYEE_DETAIL } from '@/api/urls';
import { getApiErrorMessage } from '@/api/errors';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Employee } from '@/types';
import { Icon } from '@/components/Icon';
import { useCreateLeave, type CreateLeavePayload } from '../api/mutations';
import { LeaveDateTimePicker } from '../components/LeaveDateTimePicker';
import { LeaveTypeSheet, LEAVE_TYPES } from '../components/LeaveTypeSheet';

export default function CreateLeaveScreen() {
  const { user } = useAuthStore();
  const employeeId = user?.employee?.id;
  const { colors } = useTheme();
  const s = useThemedStyles(makeS);
  const { t } = useTranslation();
  const createLeaveMut = useCreateLeave();

  const now = dayjs();
  const [leaveType, setLeaveType] = useState(LEAVE_TYPES[0]);
  const [startDate, setStartDate] = useState(now.minute(0).second(0));
  const [endDate, setEndDate] = useState(now.add(1, 'hour').minute(0).second(0));
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showTypeSheet, setShowTypeSheet] = useState(false);
  const [activePicker, setActivePicker] = useState<'start' | 'end' | null>(null);

  const { data: employeeFull, isLoading: supervisorLoading } = useQuery<Employee>({
    queryKey: ['employee-full', employeeId],
    queryFn: () => apiClient.get<Employee>(EMPLOYEE_DETAIL(employeeId!)).then((r) => r.data),
    enabled: !!employeeId,
    staleTime: 10 * 60 * 1000,
  });

  const supervisor: Employee | undefined = employeeFull?.supervisor ?? user?.employee?.supervisor;

  const handleSubmit = useCallback(async () => {
    if (endDate.isBefore(startDate) || endDate.isSame(startDate)) {
      Alert.alert(t('leaves.errorTitle'), t('leaves.endMustBeAfterStart'));
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateLeavePayload = {
        type: leaveType,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        description: description.trim() || undefined,
      };
      if (supervisor?.id) payload.assigned_signer_ids = [supervisor.id];
      await createLeaveMut.mutateAsync(payload);
      Alert.alert(t('common.success'), t('leaves.createdSuccess'), [{ text: t('common.ok'), onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert(t('leaves.errorTitle'), getApiErrorMessage(e, t('errors.sendFailed')));
    } finally {
      setSubmitting(false);
    }
  }, [leaveType, startDate, endDate, description, supervisor, createLeaveMut, t]);

  const diffMin = endDate.diff(startDate, 'minute');
  const durationText = (() => {
    if (diffMin <= 0) return null;
    const days = Math.floor(diffMin / 1440);
    const hours = Math.floor((diffMin % 1440) / 60);
    const mins = diffMin % 60;
    return [
      days > 0 && t('leaves.durationDays', { count: days }),
      hours > 0 && t('leaves.durationHours', { count: hours }),
      mins > 0 && t('leaves.durationMinutes', { count: mins }),
    ].filter(Boolean).join(' ');
  })();

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Icon name="chevronLeft" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={s.headerTitle}>{t('leaves.createTitle')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.label}>{t('leaves.typeLabel')}</Text>
        <TouchableOpacity style={s.selector} onPress={() => setShowTypeSheet(true)} activeOpacity={0.7}>
          <Text style={s.selectorText}>{leaveType}</Text>
          <Icon name="chevronRight" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <Text style={s.label}>{t('leaves.startLabel')}</Text>
        <TouchableOpacity style={s.selector} onPress={() => setActivePicker('start')} activeOpacity={0.7}>
          <View style={s.dateTimeRow}>
            <Icon name="calendar" size={16} color={colors.textMuted} />
            <Text style={s.dateTimeText}>{startDate.format('DD.MM.YYYY')}</Text>
            <Icon name="clock" size={16} color={colors.textMuted} />
            <Text style={s.dateTimeText}>{startDate.format('HH:mm')}</Text>
          </View>
          <Icon name="chevronRight" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <Text style={s.label}>{t('leaves.endLabel')}</Text>
        <TouchableOpacity style={s.selector} onPress={() => setActivePicker('end')} activeOpacity={0.7}>
          <View style={s.dateTimeRow}>
            <Icon name="calendar" size={16} color={colors.textMuted} />
            <Text style={s.dateTimeText}>{endDate.format('DD.MM.YYYY')}</Text>
            <Icon name="clock" size={16} color={colors.textMuted} />
            <Text style={s.dateTimeText}>{endDate.format('HH:mm')}</Text>
          </View>
          <Icon name="chevronRight" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {durationText && (
          <View style={s.durationRow}><Icon name="clock" size={16} color={colors.primaryLight} /><Text style={s.durationText}>{durationText}</Text></View>
        )}
        {diffMin <= 0 && endDate.isValid() && <Text style={s.errorText}>{t('leaves.endBeforeStart')}</Text>}

        <Text style={s.label}>{t('leaves.supervisorLabel')}</Text>
        <View style={s.supervisorCard}>
          {supervisorLoading ? (
            <ActivityIndicator size="small" color={colors.primaryLight} />
          ) : supervisor ? (
            <>
              <View style={s.supervisorAvatar}><Text style={s.supervisorAvatarText}>{(supervisor.legal_name || 'X').charAt(0)}</Text></View>
              <View style={s.supervisorInfo}>
                <Text style={s.supervisorName}>{supervisor.legal_name}</Text>
                <Text style={s.supervisorSub} numberOfLines={1}>{supervisor.job_position?.name ?? supervisor.department?.name ?? '—'}</Text>
              </View>
              <Icon name="lock" size={14} color={colors.textMuted} />
            </>
          ) : (
            <Text style={s.noSupervisorText}>{t('leaves.noSupervisor')}</Text>
          )}
        </View>
        {!supervisorLoading && !supervisor && <Text style={s.supervisorHint}>{t('leaves.supervisorHint')}</Text>}

        <Text style={s.label}>{t('leaves.commentLabel')}</Text>
        <TextInput style={s.textarea} placeholder={t('leaves.commentPlaceholder')} placeholderTextColor={colors.textMuted} value={description} onChangeText={setDescription} multiline numberOfLines={4} textAlignVertical="top" />

        <TouchableOpacity style={[s.submitBtn, (submitting || diffMin <= 0) && s.submitBtnDisabled]} onPress={handleSubmit} disabled={submitting || diffMin <= 0} activeOpacity={0.85}>
          {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.submitBtnText}>{t('common.send')}</Text>}
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      <LeaveTypeSheet visible={showTypeSheet} selected={leaveType} onSelect={setLeaveType} onClose={() => setShowTypeSheet(false)} />
      <LeaveDateTimePicker visible={activePicker === 'start'} title={t('leaves.startPickerTitle')} value={startDate}
        onConfirm={(v) => { setStartDate(v); if (v.isAfter(endDate)) setEndDate(v.add(1, 'hour')); }} onClose={() => setActivePicker(null)} />
      <LeaveDateTimePicker visible={activePicker === 'end'} title={t('leaves.endPickerTitle')} value={endDate} minDate={startDate} onConfirm={setEndDate} onClose={() => setActivePicker(null)} />
    </SafeAreaView>
  );
}

const makeS = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    backBtn: { width: 36, height: 36, justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: c.text, paddingLeft: 4 },
    content: { paddingHorizontal: 16, paddingTop: 20 },
    label: { fontSize: 13, fontWeight: '600', color: c.textSecondary, marginBottom: 6, marginTop: 18 },
    selector: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 14, paddingVertical: 14 },
    selectorText: { flex: 1, fontSize: 14, color: c.text, fontWeight: '500' },
    dateTimeRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
    dateTimeText: { fontSize: 14, color: c.text, fontWeight: '500' },
    durationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 2 },
    durationText: { fontSize: 13, color: c.primaryLight, fontWeight: '600' },
    errorText: { fontSize: 12, color: c.error, marginTop: 6, paddingHorizontal: 2 },
    supervisorCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 14, paddingVertical: 14, minHeight: 56 },
    supervisorAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
    supervisorAvatarText: { fontSize: 17, fontWeight: '700', color: c.primaryLight },
    supervisorInfo: { flex: 1 },
    supervisorName: { fontSize: 14, fontWeight: '600', color: c.text },
    supervisorSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    noSupervisorText: { flex: 1, fontSize: 14, color: c.textMuted, fontStyle: 'italic' },
    supervisorHint: { fontSize: 12, color: c.textMuted, marginTop: 6, paddingHorizontal: 2, fontStyle: 'italic' },
    textarea: { backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 14, paddingVertical: 12, color: c.text, fontSize: 14, minHeight: 100 },
    submitBtn: { backgroundColor: c.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
    submitBtnDisabled: { opacity: 0.5 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
