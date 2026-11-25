// Guests: the registrar lists everyone (search, create, families); the room keeper and the doctor
// only find guests by typing at least two characters, with no organisation, families or add button.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { Avatar, Badge, Button, Card, EmptyState, ListRow, PageHeader, Screen, SearchField, Segmented, Text } from '@/ui';
import { guestsInfinite } from '../api/queries';
import { CredentialsSheet, type CredentialsShown } from '../components/CredentialsSheet';
import { FamiliesPanel } from '../components/FamiliesPanel';
import { GuestSheet } from '../components/GuestSheet';
import { Denied, PagedBlock, useSanAccess, useSanWrite } from '../components/common';
import type { GuestLite } from '../types';
import { fmtDate, fmtMoney, stayTone } from '../utils/sanatorium';

export default function GuestsScreen() {
  const { t } = useTranslation();
  const allowed = useSanAccess('registrar', 'room_keeper', 'doctor');
  const registrar = useSanAccess('registrar');
  const canAdd = useSanWrite('registrar');
  const [seg, setSeg] = useState<'guests' | 'families'>('guests');
  const [term, setTerm] = useState('');
  const debounced = useDebouncedValue(term);
  const len = debounced.trim().length;
  // Non-registrars must type two characters (the server refuses a bare list); the registrar may list everyone.
  const searchOk = registrar ? len === 0 || len >= 2 : len >= 2;
  const q = useInfiniteQuery(guestsInfinite(debounced, allowed && seg === 'guests' && searchOk));
  const [edit, setEdit] = useState<GuestLite | 'new' | null>(null);
  const [creds, setCreds] = useState<CredentialsShown | null>(null);
  if (!allowed) return <Denied />;
  const showFamilies = registrar && seg === 'families';
  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()} testID="sanatorium-guests-screen">
      <PageHeader title={t('sanatorium.nav.guests')} right={canAdd && !showFamilies ? <Button testID="guest-add" label={t('sanatorium.add')} icon="plus" size="sm" onPress={() => setEdit('new')} /> : undefined} />
      {registrar && (
        <Segmented
          testID="guests-seg"
          value={seg}
          onChange={setSeg}
          options={[{ value: 'guests', label: t('sanatorium.nav.guests') }, { value: 'families', label: t('sanatorium.families') }]}
        />
      )}
      {showFamilies ? (
        <FamiliesPanel />
      ) : (
        <>
          <SearchField testID="guests-search" value={term} onChangeText={setTerm} placeholder={t('sanatorium.guestSearch')} />
          {!searchOk ? (
            <View testID="guests-type-hint">
              <EmptyState title={t('sanGuests.typeToSearch')} message={t('sanatorium.guestSearchHint')} />
            </View>
          ) : (
            <PagedBlock query={q}>
              {(items) =>
                items.length === 0 ? (
                  <EmptyState title={t('sanatorium.noGuests')} />
                ) : (
                  <Card>
                    {items.map((g) => (
                      <GuestRow key={g.id} g={g} registrar={registrar} />
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

function GuestRow({ g, registrar }: { g: GuestLite; registrar: boolean }) {
  const { t } = useTranslation();
  const st = g.active_stay;
  const sub = [
    g.phone,
    g.age != null ? `${g.age} ${t('sanatorium.yearsOld')}` : g.birth_date ? fmtDate(g.birth_date) : null,
    registrar ? g.organization_name : null,
    registrar ? g.family_name : null,
  ].filter(Boolean).join(' · ');
  return (
    <ListRow
      testID={`guest-${g.id}`}
      title={g.full_name}
      subtitle={sub}
      left={<Avatar name={g.full_name} size={40} />}
      below={
        st || Number(g.debt_left) > 0 ? (
          <View style={styles.stay} testID={`guest-stay-${g.id}`}>
            {st && <Badge label={t(`sanatorium.stayStatus.${st.status}`)} tone={stayTone(st.status)} />}
            {st && (
              <Text variant="caption" tone="muted">
                {[st.room ? `${t('sanatorium.room')} ${st.room.number}` : null, `${fmtDate(st.planned_from)} → ${fmtDate(st.planned_to)}`].filter(Boolean).join(' · ')}
              </Text>
            )}
            {registrar && Number(g.debt_left) > 0 && <Badge testID={`guest-debt-${g.id}`} label={`${t('sanatorium.debt')}: ${fmtMoney(g.debt_left)}`} tone="danger" />}
          </View>
        ) : undefined
      }
      chevron
      onPress={() => router.push({ pathname: '/sanatorium-guest', params: { id: String(g.id) } })}
    />
  );
}

const styles = StyleSheet.create({ stay: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 2 } });
