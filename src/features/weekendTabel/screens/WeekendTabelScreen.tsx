// «Dam olish kunlari tabeli» (web v2 `WeekendTabelPage`): who worked which rest day / holiday and for how long.
// Turnstile figures are the default; HR overrides a day by hand, designates work by an order, or imports the
// branch's own Excel. Read-only for leadership viewers; HR and the master admin write.
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { WEEKEND_TABEL_EXPORT } from '@/api/urls';
import { getApiErrorMessage } from '@/api/errors';
import { AccessDenied } from '@/components/AccessDenied';
import { BranchSwitcher } from '@/components/BranchSwitcher';
import { MonthNavigator } from '@/components/MonthNavigator';
import { PickerModal } from '@/components/PickerModal';
import { toast } from '@/lib/toast';
import { downloadAndSave } from '@/lib/saveFile';
import { isNotFound, setWeekendTabelSupported } from '@/lib/serverCaps';
import { useActiveBranchId } from '@/lib/useActiveBranch';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/authStore';
import { canManageStaff, getRoleKey } from '@/utils/roles';
import { departmentsQuery } from '@/utils/employees';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Screen,
  SearchField,
  SelectField,
  Skeleton,
  StatTile,
  Text,
  Toggle,
} from '@/ui';
import { weekendGridQuery, weekendOrdersQuery } from '../api/queries';
import { AssignSheet } from '../components/AssignSheet';
import { CellSheet } from '../components/CellSheet';
import { ImportSheet } from '../components/ImportSheet';
import { OrdersPanel } from '../components/OrdersPanel';
import type { GridParams, WeekendRow } from '../types';
import { exportName, fmtDate, fmtHours, groupRows, rowCells, shiftMonth, sourceTone } from '../utils/weekend';

// Same audience as web `defaultRoles` (ADMIN_HR_LEAD); the server decides again (403).
const READER_ROLES = ['masterAdmin', 'hr', 'ministr', 'deputy'];

type Editing = { row: WeekendRow; date: string; pick: boolean } | null;

export default function WeekendTabelScreen() {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const user = useAuthStore((s) => s.user);
  const allowed = READER_ROLES.includes(getRoleKey(user));
  const canEdit = canManageStaff(user);
  const branchId = useActiveBranchId();

  const now = dayjs();
  const [ym, setYm] = useState({ year: now.year(), month: now.month() + 1 });
  const [departmentId, setDepartmentId] = useState<number | undefined>();
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const [includeAll, setIncludeAll] = useState(false);
  const [pickDept, setPickDept] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [busy, setBusy] = useState<'export' | 'blank' | null>(null);

  const params: GridParams = {
    year: ym.year,
    month: ym.month,
    organizationBranchId: branchId,
    departmentId,
    search: debounced,
    includeAll,
  };
  const grid = useQuery(weekendGridQuery(params, allowed));
  const orders = useQuery(weekendOrdersQuery(ym.year, ym.month, branchId, allowed && grid.isSuccess));
  const depts = useQuery({ ...departmentsQuery(branchId), enabled: allowed });

  const unsupported = grid.isError && isNotFound(grid.error);
  useEffect(() => {
    // Keep the menu in sync with what the screen just learned about the server.
    if (grid.isSuccess) setWeekendTabelSupported(true);
    else if (unsupported) setWeekendTabelSupported(false);
  }, [grid.isSuccess, unsupported]);

  const data = grid.data;
  const days = data?.days ?? [];
  const groups = useMemo(() => groupRows(data?.rows ?? [], t('weekendTabel.noDepartment')), [data?.rows, t]);
  const monthDate = dayjs(`${ym.year}-${String(ym.month).padStart(2, '0')}-01`);

  if (!allowed) return <AccessDenied title={t('weekendTabel.title')} />;

  const runExport = async (blank: boolean) => {
    setBusy(blank ? 'blank' : 'export');
    try {
      const name = exportName(ym.year, ym.month, blank);
      const res = await downloadAndSave(
        {
          url: WEEKEND_TABEL_EXPORT,
          params: {
            year: ym.year,
            month: ym.month,
            organization_branch_id: branchId || undefined,
            department_id: departmentId || undefined,
            blank: blank || undefined,
          },
        },
        name,
      );
      if (res === 'saved') toast.success(t('weekendTabel.exportSaved', { name }));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('weekendTabel.exportFail')));
    } finally {
      setBusy(null);
    }
  };

  const body = () => {
    if (unsupported) {
      return (
        <EmptyState title={t('weekendTabel.unsupportedTitle')} message={t('weekendTabel.unsupportedHint')} pose="sad" />
      );
    }
    if (grid.isPending) return <Skeleton height={240} />;
    if (grid.isError && !data) return <ErrorState title={t('weekendTabel.loadFail')} onRetry={() => void grid.refetch()} />;
    if (!data || data.rows.length === 0) {
      return <EmptyState title={t('weekendTabel.empty')} message={t('weekendTabel.emptyHint')} />;
    }
    let no = 0;
    return (
      <View style={styles.groups}>
        {groups.map((g) => (
          <View key={g.name} style={styles.group}>
            <View style={styles.groupHead}>
              <Text variant="label" weight="700" style={styles.flex}>
                {g.name}
              </Text>
              <Badge label={String(g.rows.length)} />
            </View>
            {g.rows.map((r) => {
              no += 1;
              return (
                <EmployeeCard
                  key={r.employee_id}
                  no={no}
                  row={r}
                  canEdit={canEdit}
                  onPick={(date) => setEditing({ row: r, date, pick: false })}
                  onAdd={() => setEditing({ row: r, date: days.find((d) => d.rest)?.date ?? days[0]!.date, pick: true })}
                />
              );
            })}
            {g.rows.length > 1 && (
              <Text variant="caption" tone="muted" style={styles.subtotal}>
                {t('weekendTabel.deptTotal', { name: g.name })}:{' '}
                {t('weekendTabel.daysHours', {
                  days: g.rows.reduce((n, r) => n + r.days, 0),
                  hours: fmtHours(g.rows.reduce((n, r) => n + r.hours, 0)),
                })}
              </Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <Screen
      refreshing={grid.isRefetching}
      onRefresh={() => {
        void grid.refetch();
        void orders.refetch();
      }}
      testID="weekend-screen"
    >
      <PageHeader title={t('weekendTabel.title')} subtitle={t('weekendTabel.subtitle')} right={<BranchSwitcher />} />
      <View style={styles.content}>
        <MonthNavigator
          month={monthDate}
          onChange={(m) => {
            setEditing(null);
            setYm(shiftMonth(ym, (m.year() - ym.year) * 12 + (m.month() + 1 - ym.month)));
          }}
        />

        {!unsupported && (
          <>
            <View style={styles.actions}>
              <Button
                testID="weekend-export-blank"
                label={t('weekendTabel.exportBlank')}
                icon="doc"
                variant="soft"
                size="sm"
                loading={busy === 'blank'}
                disabled={busy !== null}
                onPress={() => void runExport(true)}
              />
              <Button
                testID="weekend-export"
                label={t('weekendTabel.exportExcel')}
                icon="arrowDown"
                variant={canEdit ? 'soft' : 'primary'}
                size="sm"
                loading={busy === 'export'}
                disabled={busy !== null}
                onPress={() => void runExport(false)}
              />
              {canEdit && (
                <Button
                  testID="weekend-import"
                  label={t('weekendTabel.import')}
                  icon="arrowUp"
                  variant="soft"
                  size="sm"
                  onPress={() => setImportOpen(true)}
                />
              )}
              {canEdit && (
                <Button
                  testID="weekend-assign"
                  label={t('weekendTabel.assign')}
                  icon="checklist"
                  size="sm"
                  disabled={!data}
                  onPress={() => setAssignOpen(true)}
                />
              )}
            </View>

            <SearchField
              testID="weekend-search"
              value={search}
              onChangeText={setSearch}
              placeholder={t('weekendTabel.searchPlaceholder')}
            />
            <SelectField
              testID="weekend-department"
              label={t('weekendTabel.department')}
              value={depts.data?.find((d) => d.id === departmentId)?.name ?? null}
              placeholder={t('weekendTabel.allDepartments')}
              onPress={() => setPickDept(true)}
            />
            <View style={styles.switchRow}>
              <View style={styles.flex}>
                <Text variant="body">{t('weekendTabel.includeAll')}</Text>
                <Text variant="caption" tone="subtle">
                  {t('weekendTabel.includeAllHint')}
                </Text>
              </View>
              <Toggle testID="weekend-include-all" value={includeAll} onValueChange={setIncludeAll} />
            </View>

            <View style={styles.tiles}>
              <StatTile
                style={styles.tile}
                label={t('weekendTabel.statEmployees')}
                value={data?.totals.employees ?? '–'}
                icon="users"
                tint="violet"
              />
              <StatTile
                style={styles.tile}
                label={t('weekendTabel.statDays')}
                value={data?.totals.days ?? '–'}
                icon="calendar"
                tint="green"
              />
              <StatTile
                style={styles.tile}
                label={t('weekendTabel.statHours')}
                value={data ? fmtHours(data.totals.hours) : '–'}
                icon="clock"
                tint="amber"
              />
            </View>

            {!canEdit && (
              <Text variant="caption" tone="subtle" testID="weekend-read-only">
                {t('weekendTabel.readOnlyHint')}
              </Text>
            )}
            {(orders.data?.length ?? 0) > 0 && <OrdersPanel orders={orders.data ?? []} />}
          </>
        )}

        {body()}

        {!unsupported && !!data && (
          <Card testID="weekend-legend">
            <View style={styles.legend}>
              <Badge label={t('weekendTabel.legendWeekend')} tone="warning" />
              <Badge label={t('weekendTabel.legendHoliday')} tone="danger" />
              {(['turnstile', 'manual', 'import', 'order'] as const).map((s) => (
                <Badge
                  key={s}
                  label={t(`weekendTabel.src${s[0]!.toUpperCase()}${s.slice(1)}`)}
                  tone={sourceTone(s)}
                />
              ))}
              <Text variant="caption" tone="muted" style={{ color: c.fgMuted }}>
                0 = {t('weekendTabel.zeroNote')}
              </Text>
            </View>
          </Card>
        )}
      </View>

      <PickerModal
        visible={pickDept}
        title={t('weekendTabel.department')}
        options={[
          { value: 0, label: t('weekendTabel.allDepartments') },
          ...(depts.data ?? []).map((d) => ({ value: d.id, label: d.name })),
        ]}
        avatars={false}
        selected={departmentId ?? 0}
        onClose={() => setPickDept(false)}
        onSelect={(v) => {
          setDepartmentId(v || undefined);
          setPickDept(false);
        }}
      />
      {editing && canEdit && (
        <CellSheet
          key={`${editing.row.employee_id}-${editing.date}-${editing.pick}`}
          row={editing.row}
          date={editing.date}
          days={days}
          pickDate={editing.pick}
          onClose={() => setEditing(null)}
        />
      )}
      {importOpen && (
        <ImportSheet
          year={ym.year}
          month={ym.month}
          organizationBranchId={branchId}
          onClose={() => setImportOpen(false)}
        />
      )}
      {assignOpen && data && (
        <AssignSheet params={params} days={days} orders={orders.data ?? []} onClose={() => setAssignOpen(false)} />
      )}
    </Screen>
  );
}

function EmployeeCard({
  no,
  row,
  canEdit,
  onPick,
  onAdd,
}: {
  no: number;
  row: WeekendRow;
  canEdit: boolean;
  onPick: (date: string) => void;
  onAdd: () => void;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const cells = rowCells(row);
  return (
    <Card testID={`weekend-row-${row.employee_id}`}>
      <View style={styles.rowHead}>
        <Text variant="caption" tone="subtle">
          {no}
        </Text>
        <View style={styles.flex}>
          <Text variant="body" weight="700">
            {row.name}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {[row.position, row.tabel_number ? `№${row.tabel_number}` : null].filter(Boolean).join(' · ')}
          </Text>
        </View>
        {row.is_archived && <Badge label={t('weekendTabel.archived')} />}
        <Text variant="caption" tone="muted" testID={`weekend-total-${row.employee_id}`}>
          {t('weekendTabel.daysHours', { days: row.days, hours: fmtHours(row.hours) })}
        </Text>
      </View>
      <View style={styles.cells}>
        {cells.map(({ date, cell, zero }) => {
          const tone = cell ? sourceTone(cell.source) : 'neutral';
          return (
            <Pressable
              key={date}
              disabled={!canEdit}
              onPress={() => onPick(date)}
              accessibilityRole={canEdit ? 'button' : undefined}
              accessibilityLabel={fmtDate(date)}
              hitSlop={6}
              testID={`weekend-edit-${row.employee_id}-${date}`}
            >
              <Badge
                testID={`weekend-cell-${row.employee_id}-${date}`}
                label={`${fmtDate(date).slice(0, 5)} · ${cell ? fmtHours(cell.hours) : '0'}`}
                tone={zero ? 'danger' : tone}
              />
            </Pressable>
          );
        })}
        {canEdit && (
          <Button
            testID={`weekend-add-${row.employee_id}`}
            label={t('weekendTabel.cellTitle')}
            icon="plus"
            variant="link"
            size="sm"
            onPress={onAdd}
          />
        )}
      </View>
      {cells.some((x) => x.cell?.source === 'order' && x.cell.ref) && (
        <Text variant="caption" tone="subtle" style={{ color: c.fgSubtle }}>
          {[...new Set(cells.map((x) => x.cell?.ref).filter(Boolean))].join(' · ')}
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1 },
  groups: { gap: 16 },
  group: { gap: 8 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subtotal: { textAlign: 'right' },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cells: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 8 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
});
