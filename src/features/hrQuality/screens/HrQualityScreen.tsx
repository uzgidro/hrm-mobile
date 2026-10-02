// v3 Kadr nazorati — web v2 `HrQualityPage` porti: xodim kartalarida nima
// yetishmayotgani protokoli. Muharrir emas, hisobot: har shaxs bitta qator, uning
// barcha muammolari chip sifatida; «Tuzatish» kartani ochadi. Xatolar — kartani
// ishlatib bo'lmaydi (JSHSHIR, lavozim yo'q), ogohlantirishlar — chala ko'rinadi.
// Sahifa faqat HR va bosh admin uchun (v2 RequireRole). Excel eksport — web'da.
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { useAuthStore } from '@/store/authStore';
import { useNavSettings } from '@/lib/navSettings';
import { canAccessPage, isHR, isSiteMasterAdmin } from '@/utils/roles';
import { resolveEmployeeBranchId } from '@/utils/branch';
import { departmentsQuery } from '@/utils/employees';
import { useBreakpoint } from '@/utils/responsive';
import { PickerModal } from '@/components/PickerModal';
import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  PageHeader,
  Screen,
  Segmented,
  SelectField,
  Skeleton,
  StatTile,
  Text,
  toneColors,
} from '@/ui';
import { qualityQuery } from '../api/queries';
import { groupByPerson, type QualityRow } from '../utils/groupByPerson';

type Severity = '' | 'error' | 'warning';

export default function HrQualityScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const allowed = isHR(user) || isSiteMasterAdmin(user);
  useNavSettings(allowed);
  const { sizeClass } = useBreakpoint();
  const [severity, setSeverity] = useState<Severity>('');
  const [dept, setDept] = useState<{ id: number; name: string } | null>(null);
  const [rule, setRule] = useState('');
  const [picking, setPicking] = useState(false);
  const q = useQuery(qualityQuery({ severity, departmentId: dept?.id, rule }, allowed));
  const departments = useQuery({ ...departmentsQuery(resolveEmployeeBranchId(user?.employee)), enabled: picking });
  const people = useMemo(() => groupByPerson(q.data?.items ?? []), [q.data]);
  const canOpenCard = canAccessPage(user, 'employees');

  if (!allowed) {
    return (
      <Screen>
        <PageHeader title={t('hrQuality.title')} />
        <EmptyState title={t('hrQuality.noAccess')} pose="sad" />
      </Screen>
    );
  }

  const data = q.data;
  const basis = sizeClass === 'compact' ? '47%' : '23%';
  const tiles = [
    { id: 'checked', label: t('hrQuality.checked'), value: data?.checked ?? 0, icon: 'eye', tint: 'violet' },
    { id: 'clean', label: t('hrQuality.clean'), value: data?.clean ?? 0, icon: 'check', tint: 'green' },
    { id: 'errors', label: t('hrQuality.errors'), value: data?.errors ?? 0, icon: 'close', tint: 'pink' },
    { id: 'warnings', label: t('hrQuality.warnings'), value: data?.warnings ?? 0, icon: 'help', tint: 'amber' },
  ] as const;

  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      <PageHeader title={t('hrQuality.title')} subtitle={t('hrQuality.subtitle')} />
      {q.isError ? (
        // ⚠️ Xato — «muammo yo'q» EMAS: v2 da 403/500 yashil «hammasi toza» va 0 lar chizardi.
        <ErrorState onRetry={() => q.refetch()} />
      ) : q.isPending ? (
        <Skeleton height={260} />
      ) : (
        <View style={styles.stack}>
          <View style={styles.tiles}>
            {tiles.map((x) => (
              <View key={x.id} style={{ flexBasis: basis, flexGrow: 1 }}>
                <StatTile testID={`quality-${x.id}`} label={x.label} value={x.value} icon={x.icon} tint={x.tint} />
              </View>
            ))}
          </View>
          <Segmented<Severity>
            options={[
              { value: '', label: t('hrQuality.allLevels') },
              { value: 'error', label: t('hrQuality.onlyErrors') },
              { value: 'warning', label: t('hrQuality.onlyWarnings') },
            ]}
            value={severity}
            onChange={setSeverity}
          />
          <SelectField
            label={t('hrQuality.department')}
            value={dept?.name ?? ''}
            placeholder={t('hrQuality.allDepartments')}
            onPress={() => setPicking(true)}
          />
          {!!dept && <Button label={t('common.clear')} variant="ghost" size="sm" onPress={() => setDept(null)} />}
          {(data?.by_rule ?? []).length > 0 && (
            <Card title={t('hrQuality.byRule')}>
              <View style={styles.chips}>
                {data!.by_rule!.map((r) => (
                  <Chip
                    key={r.rule}
                    testID={`rule-${r.rule}`}
                    label={r.rule_title || r.rule}
                    count={r.count}
                    tone={r.severity === 'error' ? 'danger' : 'warning'}
                    selected={rule === r.rule}
                    onPress={() => setRule(rule === r.rule ? '' : r.rule)}
                  />
                ))}
              </View>
            </Card>
          )}
          {people.length === 0 ? (
            <Card>
              <EmptyState title={t('hrQuality.noIssues')} message={t('hrQuality.noIssuesHint')} pose="happy" />
            </Card>
          ) : (
            <Card title={t('hrQuality.peopleCount', { count: people.length })}>
              {people.map((p) => (
                <View key={p.id} style={styles.person}>
                  <View style={styles.personHead}>
                    <Avatar name={p.name} uri={p.photo} size={36} />
                    <View style={styles.flex}>
                      <Text variant="label">{p.name}</Text>
                      <View style={styles.counts}>
                        {p.errors > 0 && (
                          <Text variant="caption" tone="danger">
                            {t('hrQuality.nErrors', { count: p.errors })}
                          </Text>
                        )}
                        {p.warnings > 0 && (
                          <Text variant="caption" tone="muted">
                            {t('hrQuality.nWarnings', { count: p.warnings })}
                          </Text>
                        )}
                      </View>
                    </View>
                    {canOpenCard && (
                      <Button
                        label={t('hrQuality.fix')}
                        icon="edit"
                        size="sm"
                        variant="soft"
                        onPress={() => router.push({ pathname: '/profile-detail', params: { id: p.id } })}
                      />
                    )}
                  </View>
                  <View style={styles.chips}>
                    {p.issues.map((r, i) => (
                      <IssueChip key={`${r.rule}-${i}`} row={r} />
                    ))}
                  </View>
                </View>
              ))}
              {data?.truncated && (
                <Text variant="caption" tone="subtle">
                  {t('hrQuality.truncated')}
                </Text>
              )}
            </Card>
          )}
          {!!data?.generated_at && (
            <Text variant="caption" tone="subtle">
              {t('hrQuality.generatedAt', { time: dayjs(data.generated_at).format('DD.MM.YYYY HH:mm') })}
            </Text>
          )}
        </View>
      )}
      <PickerModal
        visible={picking}
        title={t('hrQuality.department')}
        options={(departments.data ?? []).map((d) => ({ value: d.id, label: d.name || `#${d.id}` }))}
        loading={departments.isFetching}
        selected={dept?.id ?? null}
        onClose={() => setPicking(false)}
        onSelect={(id) => {
          const d = departments.data?.find((x) => x.id === id);
          setDept(d ? { id: d.id, name: d.name } : null);
          setPicking(false);
        }}
      />
    </Screen>
  );
}

function IssueChip({ row }: { row: QualityRow }) {
  const { colors } = useTheme();
  const tc = toneColors(colors, row.severity === 'error' ? 'danger' : 'warning');
  return (
    <View style={[styles.issue, { backgroundColor: tc.soft }]}>
      <View style={[styles.dot, { backgroundColor: tc.fg }]} />
      <Text variant="caption" style={{ color: tc.fg }}>
        {row.rule_title || row.rule}
        {row.detail ? ` · ${row.detail}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  person: { gap: 8, paddingVertical: 10 },
  personHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  counts: { flexDirection: 'row', gap: 8 },
  issue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
