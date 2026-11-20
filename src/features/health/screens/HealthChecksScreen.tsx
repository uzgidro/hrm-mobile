// v3 Sog'liq ko'rigi — web v2 `HealthChecksPage` porti: hamshiraning smena oldidan
// kunlik bahosi (Sog'lom / E'tiborga muhtoj / Kasal). «Kasal» xodim o'sha kunlarda
// haydovchi qilib biriktirilmaydi. Ro'yxat doirasi serverda («Haydovchi doirasi»).
//
// Simplified for the phone (2026-11-20): the nurse opens on the QUEUE of people not
// yet checked, grades each with one tap on the row («Sog'lom» saves at once,
// «E'tibor» / «Kasal» open the sheet with that status chosen), and the graded row
// leaves the queue. One progress card replaces the four stat tiles; the full edit
// (note, period, delete) is a tap on the row itself.
import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useBreakpoint } from '@/utils/responsive';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { confirm } from '@/lib/confirm';
import { DatePickerModal } from '@/components/DatePicker';
import { PickerModal } from '@/components/PickerModal';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ListRow,
  PageHeader,
  Screen,
  SearchField,
  Segmented,
  SelectField,
  Skeleton,
} from '@/ui';
import { healthRosterQuery } from '../api/queries';
import { useBulkGradeHealth, useGradeHealth } from '../api/mutations';
import { useHealthBranch } from '../hooks/useHealthBranch';
import { BulkFailedSheet } from '../components/BulkFailedSheet';
import { HealthGradeSheet } from '../components/HealthGradeSheet';
import { HealthProgress } from '../components/HealthProgress';
import { QuickGrade } from '../components/QuickGrade';
import {
  STATUS_TONE,
  buildBulkBodies,
  describeFailed,
  filterByView,
  rosterCounts,
  ungradedIds,
  untilSuffix,
  type HealthRosterRow,
  type HealthStatus,
  type HealthView,
} from '../utils/health';

const LIST_MAX_WIDTH = 960;

export default function HealthChecksScreen() {
  const { t } = useTranslation();
  const { sizeClass } = useBreakpoint();
  const today = dayjs().format('YYYY-MM-DD');
  const [day, setDay] = useState(today);
  const [picker, setPicker] = useState<null | 'day' | 'branch'>(null);
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const [viewPick, setView] = useState<HealthView | null>(null);
  const [editing, setEditing] = useState<{ row: HealthRosterRow; preset?: HealthStatus; n: number } | null>(null);
  const [failed, setFailed] = useState<ReturnType<typeof describeFailed> | null>(null);
  const [busyIds, setBusyIds] = useState<number[]>([]);
  // Remount key for the grade sheet: every open starts from the row's current data.
  const opens = useRef(0);
  const openSheet = (row: HealthRosterRow, preset?: HealthStatus) => {
    opens.current += 1;
    setEditing({ row, preset, n: opens.current });
  };

  const { branchId, setPicked, identity, access, canCheck, showPicker, branchName, options, branchesLoading } =
    useHealthBranch();

  // Counts come from the full roster, the list from the searched one (v2).
  const full = useQuery(healthRosterQuery(branchId, day));
  const list = useQuery(healthRosterQuery(branchId, day, debounced));
  const allRows = full.data ?? [];
  const counts = rosterCounts(allRows);
  const ungraded = ungradedIds(allRows);
  // A nurse starts on the queue; a viewer (no grading right) sees everyone.
  const view: HealthView = viewPick ?? (canCheck ? 'todo' : 'all');
  const rows = filterByView(list.data ?? [], view);
  const grade = useGradeHealth();
  const bulk = useBulkGradeHealth();

  const refresh = () =>
    void (branchId == null ? identity.refetch() : Promise.all([full.refetch(), list.refetch(), access.refetch()]));

  const quickGood = async (r: HealthRosterRow) => {
    setBusyIds((ids) => [...ids, r.employee_id]);
    try {
      await grade.mutateAsync({ employee_id: r.employee_id, status: 'good', date_from: day, date_to: day, note: null });
      toast.success(t('health.quickSaved', { name: r.legal_name || '—', status: t('health.status_good') }));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('errors.generic')));
    } finally {
      setBusyIds((ids) => ids.filter((id) => id !== r.employee_id));
    }
  };

  // «Sog'lom» on a row that is not yet «Sog'lom» saves at once; everything else (the other
  // two grades, or re-tapping the current one) opens the sheet with that status chosen.
  const onPick = (r: HealthRosterRow, s: HealthStatus) => {
    if (s === 'good' && r.status !== 'good') return void quickGood(r);
    openSheet(r, s);
  };

  const bulkGood = async () => {
    if (!ungraded.length) return;
    const ok = await confirm({
      title: t('health.bulkTitle'),
      message: t('health.bulkConfirm', { count: ungraded.length }),
      confirmLabel: t('health.bulkConfirmBtn'),
      cancelLabel: t('common.cancel'),
    });
    if (!ok) return;
    try {
      const res = await bulk.mutateAsync(buildBulkBodies(ungraded, day));
      if (res.ok.length) toast.success(t('health.bulkDone', { count: res.ok.length }));
      // What the server could not write — by name and reason.
      if (res.failed.length) setFailed(describeFailed(res.failed, allRows));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  const compact = sizeClass === 'compact';
  const dayLabel = `${day === today ? `${t('health.today')}, ` : ''}${dayjs(day).format('DD.MM.YYYY')}`;

  const renderBody = () => {
    if (branchId == null) {
      // A failed identity request is an error, not «no branch».
      if (identity.isError && !identity.data) return <ErrorState onRetry={() => identity.refetch()} />;
      return identity.isLoading ? (
        <Skeleton height={220} />
      ) : (
        <EmptyState title={t('health.noBranch')} message={t('health.noBranchHint')} />
      );
    }
    if (list.isError && !list.data) return <ErrorState onRetry={() => list.refetch()} />;
    if (list.isPending) return <Skeleton height={220} />;
    if (!rows.length) {
      if (debounced.trim()) return <EmptyState title={t('common.noMatch')} message={t('common.noMatchHint')} />;
      if (view === 'todo' && counts.total > 0) {
        return (
          <EmptyState
            pose="happy"
            title={t('health.allDone')}
            message={t('health.allDoneHint')}
            actionLabel={t('health.view_done')}
            onAction={() => setView('done')}
          />
        );
      }
      if (view === 'done' && counts.total > 0) return <EmptyState title={t('health.noneDone')} />;
      return <EmptyState title={t('health.empty')} message={t('health.emptyHint')} />;
    }
    return rows.map((r) => {
      const st = r.status ?? '';
      const name = r.legal_name || '—';
      const subtitle = [r.position, r.note ? `${t('health.note')}: ${r.note}` : null].filter(Boolean).join(' · ');
      // In the queue every row is ungraded — the «not checked» badge would only repeat the tab.
      const badge =
        view === 'todo' ? null : (
          <Badge
            testID={`health-badge-${r.employee_id}`}
            label={
              st
                ? `${t(`health.status_${st}`, { defaultValue: r.label ?? st })}${untilSuffix(r, day)}`
                : t('health.notChecked')
            }
            tone={st ? (STATUS_TONE[st] ?? 'neutral') : 'neutral'}
          />
        );
      const quick = canCheck ? (
        <QuickGrade
          employeeId={r.employee_id}
          name={name}
          current={st}
          busy={busyIds.includes(r.employee_id)}
          stretch={compact}
          onPick={(s) => onPick(r, s)}
        />
      ) : null;
      return (
        <ListRow
          key={r.employee_id}
          testID={`health-row-${r.employee_id}`}
          left={<Avatar name={r.legal_name || '?'} uri={r.photo_path} thumb={r.photo_thumb_path} size={40} />}
          title={name}
          subtitle={subtitle || undefined}
          // Phone: badge and the three buttons go under the name, so the name is never cut short.
          below={
            compact && (badge || quick) ? (
              <View style={styles.below}>
                {badge}
                {quick}
              </View>
            ) : undefined
          }
          right={
            compact ? undefined : (
              <View style={styles.right}>
                {badge}
                {quick}
              </View>
            )
          }
          onPress={canCheck ? () => openSheet(r) : undefined}
        />
      );
    });
  };

  return (
    <View style={styles.root}>
      <Screen refreshing={full.isRefetching} onRefresh={refresh} maxWidth={LIST_MAX_WIDTH}>
        <PageHeader title={t('health.title')} subtitle={t('health.subtitleShort')} />
        <View style={styles.selectors}>
          {showPicker && (
            <View style={styles.flex}>
              <SelectField
                testID="health-branch"
                label={t('health.branch')}
                value={branchId != null ? branchName(branchId) : ''}
                placeholder={t('health.pickBranch')}
                icon="building"
                onPress={() => setPicker('branch')}
              />
            </View>
          )}
          <View style={styles.flex}>
            <SelectField
              testID="health-day"
              label={t('health.day')}
              value={dayLabel}
              icon="calendar"
              onPress={() => setPicker('day')}
            />
          </View>
        </View>
        {branchId != null && full.data && <HealthProgress counts={counts} />}
        {branchId != null && (
          <View style={styles.filters}>
            <Segmented<HealthView>
              testID="health-view"
              value={view}
              onChange={setView}
              options={[
                { value: 'todo', label: t('health.view_todo'), count: counts.unchecked },
                { value: 'done', label: t('health.view_done'), count: counts.checked },
                { value: 'all', label: t('health.view_all') },
              ]}
            />
            <SearchField value={search} onChangeText={setSearch} placeholder={t('health.searchPlaceholder')} />
          </View>
        )}
        <Card>{renderBody()}</Card>
        {/* The end of the queue: the rest are usually healthy — one confirmed tap for all of them. */}
        {canCheck && view !== 'done' && ungraded.length > 0 && (
          <View style={styles.bulk}>
            <Button
              testID="health-bulk"
              label={t('health.bulkGood', { count: ungraded.length })}
              icon="check"
              variant="soft"
              full
              loading={bulk.isPending}
              onPress={() => void bulkGood()}
            />
          </View>
        )}
      </Screen>
      {picker === 'day' && (
        <DatePickerModal
          visible
          value={day}
          title={t('health.day')}
          onConfirm={setDay}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === 'branch' && (
        <PickerModal
          avatars={false}
          visible
          title={t('health.branch')}
          options={options}
          loading={branchesLoading}
          selected={branchId}
          onClose={() => setPicker(null)}
          onSelect={(id) => {
            setPicked(id);
            setPicker(null);
          }}
        />
      )}
      {canCheck && editing && (
        <HealthGradeSheet
          key={editing.n}
          row={editing.row}
          preset={editing.preset}
          day={day}
          onClose={() => setEditing(null)}
        />
      )}
      {failed && <BulkFailedSheet items={failed} onClose={() => setFailed(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  selectors: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  flex: { flexGrow: 1, flexBasis: 160 },
  filters: { gap: 10, marginBottom: 12 },
  below: { marginTop: 4, gap: 2, alignItems: 'stretch' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bulk: { marginTop: 12 },
});
