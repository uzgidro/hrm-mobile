// Shtat qatori formasi (v2 StaffPositionModal, mobil qismi): yangi qatorda bo'lim
// + lavozim + reja; tahrirda faqat reja, izoh va SABAB (o'zgarishlar tarixiga
// yoziladi). Vakansiya e'loni maydonlari — web versiyada.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { departmentOptionsQuery, jobPositionOptionsQuery } from '@/utils/employees';
import { fmtUnits } from '@/utils/units';
import { FormInput } from '@/components/FormInput';
import { PickerModal } from '@/components/PickerModal';
import { Button, SelectField, Sheet, Text } from '@/ui';
import type { StaffPosition } from '../api/queries';
import { useSaveStaffRow } from '../api/mutations';
import { buildStaffBody, validateStaff, type StaffForm } from '../utils/staff';

/** `row: null` — yangi qator. Ota faqat ochiqda va `key` bilan mount qiladi. */
export function StaffFormSheet({
  row,
  branchId,
  onClose,
}: {
  row: StaffPosition | null;
  branchId?: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const isEdit = row?.id != null;
  const [form, setForm] = useState<StaffForm>(() => ({
    departmentId: row?.department_id ?? null,
    positionId: row?.job_position_id ?? null,
    units: row ? fmtUnits(row.planned_units) : '1',
    note: row?.note ?? '',
    reason: '',
  }));
  const [names, setNames] = useState({ dept: row?.department_name ?? '', pos: row?.job_position_name ?? '' });
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<null | 'dept' | 'pos'>(null);
  const departments = useQuery({ ...departmentOptionsQuery(branchId), enabled: picker === 'dept' });
  const positions = useQuery({ ...jobPositionOptionsQuery(branchId), enabled: picker === 'pos' });
  const save = useSaveStaffRow();

  const set = (p: Partial<StaffForm>) => {
    setForm((f) => ({ ...f, ...p }));
    setError(null);
  };

  const submit = async () => {
    const err = validateStaff(form, isEdit);
    if (err) return setError(t(`staff.${err}`));
    try {
      await save.mutateAsync({ id: isEdit ? (row!.id as number) : null, body: buildStaffBody(form, isEdit) });
      toast.success(t(isEdit ? 'staff.updated' : 'staff.createdRow'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('staff.saveFailed')));
    }
  };

  const pickList = picker === 'dept' ? departments : positions;

  return (
    <Sheet scroll visible onClose={onClose} title={isEdit ? t('staff.editRow') : t('staff.newRow')}>
      <View style={styles.form}>
        {isEdit ? (
          <Text
            variant="label"
            tone="muted"
          >{`${row?.department_name ?? '—'} · ${row?.job_position_name ?? '—'}`}</Text>
        ) : (
          <>
            <SelectField label={t('staff.department')} value={names.dept} onPress={() => setPicker('dept')} />
            <SelectField label={t('staff.position')} value={names.pos} onPress={() => setPicker('pos')} />
          </>
        )}
        <FormInput
          testID="staff-units"
          label={t('staff.plannedUnits')}
          value={form.units}
          onChangeText={(v) => set({ units: v })}
          keyboardType="decimal-pad"
          required
        />
        <FormInput label={t('staff.note')} value={form.note} onChangeText={(v) => set({ note: v })} multiline />
        <FormInput
          testID="staff-reason"
          label={t('staff.reason')}
          value={form.reason}
          onChangeText={(v) => set({ reason: v })}
        />
        <Text variant="caption" tone="subtle">
          {t('staff.reasonHint')}
        </Text>
        {!!error && (
          <Text variant="label" tone="danger">
            {error}
          </Text>
        )}
        <Button testID="staff-save" label={t('common.save')} onPress={submit} loading={save.isPending} full size="lg" />
        <Text variant="caption" tone="subtle">
          {t('staff.webOnly')}
        </Text>
      </View>
      <PickerModal
        visible={picker != null}
        title={picker === 'dept' ? t('staff.department') : t('staff.position')}
        options={(pickList.data ?? []).map((o) => ({ value: o.id, label: o.name || `#${o.id}` }))}
        loading={pickList.isFetching}
        selected={picker === 'dept' ? form.departmentId : form.positionId}
        onClose={() => setPicker(null)}
        onSelect={(id) => {
          const name = pickList.data?.find((o) => o.id === id)?.name ?? '';
          if (picker === 'dept') {
            set({ departmentId: id });
            setNames((n) => ({ ...n, dept: name }));
          } else {
            set({ positionId: id });
            setNames((n) => ({ ...n, pos: name }));
          }
          setPicker(null);
        }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({ form: { gap: 12, paddingBottom: 8 } });
