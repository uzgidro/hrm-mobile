// v3 Qo'shimcha maydonlar — web v2 `CustomFieldsPage` porti (TZ 4.2.6): kartochkalarga dasturchisiz
// yangi maydon qo'shish. Obyekt turi (xodim, bo'lim, lavozim, shtat qatori, filial) bo'yicha bo'limlar
// (guruhlar) va ulardagi maydonlar; o'chirilganlari ham ko'rinadi (aks holda qayta yoqib bo'lmasdi).
// Huquq — v2 `RequireRole(canAccessSystemAdmin)`: admin hisobi, master-admin, AKT xodimi. Yozish (bo'lim /
// maydon qo'shish, tahrir, o'chirish) — server `require_structure_manager` = `canManageStructure`
// (master-admin, admin hisobi, kadr); AKT xodimi faqat ko'radi.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { canManageStructure, canMonitorTerminals } from '@/utils/roles';
import { Button, Card, EmptyState, ErrorState, PageHeader, Screen, Segmented, Skeleton, Text } from '@/ui';
import { customFieldGroupsQuery, customFieldsKeys } from '../api/queries';
import { ENTITY_TYPES, type CustomField, type CustomFieldGroup } from '../utils/customFields';
import { useTypeLabels } from '../components/CustomFieldsBits';
import { GroupCard } from '../components/GroupCard';
import { FieldSheet, GroupSheet } from '../components/DetailSheets';
import { GroupFormSheet } from '../components/GroupFormSheet';
import { FieldFormSheet } from '../components/FieldFormSheet';

type Open =
  | { kind: 'group'; group: CustomFieldGroup; n: number }
  | { kind: 'groupForm'; group: CustomFieldGroup | null; n: number }
  | { kind: 'field'; group: CustomFieldGroup; field: CustomField; n: number }
  | { kind: 'fieldForm'; group: CustomFieldGroup; field: CustomField | null; n: number }
  | null;

export default function CustomFieldsScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const header = <PageHeader title={t('customFields.title')} subtitle={t('customFields.subtitle')} />;
  if (!canMonitorTerminals(user)) {
    return (
      <Screen>
        {header}
        <Card>
          <EmptyState title={t('customFields.noAccess')} message={t('customFields.noAccessHint')} pose="sad" />
        </Card>
      </Screen>
    );
  }
  return <CustomFieldsBody header={header} canWrite={canManageStructure(user)} />;
}

function CustomFieldsBody({ header, canWrite }: { header: React.ReactNode; canWrite: boolean }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [entity, setEntity] = useState('employee');
  const [open, setOpen] = useState<Open>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { meta, entityLabel } = useTypeLabels();
  const list = useQuery(customFieldGroupsQuery(entity));
  const entities = meta.data?.entity_types?.map((x) => x.value) ?? ENTITY_TYPES;
  const groups = list.data ?? [];

  const refresh = async () => {
    setRefreshing(true);
    try {
      await qc.refetchQueries({ queryKey: customFieldsKeys.all, type: 'active' });
    } finally {
      setRefreshing(false);
    }
  };

  const renderGroups = () => {
    if (list.isError && !list.data) return <ErrorState onRetry={() => list.refetch()} />;
    if (list.isPending) return <Skeleton height={220} />;
    if (!groups.length) {
      return (
        <Card>
          <EmptyState title={t('customFields.empty')} message={t('customFields.emptyHint')} />
        </Card>
      );
    }
    return groups.map((g) => (
      <GroupCard
        key={g.id}
        group={g}
        canWrite={canWrite}
        onGroup={() => setOpen({ kind: 'group', group: g, n: Date.now() })}
        onField={(f) => setOpen({ kind: 'field', group: g, field: f, n: Date.now() })}
      />
    ));
  };

  return (
    <View style={styles.root}>
      <Screen refreshing={refreshing} onRefresh={() => void refresh()} testID="custom-fields-screen">
        {header}
        <View style={styles.controls}>
          <Segmented
            testID="cf-entity"
            value={entity}
            onChange={(v) => setEntity(v)}
            options={entities.map((code) => ({ value: code, label: entityLabel(code) }))}
          />
          <View style={styles.bar}>
            <Text variant="caption" tone="subtle" style={styles.flex} testID="cf-count">
              {list.data ? t('customFields.groupCount', { count: groups.length }) : ''}
            </Text>
            {canWrite && (
              <Button
                testID="cf-group-new"
                label={t('customFields.addGroup')}
                icon="plus"
                size="sm"
                onPress={() => setOpen({ kind: 'groupForm', group: null, n: Date.now() })}
              />
            )}
          </View>
          {!canWrite && (
            <Text variant="caption" tone="subtle" testID="cf-read-only">
              {t('customFields.readOnlyHint')}
            </Text>
          )}
        </View>
        <View style={styles.list}>{renderGroups()}</View>
      </Screen>
      {open?.kind === 'group' && (
        <GroupSheet
          key={open.n}
          group={open.group}
          onAddField={() => setOpen({ kind: 'fieldForm', group: open.group, field: null, n: Date.now() })}
          onEdit={() => setOpen({ kind: 'groupForm', group: open.group, n: Date.now() })}
          onClose={() => setOpen(null)}
        />
      )}
      {open?.kind === 'groupForm' && (
        <GroupFormSheet key={open.n} row={open.group} entityType={entity} onClose={() => setOpen(null)} />
      )}
      {open?.kind === 'field' && (
        <FieldSheet
          key={open.n}
          field={open.field}
          canWrite={canWrite}
          onEdit={() => setOpen({ kind: 'fieldForm', group: open.group, field: open.field, n: Date.now() })}
          onClose={() => setOpen(null)}
        />
      )}
      {open?.kind === 'fieldForm' && (
        <FieldFormSheet key={open.n} group={open.group} field={open.field} onClose={() => setOpen(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  controls: { gap: 10, marginBottom: 12 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 160 },
  list: { gap: 12 },
});
