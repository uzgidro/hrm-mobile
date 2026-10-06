// Yangi audit (v2 InspectionsPage forma). Auditorlarni tanlash — web'da. Ota
// `key` bilan faqat ochiqda mount qiladi.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import { EMPLOYEES_LIST } from '@/api/urls';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { departmentOptionsQuery } from '@/utils/employees';
import { DatePickerModal } from '@/components/DatePicker';
import { FormInput } from '@/components/FormInput';
import { PickerModal } from '@/components/PickerModal';
import { Button, Chip, SelectField, Sheet, Text } from '@/ui';
import type { Employee } from '@/types';
import { useCreateInspection } from '../api/mutations';
import { INSPECTION_OBJECTS, buildInspectionBody, validateInspection, type InspectionForm } from '../utils/inspections';

const fmt = (d: string) => (d ? dayjs(d).format('DD.MM.YYYY') : '');

export function InspectionFormSheet({ branchId, onClose }: { branchId?: number; onClose: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState<InspectionForm>({
    title: '',
    purpose: '',
    objectType: 'department',
    employeeId: null,
    departmentId: null,
    processName: '',
    periodStart: '',
    periodEnd: '',
  });
  const [names, setNames] = useState({ emp: '', dept: '' });
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<null | 'employee' | 'dept' | 'start' | 'end'>(null);
  const [empSearch, setEmpSearch] = useState('');
  const create = useCreateInspection();
  const departments = useQuery({ ...departmentOptionsQuery(branchId), enabled: picker === 'dept' });
  const employees = useQuery({
    queryKey: ['inspections', 'employee-picker', empSearch],
    queryFn: () =>
      apiClient
        .get(EMPLOYEES_LIST, { params: { size: 30, ...(empSearch ? { search: empSearch } : {}) } })
        .then((r) => unwrapList<Employee>(r.data)),
    enabled: picker === 'employee',
  });

  const set = (p: Partial<InspectionForm>) => {
    setForm((f) => ({ ...f, ...p }));
    setError(null);
  };

  const submit = async () => {
    const err = validateInspection(form);
    if (err) return setError(t(err === 'invalidRange' ? 'inspections.invalidRange' : `inspections.${err}`));
    try {
      await create.mutateAsync(buildInspectionBody(form, branchId));
      toast.success(t('inspections.created'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <Sheet scroll visible onClose={onClose} title={t('inspections.add')}>
      <View style={styles.form}>
        <FormInput
          testID="inspection-title"
          label={t('inspections.fieldTitle')}
          value={form.title}
          onChangeText={(v) => set({ title: v })}
          required
        />
        <FormInput
          label={t('inspections.purpose')}
          value={form.purpose}
          onChangeText={(v) => set({ purpose: v })}
          multiline
        />
        <Text variant="label" tone="muted">
          {t('inspections.objectType')}
        </Text>
        <View style={styles.chips}>
          {INSPECTION_OBJECTS.map((o) => (
            <Chip
              key={o}
              label={t(`inspections.object_${o}`)}
              selected={form.objectType === o}
              onPress={() => set({ objectType: o })}
            />
          ))}
        </View>
        {form.objectType === 'employee' && (
          <SelectField
            label={t('inspections.object_employee')}
            value={names.emp}
            icon="user"
            onPress={() => setPicker('employee')}
          />
        )}
        {form.objectType === 'department' && (
          <SelectField
            label={t('inspections.object_department')}
            value={names.dept}
            icon="building"
            onPress={() => setPicker('dept')}
          />
        )}
        {form.objectType === 'process' && (
          <FormInput
            label={t('inspections.object_process')}
            value={form.processName}
            onChangeText={(v) => set({ processName: v })}
          />
        )}
        <View style={styles.row}>
          <View style={styles.flex}>
            <SelectField
              label={t('inspections.periodStart')}
              value={fmt(form.periodStart)}
              icon="calendar"
              onPress={() => setPicker('start')}
            />
          </View>
          <View style={styles.flex}>
            <SelectField
              label={t('inspections.periodEnd')}
              value={fmt(form.periodEnd)}
              icon="calendar"
              onPress={() => setPicker('end')}
            />
          </View>
        </View>
        {!!error && (
          <Text variant="label" tone="danger">
            {error}
          </Text>
        )}
        <Button
          testID="inspection-save"
          label={t('common.save')}
          onPress={submit}
          loading={create.isPending}
          full
          size="lg"
        />
        <Text variant="caption" tone="subtle">
          {t('inspections.membersWebOnly')}
        </Text>
      </View>

      <PickerModal
        visible={picker === 'employee'}
        title={t('inspections.object_employee')}
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
        title={t('inspections.object_department')}
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
      {picker === 'start' && (
        <DatePickerModal
          visible
          value={form.periodStart || undefined}
          title={t('inspections.periodStart')}
          onConfirm={(d) => set({ periodStart: d })}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === 'end' && (
        <DatePickerModal
          visible
          value={form.periodEnd || form.periodStart || undefined}
          title={t('inspections.periodEnd')}
          onConfirm={(d) => set({ periodEnd: d })}
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
