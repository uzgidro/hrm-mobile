// v3 Mas'ullar — web v2 `ResponsiblesPage` porti: «Ijro» modulini kim yuritadi —
// bo'lim, lavozim yoki aniq xodim. Qo'shish modul huquqini darhol beradi, shuning
// uchun avval tasdiq so'raladi. Sahifa faqat HR va bosh admin uchun (v2 RequireRole).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useEmployeeListPicker } from '@/lib/useInfinitePicker';
import { useTranslation } from 'react-i18next';

import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { confirm } from '@/lib/confirm';
import { useAuthStore } from '@/store/authStore';
import { isHR, isSiteMasterAdmin } from '@/utils/roles';
import { resolveEmployeeBranchId } from '@/utils/branch';
import { departmentOptionsQuery, jobPositionOptionsQuery } from '@/utils/employees';
import { PickerModal } from '@/components/PickerModal';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  IconButton,
  ListRow,
  PageHeader,
  Screen,
  Segmented,
  Skeleton,
  Text,
} from '@/ui';

import { RESPONSIBLE_SCOPES, responsiblesQuery, type Responsible, type ResponsibleScope } from '../api/queries';
import { useAddResponsible, useRemoveResponsible } from '../api/mutations';

const MODULE = 'ijro';
const SCOPE_LABEL: Record<ResponsibleScope, string> = {
  department: 'responsibles.scopeDepartment',
  job_position: 'responsibles.scopePosition',
  employee: 'responsibles.scopeEmployee',
};
const SCOPE_HINT: Record<ResponsibleScope, string> = {
  department: 'responsibles.hintDepartment',
  job_position: 'responsibles.hintPosition',
  employee: 'responsibles.hintEmployee',
};

export default function ResponsiblesScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const allowed = isHR(user) || isSiteMasterAdmin(user);
  const branchId = resolveEmployeeBranchId(user?.employee);
  const [scope, setScope] = useState<ResponsibleScope>('department');
  const [picking, setPicking] = useState(false);
  const [empSearch, setEmpSearch] = useState('');
  const list = useQuery(responsiblesQuery(MODULE, allowed));
  const departments = useQuery({ ...departmentOptionsQuery(branchId), enabled: picking && scope === 'department' });
  const positions = useQuery({ ...jobPositionOptionsQuery(branchId), enabled: picking && scope === 'job_position' });
  // Sahifalab: ro'yxat oxiriga yetganda keyingi sahifa (ilgari faqat birinchi 30 xodim edi).
  const employees = useEmployeeListPicker({
    key: 'responsibles',
    search: empSearch,
    enabled: picking && scope === 'employee',
  });
  const add = useAddResponsible();
  const remove = useRemoveResponsible();

  if (!allowed) {
    return (
      <Screen>
        <PageHeader title={t('responsibles.title')} />
        <EmptyState title={t('responsibles.noAccess')} pose="sad" />
      </Screen>
    );
  }

  const options =
    scope === 'employee'
      ? (employees.data ?? []).map((e) => ({ value: e.id, label: e.legal_name, subLabel: e.job_position?.name }))
      : ((scope === 'department' ? departments.data : positions.data) ?? []).map((o) => ({
          value: o.id,
          label: o.name || `#${o.id}`,
        }));
  const pickerLoading =
    scope === 'employee'
      ? employees.isFetching
      : scope === 'department'
        ? departments.isFetching
        : positions.isFetching;

  const onPick = async (id: number) => {
    setPicking(false);
    const subject = options.find((o) => o.value === id)?.label ?? '';
    const ok = await confirm({
      title: t('responsibles.addTitle'),
      message: t('responsibles.addConfirm', { name: subject }),
      confirmLabel: t('common.add'),
      cancelLabel: t('common.cancel'),
    });
    if (!ok) return;
    try {
      await add.mutateAsync({ module: MODULE, scope_type: scope, scope_id: id });
      toast.success(t('responsibles.added'));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  const onRemove = async (r: Responsible) => {
    const ok = await confirm({
      title: t('responsibles.removeTitle'),
      message: t('responsibles.removeConfirm', { name: r.label ?? '' }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(r.id);
      toast.success(t('responsibles.removed'));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  const rows = list.data ?? [];
  const scopeOf = (s?: string | null) =>
    RESPONSIBLE_SCOPES.includes(s as ResponsibleScope) ? (s as ResponsibleScope) : 'department';

  return (
    <Screen refreshing={list.isRefetching} onRefresh={() => void list.refetch()}>
      <PageHeader title={t('responsibles.title')} subtitle={t('responsibles.subtitle')} />
      <Card>
        <View style={styles.form}>
          <Text variant="label" tone="muted">
            {t('responsibles.scopeKind')}
          </Text>
          <Segmented<ResponsibleScope>
            options={RESPONSIBLE_SCOPES.map((s) => ({ value: s, label: t(SCOPE_LABEL[s]) }))}
            value={scope}
            onChange={setScope}
          />
          <Text variant="caption" tone="subtle">
            {t(SCOPE_HINT[scope])}
          </Text>
          <Button
            testID="responsible-add"
            label={t('responsibles.pick')}
            icon="plus"
            onPress={() => setPicking(true)}
            loading={add.isPending}
            full
          />
        </View>
      </Card>
      <View style={styles.gap} />
      <Card>
        {list.isError ? (
          <ErrorState onRetry={() => list.refetch()} />
        ) : list.isPending ? (
          <Skeleton height={140} />
        ) : rows.length === 0 ? (
          <EmptyState title={t('responsibles.empty')} message={t('responsibles.emptyHint')} />
        ) : (
          rows.map((r) => (
            <ListRow
              key={r.id}
              title={r.label || `#${r.scope_id}`}
              subtitle={r.sub_label || undefined}
              left={
                <View style={styles.scope}>
                  <Badge label={t(SCOPE_LABEL[scopeOf(r.scope_type)])} />
                </View>
              }
              right={
                <IconButton
                  testID={`responsible-remove-${r.id}`}
                  icon="trash"
                  accessibilityLabel={t('common.delete')}
                  onPress={() => void onRemove(r)}
                />
              }
            />
          ))
        )}
      </Card>
      <Text variant="caption" tone="subtle" style={styles.note}>
        {t('responsibles.driverNote')}
      </Text>

      <PickerModal
        visible={picking}
        title={t(SCOPE_LABEL[scope])}
        options={options}
        loading={pickerLoading}
        selected={null}
        onClose={() => setPicking(false)}
        onSearchChange={scope === 'employee' ? setEmpSearch : undefined}
        onEndReached={scope === 'employee' ? employees.onEndReached : undefined}
        loadingMore={scope === 'employee' && employees.loadingMore}
        onSelect={(id) => void onPick(id)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Turli uzunlikdagi badge'lar sarlavhani surmasin.
  scope: { width: 78 },
  form: { gap: 10 },
  gap: { height: 12 },
  note: { marginTop: 12 },
});
