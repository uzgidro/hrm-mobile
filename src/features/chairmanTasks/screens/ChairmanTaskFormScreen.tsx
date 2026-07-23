import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import type { ChairmanTask } from '@/types';
import { Icon } from '@/components/Icon';
import { FormInput } from '@/components/FormInput';
import { ScreenHeader, HeaderAction } from '@/components/ScreenHeader';
import { confirm } from '@/lib/confirm';
import { getApiErrorMessage } from '@/api/errors';
import { canManageChairmanTasks } from '@/utils/roles';
import { chairmanTasksListQuery } from '../api/queries';
import { useCreateChairmanTask, useUpdateChairmanTask, useDeleteChairmanTask } from '../api/mutations';

const COLORS = ['#0DA9AA', '#6366F1', '#F59E0B', '#EF4444', '#10B981'];

export default function ChairmanTaskFormScreen() {
  const { t } = useTranslation();
  const { id, date } = useLocalSearchParams<{ id?: string; date?: string }>();
  const taskId = id ? Number(id) : undefined;
  const editing = taskId != null;
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  // Route-level guard: only secretariat / master-admin may open the form (the
  // minister sees a read-only list). Backend also 403s, this is the UX contract.
  useEffect(() => {
    if (!canManageChairmanTasks(user)) router.back();
  }, [user]);

  // Editing has no detail endpoint — read the task from the list of ITS month
  // (passed as `date` param), not today's month, so a task from any month loads.
  const anchor = editing && date ? dayjs(date) : dayjs();
  const { data: monthTasks = [] } = useQuery({
    ...chairmanTasksListQuery(anchor.startOf('month').format('YYYY-MM-DD'), anchor.endOf('month').format('YYYY-MM-DD')),
    enabled: editing,
  });
  const existing = useMemo<ChairmanTask | undefined>(
    () => monthTasks.find((x) => x.id === taskId),
    [monthTasks, taskId],
  );

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [participants, setParticipants] = useState('');
  const [taskDate, setTaskDate] = useState(date ?? dayjs().format('YYYY-MM-DD'));
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  // Async data: seed the form once the task loads from its month's list. Keyed on
  // existing.id so a resolved task hydrates fields that useState initialized empty.
  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title ?? '');
    setDescription(existing.description ?? '');
    setParticipants(existing.participants ?? '');
    setTaskDate(existing.task_date ?? dayjs().format('YYYY-MM-DD'));
    setStartTime(existing.start_time?.slice(0, 5) ?? '');
    setEndTime(existing.end_time?.slice(0, 5) ?? '');
    setColor(existing.color ?? COLORS[0]);
  }, [existing]);

  const createM = useCreateChairmanTask();
  const updateM = useUpdateChairmanTask(taskId ?? 0);
  const deleteM = useDeleteChairmanTask();
  const busy = createM.isPending || updateM.isPending || deleteM.isPending;

  const submit = () => {
    if (!title.trim()) { Alert.alert(t('chairman.errorTitle'), t('chairman.titleRequired')); return; }
    if (!taskDate.trim()) { Alert.alert(t('chairman.errorTitle'), t('chairman.dateRequired')); return; }
    const payload = {
      title: title.trim(),
      task_date: taskDate.trim(),
      description: description.trim() || null,
      participants: participants.trim() || null,
      start_time: startTime.trim() || null,
      end_time: endTime.trim() || null,
      color,
    };
    const onSuccess = () => { Alert.alert(t(editing ? 'chairman.updated' : 'chairman.created'), ''); router.back(); };
    const onError = (e: unknown) => Alert.alert(t('chairman.errorTitle'), getApiErrorMessage(e, t('chairman.actionError')));
    if (editing) updateM.mutate(payload, { onSuccess, onError });
    else createM.mutate(payload, { onSuccess, onError });
  };

  const onDelete = async () => {
    if (!editing) return;
    const ok = await confirm({
      title: t('chairman.deleteConfirmTitle'),
      message: t('chairman.deleteConfirmMessage'),
      confirmLabel: t('chairman.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    deleteM.mutate(taskId!, {
      onSuccess: () => { Alert.alert(t('chairman.deleted'), ''); router.back(); },
      onError: (e) => Alert.alert(t('chairman.errorTitle'), getApiErrorMessage(e, t('chairman.actionError'))),
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader
        title={t(editing ? 'chairman.editTitle' : 'chairman.createTitle')}
        right={editing ? <HeaderAction icon="trash" onPress={onDelete} /> : undefined}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <FormInput label={t('chairman.titleLabel')} required value={title} onChangeText={setTitle} placeholder={t('chairman.titlePlaceholder')} />
        <FormInput label={t('chairman.descriptionLabel')} value={description} onChangeText={setDescription} placeholder={t('chairman.descriptionPlaceholder')} multiline />
        <FormInput label={t('chairman.participantsLabel')} value={participants} onChangeText={setParticipants} placeholder={t('chairman.participantsPlaceholder')} />
        <FormInput label={t('chairman.dateLabel')} required value={taskDate} onChangeText={setTaskDate} placeholder="YYYY-MM-DD" />

        <View style={styles.timeRow}>
          <View style={{ flex: 1 }}>
            <FormInput label={t('chairman.startTimeLabel')} value={startTime} onChangeText={setStartTime} placeholder={t('chairman.timePlaceholder')} />
          </View>
          <View style={{ flex: 1 }}>
            <FormInput label={t('chairman.endTimeLabel')} value={endTime} onChangeText={setEndTime} placeholder={t('chairman.timePlaceholder')} />
          </View>
        </View>

        <View style={styles.colors}>
          {COLORS.map((c) => (
            <TouchableOpacity key={c} onPress={() => setColor(c)} activeOpacity={0.8} style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]}>
              {color === c && <Icon name="check" size={16} color="#fff" />}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={busy} activeOpacity={0.85}>
          {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.submitText}>{t('chairman.save')}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { paddingHorizontal: 16, paddingBottom: 32 },
    timeRow: { flexDirection: 'row', gap: 12 },
    colors: { flexDirection: 'row', gap: 12, marginTop: 12, marginBottom: 4 },
    colorDot: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    colorDotActive: { borderWidth: 3, borderColor: c.text },
    submitBtn: { marginTop: 20, backgroundColor: c.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
    submitText: { color: c.onPrimary, fontSize: 15, fontWeight: '700' },
  });
