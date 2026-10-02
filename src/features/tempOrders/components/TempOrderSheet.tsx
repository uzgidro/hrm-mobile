// Vaqtinchalik buyruq qo'shish / tahrirlash formasi (v2 TempOrdersPage modal porti).
// Soatlik (`ruxsat`) — bitta sana + vaqt oralig'i; arxivlovchi turlar — faqat
// boshlanish (ogohlantirish bilan). Tana shakllari sof `tempOrder.ts` da.
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import { EMPLOYEES_LIST } from '@/api/urls';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { confirm } from '@/lib/confirm';
import { PickerModal } from '@/components/PickerModal';
import { DatePickerModal } from '@/components/DatePicker';
import { FormInput } from '@/components/FormInput';
import { Button, SelectField, Sheet, Text } from '@/ui';
import type { Employee } from '@/types';
import { useDeleteTempOrder, useSaveTempOrder } from '../api/mutations';
import type { TempOrder } from '../api/queries';
import {
  TEMP_ORDER_TYPES,
  buildCreateBody,
  buildUpdateBody,
  isArchiving,
  isHourly,
  validateTempOrder,
  type TempOrderForm,
} from '../utils/tempOrder';

/** Ko'rinish: DD.MM.YYYY (ichki qiymat — YYYY-MM-DD). */
const fmt = (d: string) => (d ? dayjs(d).format('DD.MM.YYYY') : '');

function initialForm(row: TempOrder | null): TempOrderForm {
  return {
    employeeId: row?.employee_id ?? row?.employee?.id ?? null,
    type: row?.type ?? 'kasal',
    start: row?.start_date ? dayjs(row.start_date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
    end: row?.end_date ? dayjs(row.end_date).format('YYYY-MM-DD') : '',
    startTime: row?.start_date ? dayjs(row.start_date).format('HH:mm') : '09:00',
    endTime: row?.end_date ? dayjs(row.end_date).format('HH:mm') : '13:00',
    note: row?.description ?? '',
  };
}

export function TempOrderSheet({
  visible,
  row,
  branchId,
  onClose,
}: {
  visible: boolean;
  /** null — yangi buyruq. */
  row: TempOrder | null;
  branchId: number | undefined;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const isEdit = !!row;
  const [form, setForm] = useState<TempOrderForm>(() => initialForm(row));
  const [employeeName, setEmployeeName] = useState(row?.employee?.legal_name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<null | 'employee' | 'type' | 'start' | 'end'>(null);
  const [empSearch, setEmpSearch] = useState('');
  const save = useSaveTempOrder();
  const remove = useDeleteTempOrder();

  useEffect(() => {
    if (visible) {
      setForm(initialForm(row));
      setEmployeeName(row?.employee?.legal_name ?? '');
      setError(null);
    }
  }, [visible, row]);

  const employees = useQuery({
    queryKey: ['temp-orders', 'employee-picker', empSearch, branchId ?? null],
    queryFn: () =>
      apiClient
        .get(EMPLOYEES_LIST, {
          params: {
            size: 30,
            ...(empSearch ? { search: empSearch } : {}),
            ...(branchId ? { organization_branch_id: branchId } : {}),
          },
        })
        .then((r) => unwrapList<Employee>(r.data)),
    enabled: picker === 'employee',
  });

  const typeOptions = useMemo(
    () =>
      TEMP_ORDER_TYPES.map((code, i) => ({
        value: i,
        label: t(`tempOrders.type_${code}`),
      })),
    [t],
  );

  const set = (patch: Partial<TempOrderForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    setError(null);
  };

  const submit = async () => {
    const err = validateTempOrder(form, isEdit);
    if (err) return setError(t(`tempOrders.${err}`));
    try {
      await save.mutateAsync({
        id: row?.id ?? null,
        body: isEdit ? buildUpdateBody(form) : buildCreateBody(form),
      });
      toast.success(t(isEdit ? 'tempOrders.updated' : 'tempOrders.created'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  // Ilova ichidagi tasdiq (`confirm`) — `Alert.alert` web'da hech narsa ko'rsatmasdi.
  const confirmDelete = async () => {
    if (!row) return;
    const ok = await confirm({
      title: t('tempOrders.remove'),
      message: t('tempOrders.removeConfirm', { name: row.employee?.legal_name ?? '' }),
      confirmLabel: t('tempOrders.remove'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(row.id);
      toast.success(t('tempOrders.removed'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  const hourly = isHourly(form.type);
  const archiving = isArchiving(form.type);

  return (
    <Sheet visible={visible} onClose={onClose} title={isEdit ? t('tempOrders.editTitle') : t('tempOrders.add')}>
      <View style={styles.form}>
        <SelectField
          testID="temp-order-employee"
          label={t('tempOrders.employee')}
          value={employeeName}
          placeholder={t('tempOrders.pickEmployee')}
          onPress={() => setPicker('employee')}
          disabled={isEdit}
        />
        <SelectField
          label={t('tempOrders.type')}
          value={t(`tempOrders.type_${form.type}`)}
          onPress={() => setPicker('type')}
        />
        {archiving && (
          <Text variant="caption" tone="danger">
            {t('tempOrders.archiveWarning')}
          </Text>
        )}
        {hourly && (
          <Text variant="caption" tone="muted">
            {t('tempOrders.hourlyHint')}
          </Text>
        )}
        <View style={styles.row}>
          <View style={styles.flex}>
            <SelectField
              label={t('tempOrders.dateFrom')}
              value={fmt(form.start)}
              icon="calendar"
              onPress={() => setPicker('start')}
            />
          </View>
          {!archiving && !hourly && (
            <View style={styles.flex}>
              <SelectField
                label={t('tempOrders.dateTo')}
                value={fmt(form.end)}
                icon="calendar"
                onPress={() => setPicker('end')}
              />
            </View>
          )}
        </View>
        {hourly && (
          <View style={styles.row}>
            <View style={styles.flex}>
              <FormInput
                label={t('tempOrders.timeFrom')}
                value={form.startTime}
                onChangeText={(v) => set({ startTime: v })}
                placeholder="09:00"
              />
            </View>
            <View style={styles.flex}>
              <FormInput
                label={t('tempOrders.timeTo')}
                value={form.endTime}
                onChangeText={(v) => set({ endTime: v })}
                placeholder="13:00"
              />
            </View>
          </View>
        )}
        <FormInput label={t('tempOrders.note')} value={form.note} onChangeText={(v) => set({ note: v })} multiline />
        {!!error && (
          <Text variant="label" tone="danger">
            {error}
          </Text>
        )}
        <Button
          testID="temp-order-save"
          label={t('common.save')}
          onPress={submit}
          loading={save.isPending}
          full
          size="lg"
        />
        {isEdit && (
          <Button
            testID="temp-order-delete"
            label={t('tempOrders.remove')}
            variant="ghost"
            onPress={() => void confirmDelete()}
            full
          />
        )}
      </View>

      <PickerModal
        visible={picker === 'employee'}
        title={t('tempOrders.pickEmployee')}
        options={(employees.data ?? []).map((e) => ({
          value: e.id,
          label: e.legal_name,
        }))}
        loading={employees.isFetching}
        selected={form.employeeId}
        onClose={() => setPicker(null)}
        onSearchChange={setEmpSearch}
        onSelect={(id) => {
          const emp = employees.data?.find((e) => e.id === id);
          set({ employeeId: id });
          setEmployeeName(emp?.legal_name ?? '');
          setPicker(null);
        }}
      />
      <PickerModal
        visible={picker === 'type'}
        title={t('tempOrders.type')}
        options={typeOptions}
        selected={TEMP_ORDER_TYPES.indexOf(form.type as (typeof TEMP_ORDER_TYPES)[number])}
        onClose={() => setPicker(null)}
        onSelect={(i) => {
          set({ type: TEMP_ORDER_TYPES[i] });
          setPicker(null);
        }}
      />
      {/* Faqat ochiqda mount — DatePickerModal boshlang'ich oyni mount paytida oladi,
          aks holda tahrirda boshqa yozuvning (yoki bugungi) sanasidan ochilardi. */}
      {picker === 'start' && (
        <DatePickerModal
          visible
          value={form.start}
          title={t('tempOrders.dateFrom')}
          onConfirm={(d) => set({ start: d })}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === 'end' && (
        <DatePickerModal
          visible
          value={form.end || form.start}
          title={t('tempOrders.dateTo')}
          onConfirm={(d) => set({ end: d })}
          onClose={() => setPicker(null)}
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12, paddingBottom: 8 },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
