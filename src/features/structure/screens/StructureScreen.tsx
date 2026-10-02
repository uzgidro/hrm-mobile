// v3 Tuzilma — web v2 `StructurePage` porti: Bo'limlar · Lavozimlar · Sxema.
// Ko'rish hammaga ochiq (Verifix'da tuzilma hisoboti barchaga berilgan); yozish —
// `canManageStructure` (HR, bosh admin, admin akkaunt). Ommaviy o'chirish,
// lavozim nomlash qoidasi va sxema muharriri — web'da.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { resolveEmployeeBranchId } from '@/utils/branch';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { PickerModal } from '@/components/PickerModal';
import {
  Avatar,
  Badge,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  ListRow,
  PageHeader,
  Pager,
  Screen,
  SearchField,
  Segmented,
  SelectField,
  Skeleton,
} from '@/ui';
import {
  JOB_CATEGORIES,
  branchesQuery,
  departmentsPageQuery,
  hierarchyQuery,
  positionsPageQuery,
  type Department,
  type JobPosition,
} from '../api/queries';
import { DepartmentDetail, PositionDetail } from '../components/DetailSheet';
import { OrgTree } from '../components/OrgTree';

type Tab = 'departments' | 'positions' | 'chart';

export default function StructureScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>('departments');
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [includeClosed, setIncludeClosed] = useState(false);
  const [category, setCategory] = useState('');
  const [dept, setDept] = useState<Department | null>(null);
  const [pos, setPos] = useState<JobPosition | null>(null);
  const [branchId, setBranchId] = useState<number | null>(resolveEmployeeBranchId(user?.employee) ?? null);
  const [pickBranch, setPickBranch] = useState(false);

  const depts = useQuery({ ...departmentsPageQuery({ search: debounced, page, includeClosed }) });
  const positions = useQuery({ ...positionsPageQuery({ search: debounced, page, category }), enabled: tab === 'positions' });
  const branches = useQuery({ ...branchesQuery(), enabled: tab === 'chart' || pickBranch });
  const effectiveBranch = branchId ?? branches.data?.[0]?.id ?? null;
  const tree = useQuery({ ...hierarchyQuery(effectiveBranch), enabled: tab === 'chart' && !!effectiveBranch });
  const branchName = branches.data?.find((b) => b.id === effectiveBranch)?.name ?? '';

  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };
  const active = tab === 'positions' ? positions : depts;
  const data = active.data;

  return (
    <Screen refreshing={active.isRefetching} onRefresh={() => void (tab === 'chart' ? tree.refetch() : active.refetch())}>
      <PageHeader title={t('structure.title')} subtitle={t('structure.subtitle')} />
      <View style={styles.filters}>
        <Segmented<Tab>
          options={[
            { value: 'departments', label: t('structure.tabDepartments'), count: depts.data?.total },
            { value: 'positions', label: t('structure.tabPositions'), count: positions.data?.total },
            { value: 'chart', label: t('structure.tabChart') },
          ]}
          value={tab}
          onChange={(v) => reset(() => setTab(v))}
        />
        {tab !== 'chart' && (
          <SearchField
            value={search}
            onChangeText={(v) => reset(() => setSearch(v))}
            placeholder={tab === 'departments' ? t('structure.searchDepartment') : t('structure.searchPosition')}
          />
        )}
        {tab === 'departments' && (
          <View style={styles.chips}>
            <Chip
              testID="structure-closed"
              label={t('structure.showClosed')}
              selected={includeClosed}
              onPress={() => reset(() => setIncludeClosed((v) => !v))}
            />
          </View>
        )}
        {tab === 'positions' && (
          <View style={styles.chips}>
            {JOB_CATEGORIES.map((c) => (
              <Chip
                key={c}
                testID={`category-${c}`}
                label={t(`structure.cat_${c}`)}
                selected={category === c}
                onPress={() => reset(() => setCategory(category === c ? '' : c))}
              />
            ))}
          </View>
        )}
        {tab === 'chart' && (
          <SelectField label={t('structure.branch')} value={branchName} onPress={() => setPickBranch(true)} icon="building" />
        )}
      </View>

      <Card>
        {tab === 'chart' ? (
          <OrgTree nodes={tree.data ?? []} loading={tree.isPending} error={tree.isError} onRetry={() => void tree.refetch()} />
        ) : active.isError ? (
          <ErrorState onRetry={() => active.refetch()} />
        ) : active.isPending ? (
          <Skeleton height={220} />
        ) : (data?.items.length ?? 0) === 0 ? (
          <EmptyState
            title={tab === 'departments' ? t('structure.emptyDept') : t('structure.emptyPos')}
            message={t('structure.emptyHint')}
          />
        ) : tab === 'departments' ? (
          (data!.items as Department[]).map((d) => {
            const heads = d.heads ?? [];
            return (
              <ListRow
                key={d.id}
                testID={`dept-${d.id}`}
                title={d.name || '—'}
                subtitle={heads.map((h) => h.legal_name).filter(Boolean).join(', ') || undefined}
                left={heads[0] ? <Avatar name={heads[0].legal_name ?? '?'} uri={heads[0].photo_thumb_path} size={32} /> : undefined}
                right={d.closed_at ? <Badge label={t('structure.closedBadge')} tone="warning" /> : undefined}
                onPress={() => setDept(d)}
              />
            );
          })
        ) : (
          (data!.items as JobPosition[]).map((p) => (
            <ListRow
              key={p.id}
              testID={`pos-${p.id}`}
              title={p.name || '—'}
              subtitle={[p.short_name, p.razryad != null ? t('structure.razryadN', { n: p.razryad }) : null].filter(Boolean).join(' · ') || undefined}
              right={p.category ? <Badge label={t(`structure.cat_${p.category}`, { defaultValue: p.category })} /> : undefined}
              onPress={() => setPos(p)}
            />
          ))
        )}
        {tab !== 'chart' && <Pager page={page} pages={data?.pages ?? 1} onPage={setPage} />}
      </Card>

      <DepartmentDetail dept={dept} onClose={() => setDept(null)} />
      <PositionDetail pos={pos} onClose={() => setPos(null)} />
      <PickerModal
        visible={pickBranch}
        title={t('structure.branch')}
        options={(branches.data ?? []).map((b) => ({ value: b.id, label: b.name ?? `#${b.id}` }))}
        loading={branches.isFetching}
        selected={effectiveBranch}
        onClose={() => setPickBranch(false)}
        onSelect={(id) => {
          setBranchId(id);
          setPickBranch(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { gap: 10, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
