// «Tug'ilgan kunlar» — xodim va rahbar panellarida bir xil. O'z so'rovi, o'z xatosi.
import React from 'react';
import { router, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Avatar, Badge, Card, ErrorState, ListRow, Skeleton, Text } from '@/ui';
import { homeBirthdaysQuery } from '../../api/queries';

export function BirthdaysCard({ branchId, limit = 5 }: { branchId: number | undefined; limit?: number }) {
  const { t } = useTranslation();
  const q = useQuery(homeBirthdaysQuery(branchId));
  const rows = (q.data ?? []).slice().sort((a, b) => a.days_left - b.days_left).slice(0, limit);
  return (
    <Card
      title={t('dashboard.home.birthdays')}
      icon="gift"
      tint="pink"
      testID="card-birthdays"
      action={{ label: t('common.all'), onPress: () => router.push('/birthdays' as Href) }}
    >
      {q.isPending ? (
        <Skeleton height={120} />
      ) : q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : rows.length === 0 ? (
        <Text variant="caption" tone="subtle">
          {t('dashboard.home.noBirthdays')}
        </Text>
      ) : (
        rows.map((b) => (
          <ListRow
            key={b.id}
            title={b.legal_name}
            subtitle={b.job_position?.name}
            left={<Avatar name={b.legal_name} uri={b.photo_path} size={36} />}
            right={
              <Badge
                label={b.days_left === 0 ? t('dashboard.home.birthdayToday') : t('dashboard.home.daysLeft', { count: b.days_left })}
                tone={b.days_left === 0 ? 'brand' : 'neutral'}
              />
            }
          />
        ))
      )}
    </Card>
  );
}
