// Malaka oshirish yozuvi formasi (v2 TrainingsPage forma). `training: null` — yangi
// (xodim tanlanadi; guruh bilan ro'yxatga olish — web'da). Ota `key` bilan faqat
// ochiqda mount qiladi.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';

import { useEmployeeListPicker } from '@/lib/useInfinitePicker';
import { useTranslation } from 'react-i18next';

import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { DatePickerModal } from '@/components/DatePicker';
import { FormInput } from '@/components/FormInput';
import { PickerModal } from '@/components/PickerModal';
import { Button, Chip, SelectField, Sheet, Text } from '@/ui';

import type { Training } from '../api/queries';
import { useSaveTraining } from '../api/mutations';
import {
  TRAINING_RESULTS,
  TRAINING_STATUSES,
  TRAINING_TYPES,
  buildTrainingBody,
  validateTraining,
  type TrainingForm,
} from '../utils/trainings';

const fmt = (d: string) => (d ? dayjs(d).format('DD.MM.YYYY') : '');
type Pick = null | 'employee' | 'start' | 'end' | 'expires';

export function TrainingFormSheet({ training, onClose }: { training: Training | null; onClose: () => void }) {
  const { t } = useTranslation();
  const isEdit = !!training;
  const [form, setForm] = useState<TrainingForm>(() => ({
    employeeId: training?.employee_id ?? null,
    type: training?.training_type ?? 'course',
    program: training?.program_name ?? '',
    provider: training?.provider ?? '',
    start: training?.start_date?.slice(0, 10) ?? '',
    end: training?.end_date?.slice(0, 10) ?? '',
    hours: training?.hours != null ? String(training.hours) : '',
    status: training?.status ?? 'planned',
    result: training?.result ?? '',
    cost: training?.cost != null ? String(training.cost) : '',
    certNumber: training?.certificate_number ?? '',
    certExpires: training?.certificate_expires_at?.slice(0, 10) ?? '',
    note: training?.note ?? '',
  }));
  const [empName, setEmpName] = useState(training?.employee_name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<Pick>(null);
  const [empSearch, setEmpSearch] = useState('');
  const save = useSaveTraining();
  // Sahifalab: ro'yxat oxiriga yetganda keyingi sahifa (ilgari faqat birinchi 30 xodim edi).
  const employees = useEmployeeListPicker({
    key: 'trainings',
    search: empSearch,
    enabled: picker === 'employee',
  });

  const set = (p: Partial<TrainingForm>) => {
    setForm((f) => ({ ...f, ...p }));
    setError(null);
  };

  const submit = async () => {
    const err = validateTraining(form, isEdit);
    if (err) return setError(t(err === 'invalidRange' ? 'trainings.invalidRange' : `trainings.${err}`));
    const body = buildTrainingBody(form);
    try {
      await save.mutateAsync({
        id: training?.id ?? null,
        body: isEdit ? body : { ...body, employee_id: form.employeeId },
      });
      toast.success(t(isEdit ? 'trainings.updated' : 'trainings.created'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <Sheet scroll visible onClose={onClose} title={isEdit ? t('trainings.editTitle') : t('trainings.add')}>
      <View style={styles.form}>
        {isEdit ? (
          <Text variant="label" tone="muted">
            {training?.employee_name ?? '—'}
          </Text>
        ) : (
          <SelectField
            label={t('trainings.employee')}
            value={empName}
            icon="user"
            onPress={() => setPicker('employee')}
          />
        )}
        <Text variant="label" tone="muted">
          {t('trainings.type')}
        </Text>
        <View style={styles.chips}>
          {TRAINING_TYPES.map((x) => (
            <Chip
              key={x}
              label={t(`trainings.type_${x}`)}
              selected={form.type === x}
              onPress={() => set({ type: x })}
            />
          ))}
        </View>
        <FormInput
          testID="training-program"
          label={t('trainings.program')}
          value={form.program}
          onChangeText={(v) => set({ program: v })}
          required
        />
        <FormInput label={t('trainings.provider')} value={form.provider} onChangeText={(v) => set({ provider: v })} />
        <View style={styles.row}>
          <View style={styles.flex}>
            <SelectField
              label={t('trainings.startDate')}
              value={fmt(form.start)}
              icon="calendar"
              onPress={() => setPicker('start')}
            />
          </View>
          <View style={styles.flex}>
            <SelectField
              label={t('trainings.endDate')}
              value={fmt(form.end)}
              icon="calendar"
              onPress={() => setPicker('end')}
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.flex}>
            <FormInput
              label={t('trainings.hours')}
              value={form.hours}
              onChangeText={(v) => set({ hours: v })}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.flex}>
            <FormInput
              label={t('trainings.cost')}
              value={form.cost}
              onChangeText={(v) => set({ cost: v })}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
        <Text variant="label" tone="muted">
          {t('trainings.status')}
        </Text>
        <View style={styles.chips}>
          {TRAINING_STATUSES.map((x) => (
            <Chip
              key={x}
              label={t(`trainings.status_${x}`)}
              selected={form.status === x}
              onPress={() => set({ status: x })}
            />
          ))}
        </View>
        <Text variant="label" tone="muted">
          {t('trainings.result')}
        </Text>
        <View style={styles.chips}>
          {TRAINING_RESULTS.map((x) => (
            <Chip
              key={x}
              label={t(`trainings.result_${x}`)}
              selected={form.result === x}
              onPress={() => set({ result: form.result === x ? '' : x })}
            />
          ))}
        </View>
        <FormInput
          label={t('trainings.certificateNumber')}
          value={form.certNumber}
          onChangeText={(v) => set({ certNumber: v })}
        />
        <SelectField
          label={t('trainings.expiresAt')}
          value={fmt(form.certExpires)}
          icon="calendar"
          onPress={() => setPicker('expires')}
        />
        <Text variant="caption" tone="subtle">
          {t('trainings.expiresHint')}
        </Text>
        <FormInput label={t('trainings.note')} value={form.note} onChangeText={(v) => set({ note: v })} multiline />
        {!!error && (
          <Text variant="label" tone="danger">
            {error}
          </Text>
        )}
        <Button
          testID="training-save"
          label={t('common.save')}
          onPress={submit}
          loading={save.isPending}
          full
          size="lg"
        />
        {!isEdit && (
          <Text variant="caption" tone="subtle">
            {t('trainings.groupWebOnly')}
          </Text>
        )}
      </View>

      <PickerModal
        onEndReached={employees.onEndReached}
        loadingMore={employees.loadingMore}
        visible={picker === 'employee'}
        title={t('trainings.employee')}
        options={(employees.data ?? []).map((e) => ({
          value: e.id,
          label: e.legal_name,
          subLabel: e.job_position?.name,
        }))}
        loading={employees.isFetching}
        selected={form.employeeId}
        onClose={() => setPicker(null)}
        onSearchChange={setEmpSearch}
        onSelect={(id) => {
          set({ employeeId: id });
          setEmpName(employees.data?.find((e) => e.id === id)?.legal_name ?? '');
          setPicker(null);
        }}
      />
      {/* Faqat ochiqda mount, ISO qiymat. */}
      {picker === 'start' && (
        <DatePickerModal
          visible
          value={form.start || undefined}
          title={t('trainings.startDate')}
          onConfirm={(d) => set({ start: d })}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === 'end' && (
        <DatePickerModal
          visible
          value={form.end || form.start || undefined}
          title={t('trainings.endDate')}
          onConfirm={(d) => set({ end: d })}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === 'expires' && (
        <DatePickerModal
          visible
          value={form.certExpires || form.end || undefined}
          title={t('trainings.expiresAt')}
          onConfirm={(d) => set({ certExpires: d })}
          onClose={() => setPicker(null)}
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12, paddingBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
