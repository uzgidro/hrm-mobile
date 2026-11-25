// Setup checklist: what is still missing before the sanatorium can work smoothly.
import React from 'react';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Badge, EmptyState, ListRow, PageHeader, ProgressBar, Screen, Text } from '@/ui';
import { Denied, QueryBlock, useSanAccess } from '../../components/common';
import { setupStatusQuery } from '../api';
import { setupRoute } from '../utils';

export default function SetupScreen() {
  const { t } = useTranslation();
  const allowed = useSanAccess('registrar');
  const q = useQuery(setupStatusQuery(allowed));
  if (!allowed) return <Denied />;
  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()} testID="sanatorium-setup-screen">
      <PageHeader title={t('sanSimple.setup.title')} />
      <QueryBlock query={q}>
        {(s) =>
          s == null ? (
            <EmptyState title={t('sanSimple.unavailable')} />
          ) : (
            <>
              <Text variant="heading" testID="setup-count">{t('sanSimple.setup.banner', { done: s.done, total: s.total })}</Text>
              <ProgressBar value={s.total ? s.done / s.total : 0} />
              {s.items.map((i) => (
                <ListRow
                  key={i.key}
                  pressable
                  chevron
                  testID={`setup-${i.key}`}
                  title={t(`sanSimple.setup.item.${i.key}`, { defaultValue: i.key })}
                  subtitle={i.ok ? t('sanSimple.setup.ok') : i.count ? t('sanSimple.setup.left', { count: i.count }) : undefined}
                  right={<Badge label={i.ok ? t('sanSimple.setup.done') : t(`sanSimple.setup.${i.severity}`)} tone={i.ok ? 'success' : i.severity === 'required' ? 'danger' : 'warning'} />}
                  onPress={() => router.push(setupRoute(i) as never)}
                />
              ))}
            </>
          )
        }
      </QueryBlock>
    </Screen>
  );
}
