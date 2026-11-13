// Guest profile. What it shows follows the role: everyone sees the name, phone and stays;
// doctors / nurses / registrar add appointments and procedures; doctors / registrar the
// chronology; the registrar the contact details (passport shown masked only).
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Badge, Card, EmptyState, ListRow, PageHeader, ProgressBar, Screen, SectionHeader, Text } from '@/ui';
import { guestQuery } from '../api/queries';
import { ApptRow } from '../components/ApptRow';
import { Denied, PhoneLink, QueryBlock, useSanAccess } from '../components/common';
import type { GuestEvent, GuestProfile } from '../types';
import { fmtDate, fmtDateTime, maskPassport, procTone, stayTone } from '../utils/sanatorium';

export default function GuestScreen() {
  const { t } = useTranslation();
  const allowed = useSanAccess();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Number(params.id ?? 0);
  const q = useQuery({ ...guestQuery(id), enabled: allowed && id > 0 });
  if (!allowed) return <Denied />;
  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()} testID="sanatorium-guest-screen">
      <PageHeader title={t('sanatorium.guest')} />
      <QueryBlock query={q}>{(p) => <Profile p={p} />}</QueryBlock>
    </Screen>
  );
}

function Profile({ p }: { p: GuestProfile }) {
  const { t } = useTranslation();
  const g = p.guest;
  const facts = [
    g.age != null ? `${g.age} ${t('sanatorium.yearsOld')}` : null,
    g.gender ? t(`sanatorium.gender.${g.gender}`) : null,
    g.organization_name,
  ].filter(Boolean);
  return (
    <View style={styles.stack}>
      <Card>
        <View style={styles.head}>
          <Avatar name={g.full_name} size={52} />
          <View style={styles.flex}>
            <Text variant="title">{g.full_name}</Text>
            {facts.length > 0 && <Text variant="caption" tone="muted">{facts.join(' · ')}</Text>}
            <PhoneLink phone={g.phone} />
          </View>
        </View>
        {(!!g.birth_date || !!g.passport || !!g.address || !!g.login_code) && (
          <View style={styles.details}>
            {!!g.birth_date && <Fact label={t('sanatorium.birthDate')} value={fmtDate(g.birth_date)} />}
            {!!g.passport && <Fact label={t('sanatorium.passport')} value={maskPassport(g.passport)} />}
            {!!g.address && <Fact label={t('sanatorium.address')} value={g.address} />}
            {!!g.login_code && <Fact label={t('sanatorium.loginCode')} value={g.login_code} />}
          </View>
        )}
      </Card>

      <SectionHeader title={t('sanatorium.stays')} />
      <Card>
        {p.stays.length === 0 && <Text variant="body" tone="muted">{t('sanatorium.noStays')}</Text>}
        {p.stays.map((s) => (
          <ListRow
            key={s.id}
            title={`${fmtDate(s.planned_from)} → ${fmtDate(s.planned_to)}`}
            subtitle={[t(`sanatorium.guestType.${s.guest_type}`), s.room ? `${t('sanatorium.room')} ${s.room.number}` : null].filter(Boolean).join(' · ')}
            right={<Badge label={t(`sanatorium.stayStatus.${s.status}`)} tone={stayTone(s.status)} />}
          />
        ))}
      </Card>

      {p.appointments && (
        <>
          <SectionHeader title={t('sanatorium.appointments')} />
          <Card>
            {p.appointments.length === 0 && <Text variant="body" tone="muted">{t('sanatorium.noAppointments')}</Text>}
            {p.appointments.map((a) => (
              <ApptRow
                key={a.id}
                appt={{ ...a, guest: g }}
                onPress={() => router.push({ pathname: '/sanatorium-appointment', params: { id: String(a.id), guestId: String(g.id) } })}
              />
            ))}
          </Card>
        </>
      )}

      {p.procedures && p.procedures.length > 0 && (
        <>
          <SectionHeader title={t('sanatorium.procedures')} />
          <Card>
            {p.procedures.map((pr) => (
              <View key={pr.id} style={styles.proc}>
                <View style={styles.row}>
                  <Text variant="body" weight="600" style={styles.flex}>{pr.name}</Text>
                  <Badge label={t(`sanatorium.procStatus.${pr.status}`)} tone={procTone(pr.status)} />
                </View>
                <ProgressBar value={pr.sessions_total ? pr.sessions_done / pr.sessions_total : 0} />
                <Text variant="caption" tone="muted">{pr.sessions_done}/{pr.sessions_total} {t('sanatorium.sessions')}</Text>
              </View>
            ))}
          </Card>
        </>
      )}

      {p.family_members && p.family_members.length > 1 && (
        <>
          <SectionHeader title={t('sanatorium.family')} />
          <Card>
            {p.family_members.filter((m) => m.id !== g.id).map((m) => (
              <ListRow
                key={m.id}
                title={m.full_name}
                subtitle={m.relation ? t(`sanatorium.relation.${m.relation}`) : undefined}
                chevron
                onPress={() => router.push({ pathname: '/sanatorium-guest', params: { id: String(m.id) } })}
              />
            ))}
          </Card>
        </>
      )}

      {p.events && (
        <>
          <SectionHeader title={t('sanatorium.chronology')} />
          <Card>
            {p.events.length === 0 && <Text variant="body" tone="muted">{t('sanatorium.noEvents')}</Text>}
            {p.events.map((e, i) => <EventLine key={e.id} e={e} last={i === p.events!.length - 1} />)}
          </Card>
        </>
      )}
      {!p.appointments && !p.events && <EmptyState title={t('sanatorium.limitedView')} />}
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text variant="caption" tone="muted" style={styles.factLabel}>{label}</Text>
      <Text variant="body" style={styles.flex}>{value}</Text>
    </View>
  );
}

/** A timeline row: dot + line on the left, title / details / who and when on the right. */
function EventLine({ e, last }: { e: GuestEvent; last: boolean }) {
  const { colors: c } = useTheme();
  return (
    <View style={styles.event} testID={`event-${e.id}`}>
      <View style={styles.rail}>
        <View style={[styles.dot, { backgroundColor: c.brand }]} />
        {!last && <View style={[styles.line, { backgroundColor: c.border }]} />}
      </View>
      <View style={[styles.flex, styles.eventBody]}>
        <Text variant="body" weight="600">{e.title}</Text>
        {!!e.details && <Text variant="caption" tone="muted">{e.details}</Text>}
        <Text variant="caption" tone="subtle">{[fmtDateTime(e.created_at), e.actor_name].filter(Boolean).join(' · ')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 4 },
  flex: { flex: 1 },
  head: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  details: { marginTop: 12, gap: 6 },
  fact: { flexDirection: 'row', gap: 8 },
  factLabel: { width: 96 },
  proc: { paddingVertical: 8, gap: 6 },
  event: { flexDirection: 'row', gap: 10 },
  rail: { width: 14, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  line: { flex: 1, width: 2, marginTop: 2 },
  eventBody: { paddingBottom: 14 },
});
