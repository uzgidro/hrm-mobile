// «Haydovchilar» tabi (v2 DriverScopeTab) — kim haydovchi hisoblanadi: bo'lim, lavozim yoki
// aniq xodim. Bitta GLOBAL sozlama (mashina biriktirishdagi tanlagich va hamshira ko'rigi
// ro'yxati shundan) — faqat sayt bosh admini. Bo'sh ro'yxat «hech kim» EMAS: server uni
// «avtopark filialining hamma xodimi» deb o'qiydi. Qo'shish ham, olib tashlash ham tasdiq bilan.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { PickerModal } from '@/components/PickerModal';
import { departmentOptionsQuery, jobPositionOptionsQuery } from '@/utils/employees';
import { useEmployeeOptionsPicker } from '@/lib/useInfinitePicker';
import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Card, EmptyState, ErrorState, IconButton, Segmented, SelectField, Skeleton, Text } from '@/ui';
import { driverScopesQuery } from '../api/queries';
import { useAddDriverScope, useRemoveDriverScope } from '../api/mutations';
import { SCOPE_KINDS, scopeKindKey, type DriverScope, type ScopeKind } from '../utils/vehicles';

export function DriverScopesTab({ fleetBranchId }: { fleetBranchId: number | null }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const scopes = useQuery(driverScopesQuery(true));
  const add = useAddDriverScope();
  const remove = useRemoveDriverScope();
  const [kind, setKind] = useState<ScopeKind>('department');
  const [picking, setPicking] = useState(false);
  const [empSearch, setEmpSearch] = useState('');
  const branch = fleetBranchId ?? undefined;
  const departments = useQuery({ ...departmentOptionsQuery(branch), enabled: picking && kind === 'department' });
  const positions = useQuery({ ...jobPositionOptionsQuery(branch), enabled: picking && kind === 'job_position' });
  const employees = useEmployeeOptionsPicker(empSearch, { enabled: picking && kind === 'employee' });

  const options =
    kind === 'employee'
      ? employees.rows.map((e) => ({ value: e.id, label: e.legal_name || `#${e.id}`, photo: e.photo_path }))
      : ((kind === 'department' ? departments.data : positions.data) ?? []).map((o) => ({
          value: o.id,
          label: o.name || `#${o.id}`,
        }));
  const loading =
    kind === 'employee' ? employees.loading : kind === 'department' ? departments.isFetching : positions.isFetching;

  // Tanlash huquqni darhol beradi — avval so'raymiz (v2).
  const onPick = async (id: number) => {
    setPicking(false);
    const label = options.find((o) => o.value === id)?.label ?? '';
    const ok = await confirm({
      title: t('vehicles.scopePick'),
      message: `${t(scopeKindKey(kind))}: ${label}`,
      confirmLabel: t('common.add'),
      cancelLabel: t('common.cancel'),
    });
    if (!ok) return;
    try {
      await add.mutateAsync({ scope_type: kind, scope_id: id });
      toast.success(t('vehicles.scopeAdded'));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  const onRemove = async (s: DriverScope) => {
    const ok = await confirm({
      title: t('vehicles.scopeRemoveTitle'),
      message: t('vehicles.scopeRemoveConfirm', { name: s.label ?? '' }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(s.id);
      toast.success(t('vehicles.scopeRemoved'));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  const rows = scopes.data ?? [];
  return (
    <View style={styles.wrap}>
      <Text variant="caption" tone="subtle">
        {t('vehicles.scopeHint')}
      </Text>
      <Card>
        <View style={styles.panel}>
          <Text variant="label" tone="muted">
            {t('vehicles.scopeKind')}
          </Text>
          <Segmented<ScopeKind>
            testID="vehicles-scope-kind"
            options={SCOPE_KINDS.map((k) => ({ value: k, label: t(scopeKindKey(k)) }))}
            value={kind}
            onChange={setKind}
          />
          <SelectField
            testID="vehicles-scope-pick"
            label={t('vehicles.scopePick')}
            value=""
            placeholder={t('vehicles.pick')}
            icon="plus"
            onPress={() => setPicking(true)}
          />
        </View>
      </Card>
      <Card>
        {scopes.isError ? (
          <ErrorState onRetry={() => scopes.refetch()} />
        ) : scopes.isPending ? (
          <Skeleton height={140} />
        ) : rows.length === 0 ? (
          <EmptyState title={t('vehicles.scopeEmpty')} message={t('vehicles.scopeEmptyHint')} />
        ) : (
          rows.map((s) => (
            <View key={s.id} testID={`vehicle-scope-${s.id}`} style={[styles.row, { borderBottomColor: c.border }]}>
              <Badge label={t(scopeKindKey(s.scope_type))} />
              <View style={styles.flex}>
                <Text variant="body" numberOfLines={1}>
                  {s.label || `#${s.scope_id}`}
                </Text>
                {!!s.sub_label && (
                  <Text variant="caption" tone="subtle" numberOfLines={1}>
                    {s.sub_label}
                  </Text>
                )}
              </View>
              <IconButton
                testID={`vehicle-scope-remove-${s.id}`}
                icon="trash"
                accessibilityLabel={t('common.delete')}
                onPress={() => void onRemove(s)}
              />
            </View>
          ))
        )}
      </Card>
      {picking && (
        <PickerModal
          visible
          title={t(scopeKindKey(kind))}
          avatars={kind === 'employee'}
          options={options}
          loading={loading}
          selected={null}
          onClose={() => setPicking(false)}
          onSelect={(id) => void onPick(id)}
          onSearchChange={kind === 'employee' ? setEmpSearch : undefined}
          onEndReached={kind === 'employee' ? employees.onEndReached : undefined}
          loadingMore={kind === 'employee' && employees.loadingMore}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  panel: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  flex: { flex: 1, minWidth: 0 },
});
