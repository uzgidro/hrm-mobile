// Vaqtinchalik buyruq qo'shish / tahrirlash formasi (v2 TempOrdersPage modal porti).
// Soatlik (`ruxsat`) — bitta sana + vaqt oralig'i; arxivlovchi turlar — faqat
// boshlanish (ogohlantirish bilan). Tana shakllari sof `tempOrder.ts` da.
import React, { useMemo, useState } from 'react';
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
import { SelectedChips } from '@/components/SelectedChips';
import { DatePickerModal } from '@/components/DatePicker';
import { FormInput } from '@/components/FormInput';
import { Badge, Button, SelectField, Sheet, Text } from '@/ui';
import type { Employee } from '@/types';
import { useBulkTrip, useDeleteTempOrder, useSaveTempOrder, type BulkTripResult } from '../api/mutations';
import { useBranchOptions, type TempOrder } from '../api/queries';
import {
  TEMP_ORDER_TYPES,
  TRIP_TYPE,
  buildBulkTripBody,
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
  const [picker, setPicker] = useState<null | 'employee' | 'type' | 'start' | 'end' | 'destination'>(null);
  const [empSearch, setEmpSearch] = useState('');
  const save = useSaveTempOrder();
  const remove = useDeleteTempOrder();
  const bulk = useBulkTrip();
  // v2 pariteti (6110410): yangi buyruqda tur «Xizmat safari» bo'lsa xodim maydoni KO'P tanlovli,
  // saqlash `hr-bulk-create` orqali; yaratilmaganlar sababi bilan shu varaqda qoladi.
  const [tripPicked, setTripPicked] = useState<{ value: number; label: string }[]>([]);
  const [tripResult, setTripResult] = useState<BulkTripResult | null>(null);

  // Holat boshlang'ich qiymatdan: varaq har ochilishda `key` bilan yangidan mount qilinadi
  // (TempOrdersScreen), shuning uchun effektda qayta to'ldirish shart emas.

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

  const isTrip = form.type === TRIP_TYPE && !isEdit;
  const branches = useBranchOptions(isTrip && (picker === 'destination' || !!form.destinationBranchId));
  const tripLabel = (id: number) =>
    tripPicked.find((p) => p.value === id)?.label ?? employees.data?.find((e) => e.id === id)?.legal_name ?? `#${id}`;
  const toggleTrip = (id: number) => {
    setError(null);
    setTripPicked((cur) =>
      cur.some((p) => p.value === id) ? cur.filter((p) => p.value !== id) : [...cur, { value: id, label: tripLabel(id) }],
    );
  };
  const destinationName = branches.data?.find((b) => b.id === form.destinationBranchId)?.name ?? '';

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

  const submitTrip = async () => {
    const err = validateTempOrder({ ...form, employeeId: tripPicked[0]?.value ?? null }, false);
    if (err) return setError(t(`tempOrders.${err}`));
    try {
      const res = await bulk.mutateAsync(
        buildBulkTripBody({
          employeeIds: tripPicked.map((p) => p.value),
          start: form.start,
          end: form.end || form.start,
          note: form.note,
          destinationBranchId: form.destinationBranchId ?? null,
        }),
      );
      if (!res.skipped.length) {
        toast.success(t('checkin.bulk.result', { created: res.created.length, skipped: 0 }));
        return onClose();
      }
      // Yaratilmaganlar tanlovda qoladi — sababini ko'rib, sanani o'zgartirib qayta saqlash mumkin.
      const skipped = new Set(res.skipped.map((x) => x.employee_id));
      setTripResult({ ...res, skipped: res.skipped.map((x) => ({ ...x, message: x.message ?? null })) });
      setTripPicked((cur) => cur.filter((p) => skipped.has(p.value)));
    } catch (e) {
      setError(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  const submit = async () => {
    if (isTrip) return submitTrip();
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

  // Ilova ichidagi tasdiq (`confirm`) — OS `Alert` web'da hech narsa ko'rsatmasdi.
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
        {isTrip ? (
          <>
            <SelectField
              testID="temp-order-employee"
              label={t('checkin.bulk.employees')}
              value={tripPicked.length ? t('checkin.bulk.selected', { count: tripPicked.length }) : ''}
              placeholder={t('checkin.bulk.pickEmployees')}
              onPress={() => setPicker('employee')}
            />
            {!!tripPicked.length && <SelectedChips items={tripPicked} onRemove={toggleTrip} />}
          </>
        ) : (
          <SelectField
            testID="temp-order-employee"
            label={t('tempOrders.employee')}
            value={employeeName}
            placeholder={t('tempOrders.pickEmployee')}
            onPress={() => setPicker('employee')}
            disabled={isEdit}
          />
        )}
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
        {isTrip && (
          <>
            <Text variant="caption" tone="muted">
              {t('checkin.bulk.hint')}
            </Text>
            <SelectField
              testID="temp-order-destination"
              label={t('checkin.bulk.destination')}
              value={destinationName}
              placeholder={t('checkin.bulk.destinationNone')}
              onPress={() => setPicker('destination')}
            />
          </>
        )}
        {isEdit && !!row?.destination_branch?.name && (
          <SelectField label={t('checkin.bulk.destination')} value={row.destination_branch.name} disabled onPress={() => {}} />
        )}
        <FormInput label={t('tempOrders.note')} value={form.note} onChangeText={(v) => set({ note: v })} multiline />
        {!!tripResult && (
          <View style={styles.result} testID="bulk-trip-result">
            <Text variant="label">
              {t('checkin.bulk.result', { created: tripResult.created.length, skipped: tripResult.skipped.length })}
            </Text>
            {tripResult.skipped.map((x) => (
              <View key={x.employee_id} style={styles.skip}>
                <Text variant="caption" style={styles.flex} numberOfLines={1}>
                  {tripLabel(x.employee_id)}
                </Text>
                <Badge label={x.message || t(`errors.${x.code}`, { defaultValue: x.code })} tone="warning" />
              </View>
            ))}
          </View>
        )}
        {!!error && (
          <Text variant="label" tone="danger">
            {error}
          </Text>
        )}
        <Button
          testID="temp-order-save"
          label={isTrip && tripPicked.length > 1 ? `${t('checkin.bulk.submit')} · ${tripPicked.length}` : t('common.save')}
          onPress={submit}
          loading={save.isPending || bulk.isPending}
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
        options={[
          ...(isTrip ? tripPicked.filter((p) => !(employees.data ?? []).some((e) => e.id === p.value)) : []),
          ...(employees.data ?? []).map((e) => ({ value: e.id, label: e.legal_name })),
        ]}
        loading={employees.isFetching}
        multiple={isTrip}
        selected={isTrip ? tripPicked.map((p) => p.value) : form.employeeId}
        onToggle={toggleTrip}
        onClose={() => setPicker(null)}
        onSearchChange={setEmpSearch}
        onSelect={(id) => {
          if (isTrip) return toggleTrip(id);
          const emp = employees.data?.find((e) => e.id === id);
          set({ employeeId: id });
          setEmployeeName(emp?.legal_name ?? '');
          setPicker(null);
        }}
      />
      <PickerModal
        visible={picker === 'type'}
        title={t('tempOrders.type')}
        avatars={false}
        options={typeOptions}
        selected={TEMP_ORDER_TYPES.indexOf(form.type as (typeof TEMP_ORDER_TYPES)[number])}
        onClose={() => setPicker(null)}
        onSelect={(i) => {
          const next = TEMP_ORDER_TYPES[i];
          if (next === TRIP_TYPE && !isEdit && !tripPicked.length && form.employeeId) {
            setTripPicked([{ value: form.employeeId, label: employeeName || `#${form.employeeId}` }]);
          }
          setTripResult(null);
          set({ type: next });
          setPicker(null);
        }}
      />
      <PickerModal
        visible={picker === 'destination'}
        title={t('checkin.bulk.destination')}
        avatars={false}
        options={(branches.data ?? []).map((b) => ({ value: b.id, label: b.name ?? `#${b.id}` }))}
        loading={branches.isFetching}
        selected={form.destinationBranchId ?? null}
        onClose={() => setPicker(null)}
        onSelect={(id) => {
          set({ destinationBranchId: id === form.destinationBranchId ? null : id });
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
  result: { gap: 6 },
  skip: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
