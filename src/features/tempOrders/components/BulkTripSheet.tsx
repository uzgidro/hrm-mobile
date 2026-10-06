// Ommaviy xizmat safari (2026-10-06): kadr bir nechta xodimni tanlab, bir xil kunlarga «Xizmat
// safari» vaqtinchalik buyrug'ini qo'yadi — har xodimga alohida buyruq (`hr-bulk-create`). Shu
// kunlarda xodimlar telefondan «Keldim» belgilay oladi. O'tmaganlari (filial ko'lami, yopilgan
// davr, takror) natijada sababi bilan ko'rsatiladi — qolganlari baribir yaratiladi.
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
import { PickerModal } from '@/components/PickerModal';
import { DatePickerModal } from '@/components/DatePicker';
import { FormInput } from '@/components/FormInput';
import { SelectedChips } from '@/components/SelectedChips';
import { Badge, Button, SelectField, Sheet, Text } from '@/ui';
import type { Employee } from '@/types';
import { useBulkTrip, type BulkTripResult } from '../api/mutations';
import { useBranchOptions } from '../api/queries';
import { buildBulkTripBody } from '../utils/tempOrder';

const fmt = (d: string) => (d ? dayjs(d).format('DD.MM.YYYY') : '');

export function BulkTripSheet({ branchId, onClose }: { branchId: number | undefined; onClose: () => void }) {
  const { t } = useTranslation();
  const today = dayjs().format('YYYY-MM-DD');
  const [picked, setPicked] = useState<{ value: number; label: string }[]>([]);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [destinationId, setDestinationId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [picker, setPicker] = useState<null | 'employees' | 'destination' | 'start' | 'end'>(null);
  const [empSearch, setEmpSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkTripResult | null>(null);
  const bulk = useBulkTrip();

  const employees = useQuery({
    queryKey: ['temp-orders', 'bulk-employee-picker', empSearch, branchId ?? null],
    queryFn: () =>
      apiClient
        .get(EMPLOYEES_LIST, {
          params: { size: 30, ...(empSearch ? { search: empSearch } : {}), ...(branchId ? { organization_branch_id: branchId } : {}) },
        })
        .then((r) => unwrapList<Employee>(r.data)),
    enabled: picker === 'employees',
  });
  const branches = useBranchOptions(picker === 'destination' || destinationId != null);
  const destinationName = branches.data?.find((b) => b.id === destinationId)?.name ?? '';

  const toggle = (id: number) => {
    setError(null);
    setPicked((cur) => {
      if (cur.some((p) => p.value === id)) return cur.filter((p) => p.value !== id);
      const e = employees.data?.find((x) => x.id === id);
      return [...cur, { value: id, label: e?.legal_name ?? String(id) }];
    });
  };

  const submit = async () => {
    if (!picked.length) return setError(t('checkin.bulk.needEmployees'));
    if (end < start) return setError(t('checkin.bulk.dateOrder'));
    try {
      const res = await bulk.mutateAsync(
        buildBulkTripBody({ employeeIds: picked.map((p) => p.value), start, end, note, destinationBranchId: destinationId }),
      );
      setResult(res);
      toast.success(t('checkin.bulk.result', { created: res.created.length, skipped: res.skipped.length }));
      if (!res.skipped.length) onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  const nameOf = (id: number) => picked.find((p) => p.value === id)?.label ?? `#${id}`;

  return (
    <Sheet visible onClose={onClose} title={t('checkin.bulk.title')}>
      {result ? (
        <View style={styles.form} testID="bulk-trip-result">
          <Text variant="heading">{t('checkin.bulk.result', { created: result.created.length, skipped: result.skipped.length })}</Text>
          {!!result.skipped.length && (
            <>
              <Text variant="label" tone="muted">
                {t('checkin.bulk.skippedTitle')}
              </Text>
              {result.skipped.map((s) => (
                <View key={s.employee_id} style={styles.skip}>
                  <Text variant="label" style={styles.flex} numberOfLines={1}>
                    {nameOf(s.employee_id)}
                  </Text>
                  <Badge label={s.message || t(`errors.${s.code}`, { defaultValue: s.code })} tone="warning" />
                </View>
              ))}
            </>
          )}
          <Button label={t('checkin.done')} full onPress={onClose} />
        </View>
      ) : (
        <View style={styles.form}>
          <Text variant="caption" tone="muted">
            {t('checkin.bulk.hint')}
          </Text>
          <SelectField
            testID="bulk-trip-employees"
            label={t('checkin.bulk.employees')}
            value={picked.length ? t('checkin.bulk.selected', { count: picked.length }) : ''}
            placeholder={t('checkin.bulk.pickEmployees')}
            onPress={() => setPicker('employees')}
          />
          {!!picked.length && <SelectedChips items={picked} onRemove={(id) => setPicked((c) => c.filter((p) => p.value !== id))} />}
          <View style={styles.row}>
            <View style={styles.flex}>
              <SelectField label={t('checkin.bulk.from')} value={fmt(start)} icon="calendar" onPress={() => setPicker('start')} />
            </View>
            <View style={styles.flex}>
              <SelectField label={t('checkin.bulk.to')} value={fmt(end)} icon="calendar" onPress={() => setPicker('end')} />
            </View>
          </View>
          <SelectField
            testID="bulk-trip-destination"
            label={t('checkin.bulk.destination')}
            value={destinationName}
            placeholder={t('checkin.bulk.destinationNone')}
            onPress={() => setPicker('destination')}
          />
          <FormInput label={t('checkin.bulk.note')} value={note} onChangeText={setNote} multiline />
          {!!error && (
            <Text variant="label" tone="danger" testID="bulk-trip-error">
              {error}
            </Text>
          )}
          <Button
            testID="bulk-trip-submit"
            label={t('checkin.bulk.submit')}
            icon="briefcase"
            size="lg"
            full
            loading={bulk.isPending}
            onPress={() => void submit()}
          />
        </View>
      )}

      <PickerModal
        visible={picker === 'employees'}
        title={t('checkin.bulk.pickEmployees')}
        multiple
        options={[
          // Tanlanganlar qidiruv natijasida bo'lmasa ham ro'yxatda qolsin (belgisini olib tashlash mumkin bo'lsin).
          ...picked.filter((p) => !(employees.data ?? []).some((e) => e.id === p.value)),
          ...(employees.data ?? []).map((e) => ({ value: e.id, label: e.legal_name })),
        ]}
        loading={employees.isFetching}
        selected={picked.map((p) => p.value)}
        onClose={() => setPicker(null)}
        onSearchChange={setEmpSearch}
        onSelect={toggle}
        onToggle={toggle}
      />
      <PickerModal
        visible={picker === 'destination'}
        title={t('checkin.bulk.destination')}
        avatars={false}
        options={(branches.data ?? []).map((b) => ({ value: b.id, label: b.name ?? `#${b.id}` }))}
        loading={branches.isFetching}
        selected={destinationId}
        onClose={() => setPicker(null)}
        onSelect={(id) => {
          setDestinationId(id === destinationId ? null : id);
          setPicker(null);
        }}
      />
      {picker === 'start' && (
        <DatePickerModal
          visible
          value={start}
          title={t('checkin.bulk.from')}
          onConfirm={(d) => {
            setStart(d);
            if (end < d) setEnd(d);
          }}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === 'end' && (
        <DatePickerModal visible value={end || start} title={t('checkin.bulk.to')} onConfirm={setEnd} onClose={() => setPicker(null)} />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12, paddingBottom: 8 },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  skip: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
