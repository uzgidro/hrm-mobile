// Bo'lim / lavozim yaratish-tahrirlash formasi (v2 StructureModal). `target`:
// undefined — yopiq; `{ kind, row: null }` — yangi; `{ kind, row }` — tahrir.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useEmployeeListPicker } from '@/lib/useInfinitePicker';
import { useTranslation } from 'react-i18next';

import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { FormInput } from '@/components/FormInput';
import { PickerModal } from '@/components/PickerModal';
import { Button, Chip, SelectField, Sheet, Text } from '@/ui';

import { JOB_CATEGORIES, branchesQuery, type Department, type JobPosition } from '../api/queries';
import { useSaveDepartment, useSavePosition } from '../api/mutations';
import {
  buildDepartmentBody,
  buildPositionBody,
  deptFormFrom,
  posFormFrom,
  validateStructure,
  type DeptForm,
  type PosForm,
} from '../utils/structureForm';

export type FormTarget = { kind: 'department'; row: Department | null } | { kind: 'position'; row: JobPosition | null };

/** Har ochilishda yangi kalit — forma holati qatordan qayta quriladi (effect'siz). */
export const formTargetKey = (t: FormTarget) => `${t.kind}-${t.row?.id ?? 'new'}`;

export function StructureFormSheet({
  target,
  defaultBranch,
  onClose,
}: {
  target: FormTarget;
  defaultBranch: number | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const isDept = target.kind === 'department';
  const isEdit = !!target.row;
  const [dept, setDept] = useState<DeptForm>(() =>
    deptFormFrom(target.kind === 'department' ? target.row : null, defaultBranch),
  );
  const [pos, setPos] = useState<PosForm>(() =>
    posFormFrom(target.kind === 'position' ? target.row : null, defaultBranch),
  );
  const [headNames, setHeadNames] = useState<Record<number, string>>(() =>
    target.kind === 'department'
      ? Object.fromEntries((target.row?.heads ?? []).map((h) => [h.id, h.legal_name ?? `#${h.id}`]))
      : {},
  );
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<null | 'branch' | 'heads' | 'category'>(null);
  const [empSearch, setEmpSearch] = useState('');
  const saveDept = useSaveDepartment();
  const savePos = useSavePosition();

  const branches = useQuery({ ...branchesQuery(), enabled: true });
  const branchId = isDept ? dept.branchId : pos.branchId;
  // Sahifalab: ro'yxat oxiriga yetganda keyingi sahifa (ilgari faqat birinchi 30 xodim edi).
  const employees = useEmployeeListPicker({
    key: 'structure',
    search: empSearch,
    enabled: picker === 'heads',
    params: branchId ? { organization_branch_id: branchId } : undefined,
  });

  const setD = (p: Partial<DeptForm>) => {
    setDept((f) => ({ ...f, ...p }));
    setError(null);
  };
  const setP = (p: Partial<PosForm>) => {
    setPos((f) => ({ ...f, ...p }));
    setError(null);
  };

  const submit = async () => {
    const err = isDept
      ? validateStructure({ name: dept.name, branchId: dept.branchId, num: dept.index })
      : validateStructure({ name: pos.name, branchId: pos.branchId, num: pos.razryad });
    if (err) return setError(t(`structure.${err}`));
    try {
      const id = target.row?.id ?? null;
      if (isDept) await saveDept.mutateAsync({ id, body: buildDepartmentBody(dept, isEdit) });
      else await savePos.mutateAsync({ id, body: buildPositionBody(pos) });
      toast.success(t(isEdit ? 'structure.updated' : 'structure.created'));
      onClose();
    } catch (e) {
      // Server jumlasi (masalan «bu filialda 01 kodli bo'lim bor») forma ichida.
      setError(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  const title = isDept
    ? t(isEdit ? 'structure.editDept' : 'structure.createDept')
    : t(isEdit ? 'structure.editPos' : 'structure.createPos');
  const branchName = branches.data?.find((b) => b.id === branchId)?.name ?? '';
  const categoryOptions = JOB_CATEGORIES.map((c, i) => ({ value: i + 1, label: t(`structure.cat_${c}`) }));

  return (
    <Sheet scroll visible onClose={onClose} title={title}>
      <View style={styles.form}>
        <FormInput
          testID="structure-name"
          label={t('structure.fieldName')}
          value={isDept ? dept.name : pos.name}
          onChangeText={(v) => (isDept ? setD({ name: v }) : setP({ name: v }))}
          required
        />
        <FormInput
          label={isDept ? t('structure.fieldIndex') : t('structure.fieldRazryad')}
          value={isDept ? dept.index : pos.razryad}
          onChangeText={(v) => (isDept ? setD({ index: v }) : setP({ razryad: v }))}
          keyboardType="number-pad"
        />
        <SelectField
          label={t('structure.fieldBranch')}
          value={branchName}
          icon="building"
          onPress={() => setPicker('branch')}
        />
        {isDept ? (
          <>
            <FormInput label={t('structure.fieldCode')} value={dept.code} onChangeText={(v) => setD({ code: v })} />
            <Text variant="caption" tone="subtle">
              {t('structure.fieldCodeHint')}
            </Text>
            {isEdit && (
              <>
                <FormInput
                  label={t('structure.fieldChangeReason')}
                  value={dept.changeReason}
                  onChangeText={(v) => setD({ changeReason: v })}
                />
                <Text variant="caption" tone="subtle">
                  {t('structure.fieldChangeReasonHint')}
                </Text>
              </>
            )}
            <SelectField
              label={t('structure.fieldHeads')}
              value={dept.headIds.map((id) => headNames[id] ?? `#${id}`).join(', ')}
              placeholder={t('structure.pickHeads')}
              icon="users"
              onPress={() => setPicker('heads')}
            />
            <View style={styles.flags}>
              <Chip
                label={t('structure.fieldSecretariat')}
                selected={dept.secretariat}
                onPress={() => setD({ secretariat: !dept.secretariat })}
              />
              <Chip label={t('structure.fieldIjro')} selected={dept.ijro} onPress={() => setD({ ijro: !dept.ijro })} />
            </View>
          </>
        ) : (
          <SelectField
            label={t('structure.category')}
            value={pos.category ? t(`structure.cat_${pos.category}`, { defaultValue: pos.category }) : ''}
            onPress={() => setPicker('category')}
          />
        )}
        {!!error && (
          <Text variant="label" tone="danger">
            {error}
          </Text>
        )}
        <Button
          testID="structure-save"
          label={t('common.save')}
          onPress={submit}
          loading={saveDept.isPending || savePos.isPending}
          full
          size="lg"
        />
      </View>

      <PickerModal
        visible={picker === 'branch'}
        title={t('structure.fieldBranch')}
        options={(branches.data ?? []).map((b) => ({ value: b.id, label: b.name ?? `#${b.id}` }))}
        loading={branches.isFetching}
        selected={branchId}
        onClose={() => setPicker(null)}
        onSelect={(id) => {
          if (isDept) setD({ branchId: id });
          else setP({ branchId: id });
          setPicker(null);
        }}
      />
      <PickerModal
        onEndReached={employees.onEndReached}
        loadingMore={employees.loadingMore}
        visible={picker === 'heads'}
        title={t('structure.pickHeads')}
        multiple
        options={(employees.data ?? []).map((e) => ({
          value: e.id,
          label: e.legal_name,
          subLabel: e.job_position?.name,
        }))}
        loading={employees.isFetching}
        selected={dept.headIds}
        onClose={() => setPicker(null)}
        onSearchChange={setEmpSearch}
        onSelect={() => undefined}
        onToggle={(id) => {
          const name = employees.data?.find((e) => e.id === id)?.legal_name;
          if (name) setHeadNames((m) => ({ ...m, [id]: name }));
          setD({ headIds: dept.headIds.includes(id) ? dept.headIds.filter((x) => x !== id) : [...dept.headIds, id] });
        }}
      />
      <PickerModal
        visible={picker === 'category'}
        title={t('structure.category')}
        options={categoryOptions}
        selected={pos.category ? JOB_CATEGORIES.indexOf(pos.category as never) + 1 : null}
        onClose={() => setPicker(null)}
        onSelect={(v) => {
          setP({ category: JOB_CATEGORIES[v - 1] ?? '' });
          setPicker(null);
        }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12, paddingBottom: 8 },
  flags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
