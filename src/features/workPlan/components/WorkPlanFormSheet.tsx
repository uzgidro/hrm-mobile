// Ish rejasi formasi (v2 WorkPlanForm, mobil qismi). `plan: null` — yangi. Ota
// `key` bilan faqat ochiqda mount qiladi. KPI ko'rsatkichi — web'da.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useEmployeeListPicker } from '@/lib/useInfinitePicker';
import { useTranslation } from 'react-i18next';

import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { departmentOptionsQuery } from '@/utils/employees';
import { DatePickerModal } from '@/components/DatePicker';
import { FormInput } from '@/components/FormInput';
import { PickerModal } from '@/components/PickerModal';
import { Button, Chip, SelectField, Sheet, Text } from '@/ui';

import type { WorkPlan } from '../api/queries';
import { useSaveWorkPlan } from '../api/mutations';
import { PERIOD_TYPES, PLAN_STATUSES, buildWorkPlanBody, validateWorkPlan, type WorkPlanForm } from '../utils/workPlan';

const fmt = (d: string) => (d ? dayjs(d).format('DD.MM.YYYY') : '');

export function WorkPlanFormSheet({
  plan,
  branchId,
  onClose,
}: {
  plan: WorkPlan | null;
  branchId?: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const today = dayjs().format('YYYY-MM-DD');
  const [form, setForm] = useState<WorkPlanForm>(() => ({
    title: plan?.title ?? '',
    description: plan?.description ?? '',
    employeeId: plan?.employee_id ?? null,
    departmentId: plan?.department_id ?? null,
    period: plan?.period_type ?? 'month',
    start: plan?.start_date?.slice(0, 10) ?? today,
    end: plan?.end_date?.slice(0, 10) ?? '',
    plannedResult: plan?.planned_result ?? '',
    weight: plan?.weight != null ? String(plan.weight) : '',
    status: plan?.status ?? 'planned',
  }));
  const [names, setNames] = useState({ emp: plan?.employee_name ?? '', dept: plan?.department_name ?? '' });
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<null | 'employee' | 'dept' | 'start' | 'end'>(null);
  const [empSearch, setEmpSearch] = useState('');
  const save = useSaveWorkPlan();
  const departments = useQuery({ ...departmentOptionsQuery(branchId), enabled: picker === 'dept' });
  // Sahifalab: ro'yxat oxiriga yetganda keyingi sahifa (ilgari faqat birinchi 30 xodim edi).
  const employees = useEmployeeListPicker({
    key: 'work-plans',
    search: empSearch,
    enabled: picker === 'employee',
  });

  const set = (p: Partial<WorkPlanForm>) => {
    setForm((f) => ({ ...f, ...p }));
    setError(null);
  };

  const submit = async () => {
    const err = validateWorkPlan(form);
    if (err) return setError(t(err === 'invalidRange' ? 'workPlan.invalidRange' : `workPlan.${err}`));
    try {
      await save.mutateAsync({ id: plan?.id ?? null, body: buildWorkPlanBody(form, branchId) });
      toast.success(t(plan ? 'workPlan.updated' : 'workPlan.created'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <Sheet scroll visible onClose={onClose} title={plan ? t('workPlan.editTitle') : t('workPlan.create')}>
      <View style={styles.form}>
        <FormInput
          testID="workplan-title"
          label={t('workPlan.colTitle')}
          value={form.title}
          onChangeText={(v) => set({ title: v })}
          required
        />
        <FormInput
          label={t('workPlan.fieldDescription')}
          value={form.description}
          onChangeText={(v) => set({ description: v })}
          multiline
        />
        <SelectField
          label={t('workPlan.colEmployee')}
          value={names.emp}
          placeholder={t('workPlan.allEmployees')}
          icon="user"
          onPress={() => setPicker('employee')}
        />
        <SelectField
          label={t('workPlan.colDepartment')}
          value={names.dept}
          placeholder={t('workPlan.allDepartments')}
          icon="building"
          onPress={() => setPicker('dept')}
        />
        <Text variant="label" tone="muted">
          {t('workPlan.fieldPeriod')}
        </Text>
        <View style={styles.chips}>
          {PERIOD_TYPES.map((p) => (
            <Chip
              key={p}
              label={t(`workPlan.period_${p}`)}
              selected={form.period === p}
              onPress={() => set({ period: p })}
            />
          ))}
        </View>
        <View style={styles.row}>
          <View style={styles.flex}>
            <SelectField
              label={t('workPlan.fieldStart')}
              value={fmt(form.start)}
              icon="calendar"
              onPress={() => setPicker('start')}
            />
          </View>
          <View style={styles.flex}>
            <SelectField
              label={t('workPlan.fieldEnd')}
              value={fmt(form.end)}
              icon="calendar"
              onPress={() => setPicker('end')}
            />
          </View>
        </View>
        <FormInput
          label={t('workPlan.colResult')}
          value={form.plannedResult}
          onChangeText={(v) => set({ plannedResult: v })}
          multiline
        />
        <FormInput
          label={t('workPlan.colWeight')}
          value={form.weight}
          onChangeText={(v) => set({ weight: v })}
          keyboardType="decimal-pad"
        />
        <Text variant="label" tone="muted">
          {t('workPlan.fieldStatus')}
        </Text>
        <View style={styles.chips}>
          {PLAN_STATUSES.map((s) => (
            <Chip
              key={s}
              label={t(`workPlan.status_${s}`)}
              selected={form.status === s}
              onPress={() => set({ status: s })}
            />
          ))}
        </View>
        {!!error && (
          <Text variant="label" tone="danger">
            {error}
          </Text>
        )}
        <Button
          testID="workplan-save"
          label={t('common.save')}
          onPress={submit}
          loading={save.isPending}
          full
          size="lg"
        />
      </View>

      <PickerModal
        onEndReached={employees.onEndReached}
        loadingMore={employees.loadingMore}
        visible={picker === 'employee'}
        title={t('workPlan.colEmployee')}
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
          setNames((n) => ({ ...n, emp: employees.data?.find((e) => e.id === id)?.legal_name ?? '' }));
          setPicker(null);
        }}
      />
      <PickerModal
        visible={picker === 'dept'}
        title={t('workPlan.colDepartment')}
        options={(departments.data ?? []).map((d) => ({ value: d.id, label: d.name || `#${d.id}` }))}
        loading={departments.isFetching}
        selected={form.departmentId}
        onClose={() => setPicker(null)}
        onSelect={(id) => {
          set({ departmentId: id });
          setNames((n) => ({ ...n, dept: departments.data?.find((d) => d.id === id)?.name ?? '' }));
          setPicker(null);
        }}
      />
      {/* Faqat ochiqda mount, ISO qiymat — boshlang'ich oy mount paytida olinadi. */}
      {picker === 'start' && (
        <DatePickerModal
          visible
          value={form.start || undefined}
          title={t('workPlan.fieldStart')}
          onConfirm={(d) => set({ start: d })}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === 'end' && (
        <DatePickerModal
          visible
          value={form.end || form.start || undefined}
          title={t('workPlan.fieldEnd')}
          onConfirm={(d) => set({ end: d })}
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
