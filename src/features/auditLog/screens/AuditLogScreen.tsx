// v3 Audit jurnali — web v2 `AuditLogPage` porti: tizimdagi barcha amallar tarixi, faqat o'qish.
// Hozir onlayn, toifa plitkalari (joriy tanlov bo'yicha, bosilsa — filtr), server qidiruvi,
// filtrlar (foydalanuvchi, toifa, amal, resurs, filial, xato guruhi, sana oralig'i), server
// sahifalash, yozuv tafsiloti (o'zgarishlar «kalit: eski → yangi» matni + yuborilgan tana).
// Huquq: v2 katalogi ADMIN_ONLY; server ro'yxatni bosh admin (va o'z filiali doirasida admin
// hisobi)ga beradi — 403 bo'lsa «Ruxsat yo'q». Jurnal filiali — barcha filiallar, faqat
// ekrandagi tanlov toraytiradi (v2). Excel eksport — web'da.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { useBreakpoint } from '@/utils/responsive';
import { formatTashkentDateTime } from '@/utils/tashkentTime';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { DatePickerModal } from '@/components/DatePicker';
import { PickerModal, type PickerOption } from '@/components/PickerModal';
import { useEmployeeListPicker } from '@/lib/useInfinitePicker';
import type { Employee } from '@/types';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  ListRow,
  PageHeader,
  Pager,
  Screen,
  SearchField,
  SelectField,
  Skeleton,
  Text,
} from '@/ui';
import { auditBranchesQuery, auditLogsQuery, auditStatsQuery } from '../api/queries';
import { AuditDetailSheet } from '../components/AuditDetailSheet';
import { OnlineNowCard } from '../components/OnlineNowCard';
import {
  AUDIT_CATEGORIES,
  AUDIT_RESOURCE_TYPES,
  EMPTY_AUDIT_FILTERS,
  FILTER_ACTIONS,
  STAT_CATEGORIES,
  actionMeta,
  auditParams,
  categoryTiles,
  foldedCount,
  isKnownResource,
  isRangeInvalid,
  type AuditFilters,
  type AuditLog,
} from '../utils/auditLog';

type Picker = null | 'user' | 'action' | 'resource' | 'branch' | 'from' | 'to';
const ALL = -1;
const fmtDay = (d: string) => (d ? `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}` : '');

export default function AuditLogScreen() {
  const { t } = useTranslation();
  const { sizeClass } = useBreakpoint();
  const compact = sizeClass === 'compact';
  const [filters, setFilters] = useState<AuditFilters>(EMPTY_AUDIT_FILTERS);
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [picker, setPicker] = useState<Picker>(null);
  const [userQuery, setUserQuery] = useState('');
  const [viewing, setViewing] = useState<{ row: AuditLog; n: number } | null>(null);

  const rangeInvalid = isRangeInvalid(filters);
  const list = useQuery(auditLogsQuery(auditParams(filters, debounced), page, !rangeInvalid));
  const denied = list.isError && !list.data && isAxiosError(list.error) && list.error.response?.status === 403;
  const stats = useQuery(auditStatsQuery(auditParams(filters, debounced, false), !rangeInvalid && !denied));
  // Sahifalab (2026-10-06): ilgari 20 ta. Logini yo'q xodim jurnalda bo'lmaydi — tashlanadi (v2).
  const userPicker = useEmployeeListPicker<Employee & { user_id?: number | null }>({ key: 'audit-users', search: userQuery, enabled: picker === 'user' });
  const users = { ...userPicker, data: userPicker.data.filter((e) => e.user_id != null) };
  const branches = useQuery(auditBranchesQuery(picker === 'branch' || filters.branchId != null));

  const patch = (p: Partial<AuditFilters>) => {
    setFilters((f) => ({ ...f, ...p }));
    setPage(1);
  };

  // Lug'atda yo'q tur — slug bilan, xom kalit emas (v2).
  const resourceLabel = (r: string) => (isKnownResource(r) ? t(`auditLog.res_${r}`) : r);
  const actionLabel = (a?: string | null) => {
    const m = actionMeta(a);
    return m.labelKey ? t(`auditLog.${m.labelKey}`) : a || '—';
  };
  const branchName = (id: number | null) =>
    id == null ? '' : branches.data?.find((b) => b.id === id)?.name || `#${id}`;

  const header = <PageHeader title={t('auditLog.title')} subtitle={t('auditLog.subtitle')} />;

  if (denied) {
    return (
      <Screen>
        {header}
        <Card>
          <EmptyState title={t('auditLog.denied')} message={t('auditLog.deniedHint')} pose="sad" />
        </Card>
      </Screen>
    );
  }

  const rows = list.data?.items ?? [];
  const folded = foldedCount(filters);
  const active = folded > 0 || !!debounced.trim();
  const tiles = categoryTiles(stats.data?.byCategory ?? {});

  const pickerConfig = (): { title: string; options: PickerOption[]; selected: number | null } => {
    const all = (label: string): PickerOption => ({ value: ALL, label });
    if (picker === 'user') {
      return {
        title: t('auditLog.colUser'),
        options: [
          all(t('auditLog.allUsers')),
          ...(users.data ?? []).map((e) => ({
            value: e.user_id as number,
            label: e.legal_name || `#${e.id}`,
            subLabel: e.job_position?.name ?? undefined,
            photo: e.photo_path, photoThumb: e.photo_thumb_path,
          })),
        ],
        selected: filters.userId ?? ALL,
      };
    }
    if (picker === 'action') {
      return {
        title: t('auditLog.colAction'),
        options: [
          all(t('auditLog.allActions')),
          ...FILTER_ACTIONS.map((a, i) => ({ value: i, label: actionLabel(a) })),
        ],
        selected: filters.action ? FILTER_ACTIONS.indexOf(filters.action) : ALL,
      };
    }
    if (picker === 'resource') {
      return {
        title: t('auditLog.colResource'),
        options: [
          all(t('auditLog.allResources')),
          ...AUDIT_RESOURCE_TYPES.map((r, i) => ({ value: i, label: resourceLabel(r) })),
        ],
        selected: filters.resource ? (AUDIT_RESOURCE_TYPES as readonly string[]).indexOf(filters.resource) : ALL,
      };
    }
    return {
      title: t('auditLog.colBranch'),
      options: [
        all(t('auditLog.allBranches')),
        ...(branches.data ?? []).map((b) => ({ value: b.id, label: b.name || `#${b.id}` })),
      ],
      selected: filters.branchId ?? ALL,
    };
  };

  const onPick = (v: number) => {
    const p = picker;
    setPicker(null);
    if (p === 'user') {
      const e = users.data?.find((x) => x.user_id === v);
      patch(v === ALL ? { userId: null, userLabel: '' } : { userId: v, userLabel: e?.legal_name || '' });
    } else if (p === 'action') patch({ action: v === ALL ? '' : (FILTER_ACTIONS[v] ?? '') });
    else if (p === 'resource') patch({ resource: v === ALL ? '' : (AUDIT_RESOURCE_TYPES[v] ?? '') });
    else if (p === 'branch') patch({ branchId: v === ALL ? null : v });
  };

  const renderList = () => {
    if (rangeInvalid) return <EmptyState title={t('auditLog.invalidRange')} />;
    if (list.isError && !list.data) return <ErrorState onRetry={() => list.refetch()} />;
    if (list.isPending) return <Skeleton height={260} />;
    if (!rows.length) {
      return active ? (
        <EmptyState title={t('common.noMatch')} message={t('common.noMatchHint')} />
      ) : (
        <EmptyState title={t('auditLog.empty')} message={t('auditLog.emptyHint')} />
      );
    }
    return rows.map((r) => {
      const m = actionMeta(r.action);
      const badge = <Badge testID={`audit-action-${r.id}`} label={actionLabel(r.action)} tone={m.tone} />;
      const resource = r.resource_type
        ? `${resourceLabel(r.resource_type)}${r.resource_id ? ` #${r.resource_id}` : ''}`
        : null;
      const branch = r.organization_branch_name || r.actor_branch_name;
      return (
        <ListRow
          key={r.id}
          testID={`audit-row-${r.id}`}
          left={<Avatar name={r.employee_name || '?'} size={36} />}
          title={r.employee_name || t('auditLog.unknownUser')}
          subtitle={[formatTashkentDateTime(r.created_at), resource, branch].filter(Boolean).join(' · ')}
          below={compact ? <View style={styles.below}>{badge}</View> : undefined}
          right={compact ? undefined : <View>{badge}</View>}
          onPress={() => setViewing({ row: r, n: Date.now() })}
        />
      );
    });
  };

  const pc = picker && picker !== 'from' && picker !== 'to' ? pickerConfig() : null;
  const categoryHint = filters.category ? t(`auditLog.catHint_${filters.category}`) : '';

  return (
    <View style={styles.root}>
      <Screen refreshing={list.isRefetching} onRefresh={() => void Promise.all([list.refetch(), stats.refetch()])}>
        {header}
        <OnlineNowCard />

        {/* Joriy tanlov toifalar bo'yicha — ro'yxat bir sahifa, bu butun to'plam. Bosish — filtr. */}
        {(stats.data?.total ?? 0) > 0 && (
          <View style={styles.chips} testID="audit-categories">
            {tiles.map(([key, n]) => (
              <Chip
                key={key}
                testID={`audit-cat-${key}`}
                label={(STAT_CATEGORIES as readonly string[]).includes(key) ? t(`auditLog.cat_${key}`) : key}
                count={n}
                selected={filters.category === key}
                // `other` server filtrida yo'q (422) — faqat son sifatida.
                onPress={
                  (AUDIT_CATEGORIES as readonly string[]).includes(key)
                    ? () => patch({ category: filters.category === key ? '' : key, status: '' })
                    : undefined
                }
              />
            ))}
          </View>
        )}

        <View style={styles.filters}>
          <SearchField
            value={search}
            onChangeText={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder={t('auditLog.searchPlaceholder')}
          />
          <View style={styles.chips}>
            <Chip
              testID="audit-filters-toggle"
              label={t('auditLog.filters')}
              count={folded || undefined}
              selected={filtersOpen}
              onPress={() => setFiltersOpen((o) => !o)}
            />
            {folded > 0 && (
              <Chip
                testID="audit-filters-reset"
                label={t('common.clearFilters')}
                onPress={() => patch(EMPTY_AUDIT_FILTERS)}
              />
            )}
          </View>
          {filtersOpen && (
            <Card>
              <View style={styles.panel}>
                <SelectField
                  testID="audit-filter-user"
                  label={t('auditLog.colUser')}
                  value={
                    filters.userId == null
                      ? ''
                      : filters.userLabel || t('auditLog.userSelected', { id: filters.userId })
                  }
                  placeholder={t('auditLog.allUsers')}
                  icon="user"
                  onPress={() => setPicker('user')}
                />
                <Text variant="label" tone="muted">
                  {t('auditLog.category')}
                </Text>
                <View style={styles.chips}>
                  <Chip
                    label={t('auditLog.allCategories')}
                    selected={!filters.category}
                    onPress={() => patch({ category: '', status: '' })}
                  />
                  {AUDIT_CATEGORIES.map((k) => (
                    <Chip
                      key={k}
                      testID={`audit-filter-cat-${k}`}
                      label={t(`auditLog.cat_${k}`)}
                      selected={filters.category === k}
                      onPress={() => patch({ category: filters.category === k ? '' : k, status: '' })}
                    />
                  ))}
                </View>
                {!!categoryHint && (
                  <Text variant="caption" tone="subtle">
                    {categoryHint}
                  </Text>
                )}
                {filters.category === 'errors' && (
                  <View style={styles.chips}>
                    <Chip
                      label={t('auditLog.allErrors')}
                      selected={!filters.status}
                      onPress={() => patch({ status: '' })}
                    />
                    {(['4xx', '5xx'] as const).map((s) => (
                      <Chip
                        key={s}
                        testID={`audit-filter-status-${s}`}
                        label={t(`auditLog.status${s}`)}
                        tone="danger"
                        selected={filters.status === s}
                        onPress={() => patch({ status: filters.status === s ? '' : s })}
                      />
                    ))}
                  </View>
                )}
                <SelectField
                  testID="audit-filter-action"
                  label={t('auditLog.colAction')}
                  value={filters.action ? actionLabel(filters.action) : ''}
                  placeholder={t('auditLog.allActions')}
                  onPress={() => setPicker('action')}
                />
                <SelectField
                  testID="audit-filter-resource"
                  label={t('auditLog.colResource')}
                  value={filters.resource ? resourceLabel(filters.resource) : ''}
                  placeholder={t('auditLog.allResources')}
                  onPress={() => setPicker('resource')}
                />
                <SelectField
                  testID="audit-filter-branch"
                  label={t('auditLog.colBranch')}
                  value={branchName(filters.branchId)}
                  placeholder={t('auditLog.allBranches')}
                  icon="building"
                  onPress={() => setPicker('branch')}
                />
                <View style={styles.dates}>
                  <View style={styles.flex}>
                    <SelectField
                      testID="audit-filter-from"
                      label={t('auditLog.dateFrom')}
                      value={fmtDay(filters.from)}
                      icon="calendar"
                      onPress={() => setPicker('from')}
                    />
                  </View>
                  <View style={styles.flex}>
                    <SelectField
                      testID="audit-filter-to"
                      label={t('auditLog.dateTo')}
                      value={fmtDay(filters.to)}
                      icon="calendar"
                      onPress={() => setPicker('to')}
                    />
                  </View>
                </View>
                {rangeInvalid && (
                  <Text variant="caption" tone="danger" testID="audit-range-invalid">
                    {t('auditLog.invalidRange')}
                  </Text>
                )}
                {(!!filters.from || !!filters.to) && (
                  <Button
                    testID="audit-filter-clear-dates"
                    label={t('auditLog.clearDates')}
                    variant="ghost"
                    size="sm"
                    onPress={() => patch({ from: '', to: '' })}
                  />
                )}
              </View>
            </Card>
          )}
        </View>

        <Card>
          {!!list.data && !rangeInvalid && (
            <Text variant="caption" tone="subtle" style={styles.total} testID="audit-total">
              {t('auditLog.total', { count: list.data.total })}
            </Text>
          )}
          {renderList()}
          {!rangeInvalid && <Pager page={page} pages={list.data?.pages ?? 1} onPage={setPage} />}
        </Card>
        <Text variant="caption" tone="subtle" style={styles.note}>
          {t('auditLog.webOnly')}
        </Text>
      </Screen>

      {pc && (
        <PickerModal
          avatars={picker === 'user'}
          visible
          title={pc.title}
          options={pc.options}
          loading={picker === 'user' ? users.isFetching : picker === 'branch' ? branches.isFetching : false}
          loadingMore={picker === 'user' ? users.loadingMore : false}
          onEndReached={picker === 'user' ? users.onEndReached : undefined}
          selected={pc.selected}
          onClose={() => setPicker(null)}
          onSelect={onPick}
          onSearchChange={picker === 'user' ? setUserQuery : undefined}
        />
      )}
      {(picker === 'from' || picker === 'to') && (
        <DatePickerModal
          visible
          value={(picker === 'from' ? filters.from : filters.to) || undefined}
          title={t(picker === 'from' ? 'auditLog.dateFrom' : 'auditLog.dateTo')}
          onConfirm={(d) => patch(picker === 'from' ? { from: d } : { to: d })}
          onClose={() => setPicker(null)}
        />
      )}
      {viewing && (
        <AuditDetailSheet
          key={viewing.n}
          row={viewing.row}
          actionLabel={actionLabel}
          resourceLabel={resourceLabel}
          onClose={() => setViewing(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  filters: { gap: 10, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  panel: { gap: 10 },
  dates: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  below: { marginTop: 4 },
  total: { marginBottom: 4 },
  note: { marginTop: 12 },
});
