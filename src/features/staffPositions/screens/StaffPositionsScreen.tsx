// v3 Shtat va vakansiya — web v2 `StaffPositionsPage` porti (TZ 4.2.6 + 4.2.10).
// Bitta reyestrning uch o'qilishi: Shtat (reja ↔ band), Vakansiyalar (bo'sh o'rni
// bor qatorlar), Muammolar (reyestr nuqsonlari — faqat HR / bosh admin).
// Eksport, import, ommaviy tahrir, xabarnoma va vakansiya e'loni tahriri — web'da.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { confirm } from '@/lib/confirm';
import { useAuthStore } from '@/store/authStore';
import { canManageStaff } from '@/utils/roles';
import { resolveEmployeeBranchId } from '@/utils/branch';
import { fmtUnits } from '@/utils/units';
import { useBreakpoint } from '@/utils/responsive';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  Badge,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Fab,
  ListRow,
  PageHeader,
  Pager,
  Screen,
  SearchField,
  Segmented,
  Skeleton,
  StatTile,
  Text,
} from '@/ui';
import { staffIssuesQuery, staffListQuery, staffSummaryQuery, type StaffPosition, type StaffTab } from '../api/queries';
import { useToggleStaffRow } from '../api/mutations';
import { STAFF_CATEGORIES, rowKey } from '../utils/staff';
import { StaffDetailSheet, stateBadge } from '../components/StaffDetailSheet';
import { StaffFormSheet } from '../components/StaffFormSheet';

export default function StaffPositionsScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const manage = canManageStaff(user);
  const { sizeClass } = useBreakpoint();
  const [tab, setTab] = useState<StaffTab>('shtat');
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const [category, setCategory] = useState('');
  const [includeClosed, setIncludeClosed] = useState(false);
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<StaffPosition | null>(null);
  const [editing, setEditing] = useState<{ row: StaffPosition | null; n: number } | null>(null);

  const summary = useQuery(staffSummaryQuery());
  const list = useQuery(staffListQuery({ tab, search: debounced, category, includeClosed, page }, tab !== 'muammo'));
  const issues = useQuery(staffIssuesQuery(manage));
  const toggle = useToggleStaffRow();
  const issueTotal = (issues.data ?? []).reduce((s, g) => s + (g.total || 0), 0);

  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };

  const onToggle = async (r: StaffPosition) => {
    const ok = await confirm({
      title: r.is_closed ? t('staff.reopenTitle') : t('staff.closeTitle'),
      message: r.is_closed ? t('staff.reopenConfirm') : t('staff.closeConfirm'),
      confirmLabel: r.is_closed ? t('staff.reopen') : t('staff.close'),
      cancelLabel: t('common.cancel'),
      destructive: !r.is_closed,
    });
    if (!ok) return;
    try {
      await toggle.mutateAsync({ id: r.id as number, closed: r.is_closed });
      toast.success(r.is_closed ? t('staff.reopened') : t('staff.closed'));
      setViewing(null);
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('staff.saveFailed')));
    }
  };

  const s = summary.data;
  const negative = !!s && Number(s.vacant_units) < 0;
  const basis = sizeClass === 'compact' ? '47%' : '23%';
  const tiles = s
    ? ([
        {
          id: 'planned',
          label: t('staff.planned'),
          value: fmtUnits(s.planned_units),
          icon: 'briefcase',
          tint: 'violet',
        },
        { id: 'occupied', label: t('staff.occupied'), value: fmtUnits(s.occupied_units), icon: 'users', tint: 'drop' },
        {
          id: 'vacant',
          label: t('staff.vacant'),
          value: fmtUnits(s.vacant_units),
          icon: 'idcard',
          tint: negative ? 'pink' : 'green',
          sub: negative ? t('staff.overstaffed') : undefined,
        },
        { id: 'rows', label: t('staff.rows'), value: String(s.rows), icon: 'checklist', tint: 'grey' },
      ] as const)
    : [];

  const tabs: StaffTab[] = manage ? ['shtat', 'vakansiya', 'muammo'] : ['shtat', 'vakansiya'];

  return (
    <View style={styles.root}>
      <Screen
        refreshing={list.isRefetching}
        onRefresh={() => void Promise.all([summary.refetch(), tab === 'muammo' ? issues.refetch() : list.refetch()])}
      >
        <PageHeader title={t('staff.title')} subtitle={t('staff.subtitle')} />
        {/* Xulosa xato bersa — chiziq ko'rinmaydi (v2), «0» lar chizilmaydi. */}
        {!summary.isError && (
          <View style={styles.tiles}>
            {summary.isPending ? (
              <Skeleton height={88} />
            ) : (
              tiles.map((x) => (
                <View key={x.id} style={{ flexBasis: basis, flexGrow: 1 }}>
                  <StatTile
                    testID={`staff-${x.id}`}
                    label={x.label}
                    value={x.value}
                    icon={x.icon}
                    tint={x.tint}
                    sub={'sub' in x ? x.sub : undefined}
                  />
                </View>
              ))
            )}
          </View>
        )}
        <View style={styles.filters}>
          <Segmented<StaffTab>
            options={tabs.map((k) => ({
              value: k,
              label: t(`staff.tab_${k}`),
              count: k === 'muammo' && issueTotal > 0 ? issueTotal : undefined,
            }))}
            value={tab}
            onChange={(v) => reset(() => setTab(v))}
          />
          {tab !== 'muammo' && (
            <>
              <SearchField
                value={search}
                onChangeText={(v) => reset(() => setSearch(v))}
                placeholder={t('staff.searchPlaceholder')}
              />
              <View style={styles.chips}>
                {STAFF_CATEGORIES.map((c) => (
                  <Chip
                    key={c}
                    testID={`staff-cat-${c}`}
                    label={t(`staff.cat_${c}`)}
                    selected={category === c}
                    onPress={() => reset(() => setCategory(category === c ? '' : c))}
                  />
                ))}
                <Chip
                  label={t('staff.includeClosed')}
                  selected={includeClosed}
                  onPress={() => reset(() => setIncludeClosed((v) => !v))}
                />
              </View>
            </>
          )}
        </View>

        <Card>
          {tab === 'muammo' ? (
            issues.isError ? (
              <ErrorState onRetry={() => issues.refetch()} />
            ) : issues.isPending ? (
              <Skeleton height={200} />
            ) : (issues.data ?? []).length === 0 ? (
              <EmptyState title={t('staff.noIssues')} message={t('staff.noIssuesHint')} pose="happy" />
            ) : (
              issues.data!.map((g) => (
                <View key={g.code} style={styles.group}>
                  <View style={styles.groupHead}>
                    <Text variant="label" style={styles.flex}>
                      {t(`staff.issue_${g.code}`, { defaultValue: g.code })}
                    </Text>
                    <Badge label={String(g.total)} tone="warning" />
                  </View>
                  {!!t(`staff.issueHint_${g.code}`, { defaultValue: '' }) && (
                    <Text variant="caption" tone="muted">
                      {t(`staff.issueHint_${g.code}`, { defaultValue: '' })}
                    </Text>
                  )}
                  <View style={styles.chips}>
                    {g.rows.slice(0, 40).map((r, i) => (
                      <Badge
                        key={`${g.code}-${r.id ?? i}`}
                        label={`${r.name ?? '—'}${r.count ? ` · ${r.count}` : ''}`}
                      />
                    ))}
                    {g.rows.length > 40 && <Badge label={`+${g.rows.length - 40}`} />}
                  </View>
                </View>
              ))
            )
          ) : list.isError ? (
            <ErrorState onRetry={() => list.refetch()} />
          ) : list.isPending ? (
            <Skeleton height={240} />
          ) : (list.data?.items.length ?? 0) === 0 ? (
            <EmptyState title={t('staff.empty')} message={t('staff.emptyHint')} />
          ) : (
            list.data!.items.map((r) => {
              const st = stateBadge(r);
              const vacant = Number(r.vacant_units ?? 0);
              return (
                <ListRow
                  key={rowKey(r)}
                  title={`${r.department_name ?? '—'} · ${r.job_position_name ?? '—'}`}
                  subtitle={t('staff.unitsLine', {
                    planned: fmtUnits(r.planned_units),
                    occupied: fmtUnits(r.occupied_units),
                    vacant: fmtUnits(r.vacant_units),
                  })}
                  right={
                    <Badge
                      label={vacant < 0 ? t('staff.overstaffed') : t(st.key)}
                      tone={vacant < 0 ? 'danger' : st.tone}
                    />
                  }
                  onPress={() => setViewing(r)}
                />
              );
            })
          )}
          {tab !== 'muammo' && <Pager page={page} pages={list.data?.pages ?? 1} onPage={setPage} />}
        </Card>
        <View style={styles.fabSpace} />
      </Screen>
      {manage && (
        <Fab
          testID="staff-add"
          accessibilityLabel={t('staff.newRow')}
          onPress={() => setEditing({ row: null, n: Date.now() })}
        />
      )}
      {viewing && (
        <StaffDetailSheet
          key={rowKey(viewing)}
          row={viewing}
          canWrite={manage}
          toggling={toggle.isPending}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing({ row: viewing, n: Date.now() });
            setViewing(null);
          }}
          onToggle={() => void onToggle(viewing)}
        />
      )}
      {manage && editing && (
        <StaffFormSheet
          key={editing.n}
          row={editing.row}
          branchId={resolveEmployeeBranchId(user?.employee)}
          onClose={() => setEditing(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  filters: { gap: 10, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  group: { gap: 6, paddingVertical: 10 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  fabSpace: { height: 72 },
});
