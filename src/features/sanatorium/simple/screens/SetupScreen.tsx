// Setup checklist: what is still missing before the sanatorium can work smoothly. Every open item opens the
// screen (and settings tab) where it is filled in; the bot token is entered by the HRM administrator, so it has no link.
import React from 'react';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Badge, EmptyState, ListRow, PageHeader, ProgressBar, Screen, Text } from '@/ui';
import { Denied, QueryBlock, useSanAccess } from '../../components/common';
import { SETUP_COUNT_MISSING, SETUP_NO_LINK, SETUP_SETTINGS_TAB, sortSetup } from '../../utils/staffParity';
import { setupStatusQuery } from '../api';
import type { SetupItem } from '../types';
import { setupRoute } from '../utils';

/** `{pathname, params}` of an item's screen, or null when it cannot be filled in from the app. */
export function setupTarget(i: Pick<SetupItem, 'key'>): { pathname: string; params?: Record<string, string> } | null {
  if (SETUP_NO_LINK.includes(i.key)) return null;
  const pathname = setupRoute(i);
  const tab = pathname === '/sanatorium-settings' ? SETUP_SETTINGS_TAB[i.key] : undefined;
  return tab ? { pathname, params: { tab } } : { pathname };
}

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
              {sortSetup(s.items).map((i) => {
                const target = setupTarget(i);
                const n = i.count ?? 0;
                const sub = i.ok
                  ? n > 0 && !SETUP_COUNT_MISSING.includes(i.key) ? t('sanStaff.setup.have', { count: n }) : t('sanSimple.setup.ok')
                  : SETUP_NO_LINK.includes(i.key) ? t('sanStaff.setup.admin')
                  : n > 0 ? t(SETUP_COUNT_MISSING.includes(i.key) ? 'sanSimple.setup.left' : 'sanStaff.setup.have', { count: n })
                  : undefined;
                return (
                  <ListRow
                    key={i.key}
                    pressable={!!target}
                    chevron={!!target}
                    testID={`setup-${i.key}`}
                    title={t(`sanSimple.setup.item.${i.key}`, { defaultValue: i.key })}
                    subtitle={sub}
                    right={<Badge testID={`setup-badge-${i.key}`} label={i.ok ? t('sanSimple.setup.done') : t(`sanSimple.setup.${i.severity}`)} tone={i.ok ? 'success' : i.severity === 'required' ? 'danger' : 'warning'} />}
                    onPress={target ? () => router.push(target as never) : undefined}
                  />
                );
              })}
            </>
          )
        }
      </QueryBlock>
    </Screen>
  );
}
