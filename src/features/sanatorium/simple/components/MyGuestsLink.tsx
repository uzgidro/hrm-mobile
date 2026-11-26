// Doctor / nurse shortcut «Mening mehmonlarim» on the home screen; hidden when the server has no such list.
import React from 'react';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ListRow } from '@/ui';
import { myGuestsQuery } from '../api';

export function MyGuestsLink({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation();
  const q = useQuery(myGuestsQuery(enabled));
  if (!enabled || !q.data) return null;
  return <ListRow pressable chevron testID="link-my-guests" title={t('sanSimple.my.title')} badge={q.data.length || undefined} subtitle={t('sanSimple.my.sub', { count: q.data.length })} onPress={() => router.push('/sanatorium-my-guests')} />;
}
