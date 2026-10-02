// «Bayramlar / navbatchilik kunlari» — web HolidaysPage'ning ikki tabi, faqat
// ko'rish (CRUD — web'da). v3: `src/ui` primitivlarida (W4 qayta chizish).
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { resolveEmployeeBranchId } from '@/utils/branch';
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  ErrorState,
  ListRow,
  PageHeader,
  Screen,
  Segmented,
  Skeleton,
  Text,
} from '@/ui';
import { holidaysQuery, offDayDutyQuery } from '../api/queries';
import { dateRangeLabel, sortByDateFrom, isOngoing } from '../holidays';

type Tab = 'holidays' | 'offduty';

export default function HolidaysScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const orgBranchId = resolveEmployeeBranchId(user?.employee);
  const [tab, setTab] = useState<Tab>('holidays');
  const today = dayjs().format('YYYY-MM-DD');

  const holidaysQ = useQuery(holidaysQuery(orgBranchId));
  const offDutyQ = useQuery(offDayDutyQuery(orgBranchId));
  const activeQ = tab === 'holidays' ? holidaysQ : offDutyQ;

  const holidays = useMemo(() => sortByDateFrom(holidaysQ.data ?? []), [holidaysQ.data]);
  const offDuty = useMemo(() => sortByDateFrom(offDutyQ.data ?? []), [offDutyQ.data]);

  return (
    <Screen refreshing={activeQ.isRefetching} onRefresh={() => void activeQ.refetch()}>
      <PageHeader title={t('timesheet.holidaysTitle')} subtitle={t('timesheet.holidaysSubtitle')} />
      <View style={styles.tabs}>
        <Segmented<Tab>
          options={[
            { value: 'holidays', label: t('timesheet.holidaysTab') },
            { value: 'offduty', label: t('timesheet.offDutyTab') },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      {activeQ.isError ? (
        <ErrorState title={t('timesheet.holidaysLoadError')} onRetry={() => activeQ.refetch()} />
      ) : activeQ.isPending ? (
        <Skeleton height={200} />
      ) : tab === 'holidays' ? (
        holidays.length === 0 ? (
          <EmptyState title={t('timesheet.holidaysEmpty')} />
        ) : (
          <Card>
            {holidays.map((h) => (
              <ListRow
                key={h.id}
                title={h.name ?? '—'}
                subtitle={dateRangeLabel(h.date_from, h.date_to)}
                right={
                  <View style={styles.badges}>
                    {isOngoing(h, today) && <Badge label={t('timesheet.ongoingBadge')} tone="success" />}
                    {!!h.is_repeatable && <Badge label={t('timesheet.repeatableBadge')} tone="brand" />}
                  </View>
                }
              />
            ))}
          </Card>
        )
      ) : offDuty.length === 0 ? (
        <EmptyState title={t('timesheet.offDutyEmpty')} />
      ) : (
        <View style={styles.stack}>
          {offDuty.map((d) => (
            <Card key={d.id}>
              <View style={styles.dayHead}>
                <Text variant="label" style={styles.flex}>
                  {dateRangeLabel(d.date_from, d.date_to)}
                </Text>
                {isOngoing(d, today) && <Badge label={t('timesheet.ongoingBadge')} tone="success" />}
              </View>
              {(d.employees ?? []).map((emp) => (
                <ListRow
                  key={emp.id}
                  title={emp.legal_name ?? '—'}
                  left={<Avatar name={emp.legal_name ?? '?'} uri={emp.photo_thumb_path ?? emp.photo_path} size={36} />}
                />
              ))}
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { marginBottom: 12 },
  badges: { alignItems: 'flex-end', gap: 4 },
  stack: { gap: 12 },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  flex: { flex: 1 },
});
