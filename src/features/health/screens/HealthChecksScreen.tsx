// v3 Sog'liq ko'rigi — web v2 `HealthChecksPage` porti: hamshiraning smena oldidan
// kunlik bahosi (Sog'lom / E'tiborga muhtoj / Kasal). «Kasal» xodim o'sha kunlarda
// haydovchi qilib biriktirilmaydi. Ro'yxat doirasi serverda («Haydovchi doirasi»).
// Huquq serverdan: `health-checks/access` `can_check` — ko'rsatilgan filial uchun;
// yo'q bo'lsa faqat ko'rish. Filial — hamshira filiali (`nurse_branch_ids`); mobil'da
// global filial tanlagichi yo'q, shuning uchun bir nechta bo'lsa (yoki hamshira
// bo'lmagan bosh admin bo'lsa) ekranning o'zida tanlanadi.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { isSiteMasterAdmin } from '@/utils/roles';
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
  SelectField,
  Skeleton,
  StatTile,
} from '@/ui';
import { healthAccessQuery, healthBranchesQuery, healthRosterQuery } from '../api/queries';
import { useBulkGradeHealth } from '../api/mutations';
import { BulkFailedSheet } from '../components/BulkFailedSheet';
import { HealthGradeSheet } from '../components/HealthGradeSheet';
import {
  STATUS_TONE,
  branchCandidates,
  buildBulkBodies,
  describeFailed,
  resolveHealthBranch,
  rosterCounts,
  ungradedIds,
  untilSuffix,
  type HealthRosterRow,
} from '../utils/health';

const LIST_MAX_WIDTH = 960;

export default function HealthChecksScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { sizeClass } = useBreakpoint();
  const [day, setDay] = useState(() => dayjs().format('YYYY-MM-DD'));
  const [picked, setPicked] = useState<number | null>(null);
  const [picker, setPicker] = useState<null | 'day' | 'branch'>(null);
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const [editing, setEditing] = useState<{ row: HealthRosterRow; n: number } | null>(null);
  const [failed, setFailed] = useState<ReturnType<typeof describeFailed> | null>(null);

  // Hamshira filiali birinchi: auth/me dagi `nurse_branch_ids`, bo'lmasa `access` javobi.
  const userNurse = user?.nurse_branch_ids;
  const identity = useQuery(healthAccessQuery(null, !userNurse?.length));
  const candidates = branchCandidates(userNurse, identity.data?.nurse_branch_ids);
  // Hamshira bo'lmagan bosh admin: v2 sarlavhadagi global filialni oladi — bu yerda ekrandagi tanlagich.
  const anyBranch = !candidates.length && isSiteMasterAdmin(user);
  const branchId = resolveHealthBranch(picked, candidates);
  const showPicker = candidates.length > 1 || anyBranch;
  const branches = useQuery(healthBranchesQuery(showPicker));
  const branchName = (id: number) => branches.data?.find((b) => b.id === id)?.name || `#${id}`;

  // `can_check` AYNAN ko'rsatilayotgan filial uchun so'raladi (server shuni toraytiradi).
  const access = useQuery(healthAccessQuery(branchId, branchId != null));
  const canCheck = branchId != null && !!access.data?.can_check;

  // Hisoblagichlar to'liq ro'yxatdan, ro'yxat — qidirilganidan (v2).
  const full = useQuery(healthRosterQuery(branchId, day));
  const list = useQuery(healthRosterQuery(branchId, day, debounced));
  const allRows = full.data ?? [];
  const rows = list.data ?? [];
  const counts = rosterCounts(allRows);
  const ungraded = ungradedIds(allRows);
  const bulk = useBulkGradeHealth();

  const refresh = () =>
    void (branchId == null ? identity.refetch() : Promise.all([full.refetch(), list.refetch(), access.refetch()]));

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
      // Server yoza olmaganlari — ism va sababi bilan ko'rsatiladi.
      if (res.failed.length) setFailed(describeFailed(res.failed, allRows));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  const compact = sizeClass === 'compact';
  const basis = compact ? '47%' : '23%';
  const tiles = [
    {
      id: 'checked',
      label: t('health.statChecked'),
      value: `${counts.checked}/${counts.total}`,
      icon: 'users',
      tint: 'drop',
    },
    { id: 'good', label: t('health.status_good'), value: counts.good, icon: 'check', tint: 'green' },
    { id: 'limited', label: t('health.status_limited'), value: counts.limited, icon: 'bell', tint: 'amber' },
    {
      id: 'unfit',
      label: t('health.status_unfit'),
      value: counts.unfit,
      icon: 'close',
      tint: counts.unfit ? 'pink' : 'grey',
    },
  ] as const;

  const renderBody = () => {
    if (branchId == null) {
      // Identitet so'rovi yiqilsa — bu «filial yo'q» emas, xato.
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
      return debounced.trim() ? (
        <EmptyState title={t('common.noMatch')} message={t('common.noMatchHint')} />
      ) : (
        <EmptyState title={t('health.empty')} message={t('health.emptyHint')} />
      );
    }
    return rows.map((r) => {
      const st = r.status ?? '';
      const subtitle = [r.position, r.note ? `${t('health.note')}: ${r.note}` : null].filter(Boolean).join(' · ');
      const badge = (
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
      return (
        <ListRow
          key={r.employee_id}
          testID={`health-row-${r.employee_id}`}
          left={<Avatar name={r.legal_name || '?'} uri={r.photo_path} size={40} />}
          title={r.legal_name || '—'}
          subtitle={subtitle || undefined}
          // Telefonda nishon ism ostida — o'ng ustunda ismni «Amirsaidov B…» gacha qisardi.
          below={compact ? <View style={styles.below}>{badge}</View> : undefined}
          // O'ram: Badge o'zi `alignSelf: flex-start` — qatorda tepaga yopishmasin, markazda tursin.
          right={compact ? undefined : <View>{badge}</View>}
          onPress={canCheck ? () => setEditing({ row: r, n: Date.now() }) : undefined}
        />
      );
    });
  };

  return (
    <View style={styles.root}>
      {/* Kunlik ro'yxat — keng ekranda 1250px'ga cho'zilmasin (formalar 600–640, ro'yxat 960). */}
      <Screen refreshing={full.isRefetching} onRefresh={refresh} maxWidth={LIST_MAX_WIDTH}>
        <PageHeader title={t('health.title')} subtitle={t('health.subtitle')} />
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
              value={dayjs(day).format('DD.MM.YYYY')}
              icon="calendar"
              onPress={() => setPicker('day')}
            />
          </View>
        </View>
        {branchId != null && (
          <View style={styles.tiles}>
            {tiles.map((x) => (
              <View key={x.id} style={{ flexBasis: basis, flexGrow: 1 }}>
                <StatTile testID={`health-stat-${x.id}`} label={x.label} value={x.value} icon={x.icon} tint={x.tint} />
              </View>
            ))}
          </View>
        )}
        <View style={styles.filters}>
          <SearchField value={search} onChangeText={setSearch} placeholder={t('health.searchPlaceholder')} />
          {canCheck && ungraded.length > 0 && (
            <Button
              testID="health-bulk"
              label={t('health.bulkGood', { count: ungraded.length })}
              icon="check"
              variant="soft"
              loading={bulk.isPending}
              onPress={() => void bulkGood()}
            />
          )}
        </View>
        <Card>{renderBody()}</Card>
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
          visible
          title={t('health.branch')}
          options={(anyBranch ? (branches.data ?? []).map((b) => b.id) : candidates).map((id) => ({
            value: id,
            label: branchName(id),
          }))}
          loading={branches.isFetching}
          selected={branchId}
          onClose={() => setPicker(null)}
          onSelect={(id) => {
            setPicked(id);
            setPicker(null);
          }}
        />
      )}
      {canCheck && editing && (
        <HealthGradeSheet key={editing.n} row={editing.row} day={day} onClose={() => setEditing(null)} />
      )}
      {failed && <BulkFailedSheet items={failed} onClose={() => setFailed(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  selectors: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  flex: { flexGrow: 1, flexBasis: 160 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  filters: { gap: 10, marginBottom: 12 },
  below: { marginTop: 4 },
});
