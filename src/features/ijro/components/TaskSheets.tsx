// Ijro topshirig'i: tafsilot oynasi (yurituvchi uchun bajarildi / qayta ochish /
// tahrir / o'chirish) va yaratish-tahrirlash formasi (v2 TaskView + TaskForm).
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';

import { useEmployeeListPicker } from '@/lib/useInfinitePicker';
import { useTranslation } from 'react-i18next';

import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { confirm } from '@/lib/confirm';
import { PickerModal } from '@/components/PickerModal';
import { DatePickerModal } from '@/components/DatePicker';
import { FormInput } from '@/components/FormInput';
import { Badge, Button, SelectField, Sheet, Text } from '@/ui';

import { useDeleteTask, useSaveTask, useSetTaskCompleted } from '../api/mutations';
import { buildTaskBody, delayDays, statusOf, validateTask, type IjroTask, type TaskForm } from '../utils/ijro';
import { STATUS_TONE } from './statusTone';

/** Ko'rinish: DD.MM.YYYY (ichki qiymat — YYYY-MM-DD). */
const fmt = (d: string) => (d ? dayjs(d).format('DD.MM.YYYY') : '');

export function TaskDetailSheet({
  task,
  canWrite,
  onClose,
  onEdit,
}: {
  task: IjroTask | null;
  canWrite: boolean;
  onClose: () => void;
  onEdit: (t: IjroTask) => void;
}) {
  const { t } = useTranslation();
  const setCompleted = useSetTaskCompleted();
  const remove = useDeleteTask();
  if (!task) return null;
  const today = dayjs().format('YYYY-MM-DD');
  const status = statusOf(task, today);
  const late = delayDays(task, today);

  const run = async (p: Promise<unknown>, okKey: string) => {
    try {
      await p;
      toast.success(t(okKey));
      onClose();
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  // Ilova ichidagi tasdiq (`confirm`) — OS `Alert` web'da hech narsa ko'rsatmasdi.
  const confirmDelete = async () => {
    const ok = await confirm({
      title: t('ijro.remove'),
      message: t('ijro.deleteConfirm'),
      confirmLabel: t('ijro.remove'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (ok) await run(remove.mutateAsync(task.id), 'ijro.deleted');
  };

  const row = (label: string, value: string) => (
    <View style={styles.kv}>
      <Text variant="caption" tone="subtle">
        {label}
      </Text>
      <Text variant="body">{value}</Text>
    </View>
  );

  return (
    <Sheet scroll visible onClose={onClose} title={task.task_index || t('ijro.title')}>
      <View style={styles.form}>
        <View style={styles.badges}>
          <Badge label={t(`ijro.status_${status}`)} tone={STATUS_TONE[status]} />
          {late > 0 && <Badge label={t('ijro.daysLate', { count: late })} tone="danger" />}
        </View>
        {row(t('ijro.fieldEmployee'), task.employee?.legal_name ?? '—')}
        {row(t('ijro.fieldTask'), task.description || '—')}
        {row(t('ijro.fieldDeadline'), task.deadline_date ? dayjs(task.deadline_date).format('DD.MM.YYYY') : '—')}
        {row(t('ijro.fieldDone'), task.task_completed ? dayjs(task.task_completed).format('DD.MM.YYYY') : '—')}
        {canWrite && (
          <View style={styles.actions}>
            {task.task_completed ? (
              <Button
                label={t('ijro.reopen')}
                variant="soft"
                full
                loading={setCompleted.isPending}
                onPress={() => void run(setCompleted.mutateAsync({ id: task.id, date: null }), 'ijro.reopened')}
              />
            ) : (
              <Button
                label={t('ijro.markDone')}
                full
                loading={setCompleted.isPending}
                onPress={() => void run(setCompleted.mutateAsync({ id: task.id, date: today }), 'ijro.markedDone')}
              />
            )}
            <Button label={t('ijro.edit')} variant="soft" full onPress={() => onEdit(task)} />
            <Button
              testID="ijro-delete"
              label={t('ijro.remove')}
              variant="ghost"
              full
              onPress={() => void confirmDelete()}
            />
          </View>
        )}
      </View>
    </Sheet>
  );
}

function initialForm(task: IjroTask | null): TaskForm {
  return {
    index: task?.task_index ?? '',
    description: task?.description ?? '',
    employeeId: task?.employee_id ?? task?.employee?.id ?? null,
    deadline: task?.deadline_date ?? '',
    done: task?.task_completed ?? '',
  };
}

export function TaskFormSheet({ task, onClose }: { task: IjroTask | null | undefined; onClose: () => void }) {
  const { t } = useTranslation();
  const visible = task !== undefined;
  const [form, setForm] = useState<TaskForm>(() => initialForm(task ?? null));
  const [employeeName, setEmployeeName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<null | 'employee' | 'deadline' | 'done'>(null);
  const [empSearch, setEmpSearch] = useState('');
  const save = useSaveTask();

  useEffect(() => {
    if (visible) {
      setForm(initialForm(task ?? null));
      setEmployeeName(task?.employee?.legal_name ?? '');
      setError(null);
    }
  }, [visible, task]);

  // Sahifalab: ro'yxat oxiriga yetganda keyingi sahifa (ilgari faqat birinchi 30 xodim edi).
  const employees = useEmployeeListPicker({
    key: 'ijro',
    search: empSearch,
    enabled: picker === 'employee',
  });

  const set = (p: Partial<TaskForm>) => {
    setForm((f) => ({ ...f, ...p }));
    setError(null);
  };

  const submit = async () => {
    const err = validateTask(form);
    if (err) return setError(t(`ijro.${err}`));
    try {
      await save.mutateAsync({
        id: task?.id ?? null,
        body: buildTaskBody(form),
      });
      toast.success(t('ijro.saved'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <Sheet scroll visible={visible} onClose={onClose} title={task ? t('ijro.editTitle') : t('ijro.create')}>
      <View style={styles.form}>
        <FormInput label={t('ijro.fieldIndex')} value={form.index} onChangeText={(v) => set({ index: v })} required />
        <SelectField
          label={t('ijro.fieldEmployee')}
          value={employeeName}
          placeholder={t('ijro.pickEmployee')}
          onPress={() => setPicker('employee')}
        />
        <FormInput
          label={t('ijro.fieldTask')}
          value={form.description}
          onChangeText={(v) => set({ description: v })}
          multiline
        />
        <View style={styles.row}>
          <View style={styles.flex}>
            <SelectField
              label={t('ijro.fieldDeadline')}
              value={fmt(form.deadline)}
              icon="calendar"
              onPress={() => setPicker('deadline')}
            />
          </View>
          <View style={styles.flex}>
            <SelectField
              label={t('ijro.fieldDone')}
              value={fmt(form.done)}
              placeholder={t('ijro.doneHint')}
              icon="calendar"
              onPress={() => setPicker('done')}
            />
          </View>
        </View>
        {!!error && (
          <Text variant="label" tone="danger">
            {error}
          </Text>
        )}
        <Button testID="ijro-save" label={t('common.save')} onPress={submit} loading={save.isPending} full size="lg" />
      </View>

      <PickerModal
        onEndReached={employees.onEndReached}
        loadingMore={employees.loadingMore}
        visible={picker === 'employee'}
        title={t('ijro.pickEmployee')}
        options={(employees.data ?? []).map((e) => ({
          value: e.id,
          label: e.legal_name,
          photo: e.photo_path,
          photoThumb: e.photo_thumb_path,
        }))}
        loading={employees.isFetching}
        selected={form.employeeId}
        onClose={() => setPicker(null)}
        onSearchChange={setEmpSearch}
        onSelect={(id) => {
          set({ employeeId: id });
          setEmployeeName(employees.data?.find((e) => e.id === id)?.legal_name ?? '');
          setPicker(null);
        }}
      />
      {/* Faqat ochiqda mount — boshlang'ich oy mount paytida olinadi. */}
      {picker === 'deadline' && (
        <DatePickerModal
          visible
          value={form.deadline || undefined}
          title={t('ijro.fieldDeadline')}
          onConfirm={(d) => set({ deadline: d })}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === 'done' && (
        <DatePickerModal
          visible
          value={form.done || undefined}
          title={t('ijro.fieldDone')}
          onConfirm={(d) => set({ done: d })}
          onClose={() => setPicker(null)}
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12, paddingBottom: 8 },
  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  kv: { gap: 2 },
  actions: { gap: 8, marginTop: 8 },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
