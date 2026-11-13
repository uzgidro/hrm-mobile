// Registrar: guest search -> profile with the chronology.
import React, { useState } from 'react';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { Avatar, Card, EmptyState, ListRow, PageHeader, Screen, SearchField, Text } from '@/ui';
import { guestsQuery } from '../api/queries';
import { Denied, QueryBlock, useSanAccess } from '../components/common';

export default function GuestsScreen() {
  const { t } = useTranslation();
  const allowed = useSanAccess('registrar');
  const [term, setTerm] = useState('');
  const debounced = useDebouncedValue(term);
  const searching = debounced.trim().length >= 2;
  const q = useQuery({ ...guestsQuery(debounced), enabled: allowed && searching });
  if (!allowed) return <Denied />;
  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => searching && void q.refetch()} testID="sanatorium-guests-screen">
      <PageHeader title={t('sanatorium.nav.guests')} />
      <SearchField testID="guests-search" value={term} onChangeText={setTerm} placeholder={t('sanatorium.guestSearch')} />
      {!searching ? (
        <Text variant="body" tone="muted" style={{ marginTop: 16 }}>{t('sanatorium.guestSearchHint')}</Text>
      ) : (
        <QueryBlock query={q}>
          {(items) =>
            items.length === 0 ? (
              <EmptyState title={t('sanatorium.noGuests')} />
            ) : (
              <Card>
                {items.map((g) => (
                  <ListRow
                    key={g.id}
                    testID={`guest-${g.id}`}
                    title={g.full_name}
                    subtitle={[g.phone, g.organization_name].filter(Boolean).join(' · ')}
                    left={<Avatar name={g.full_name} size={40} />}
                    chevron
                    onPress={() => router.push({ pathname: '/sanatorium-guest', params: { id: String(g.id) } })}
                  />
                ))}
              </Card>
            )
          }
        </QueryBlock>
      )}
    </Screen>
  );
}
