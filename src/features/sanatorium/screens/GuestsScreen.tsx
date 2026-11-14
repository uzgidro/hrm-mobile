// Registrar: guests (search, create) and families.
import React, { useState } from 'react';
import { router } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { Avatar, Button, Card, EmptyState, ListRow, PageHeader, Screen, SearchField, Segmented } from '@/ui';
import { guestsInfinite } from '../api/queries';
import { CredentialsSheet, type CredentialsShown } from '../components/CredentialsSheet';
import { FamiliesPanel } from '../components/FamiliesPanel';
import { GuestSheet } from '../components/GuestSheet';
import { Denied, PagedBlock, useSanAccess } from '../components/common';
import type { GuestLite } from '../types';

export default function GuestsScreen() {
  const { t } = useTranslation();
  const allowed = useSanAccess('registrar');
  const [seg, setSeg] = useState<'guests' | 'families'>('guests');
  const [term, setTerm] = useState('');
  const debounced = useDebouncedValue(term);
  // The registrar may list everyone; an empty search shows the latest guests.
  const q = useInfiniteQuery(guestsInfinite(debounced, allowed && seg === 'guests' && (debounced.trim().length === 0 || debounced.trim().length >= 2)));
  const [edit, setEdit] = useState<GuestLite | 'new' | null>(null);
  const [creds, setCreds] = useState<CredentialsShown | null>(null);
  if (!allowed) return <Denied />;
  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()} testID="sanatorium-guests-screen">
      <PageHeader title={t('sanatorium.nav.guests')} right={<Button testID="guest-add" label={t('sanatorium.add')} icon="plus" size="sm" onPress={() => setEdit('new')} />} />
      <Segmented
        testID="guests-seg"
        value={seg}
        onChange={setSeg}
        options={[{ value: 'guests', label: t('sanatorium.nav.guests') }, { value: 'families', label: t('sanatorium.families') }]}
      />
      {seg === 'families' ? (
        <FamiliesPanel />
      ) : (
        <>
          <SearchField testID="guests-search" value={term} onChangeText={setTerm} placeholder={t('sanatorium.guestSearch')} />
          {debounced.trim().length === 1 ? null : (
            <PagedBlock query={q}>
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
            </PagedBlock>
          )}
        </>
      )}
      <GuestSheet
        guest={edit}
        onClose={() => setEdit(null)}
        onSaved={(i) => {
          if (i.credentials) setCreds({ guestName: i.guestName, credentials: i.credentials, guestId: i.id });
        }}
      />
      <CredentialsSheet creds={creds} onClose={() => setCreds(null)} />
    </Screen>
  );
}
