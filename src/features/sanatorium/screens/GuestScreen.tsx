// Guest profile. What it shows follows the role: everyone sees the name, phone and stays;
// doctors / nurses / registrar add appointments and procedures; doctors / registrar the
// chronology; the registrar the contact details (passport shown masked only).
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/store/authStore';
import { Avatar, Button, Badge, Card, EmptyState, ListRow, PageHeader, ProgressBar, Screen, SectionHeader, Text } from '@/ui';
import { useResetCredentials } from '../api/mutations';
import { guestQuery } from '../api/queries';
import { AddToFamilySheet } from '../components/AddToFamilySheet';
import { AppointmentSheet } from '../components/AppointmentSheet';
import { BookingSheet } from '../components/BookingSheet';
import { CredentialsSheet, type CredentialsShown } from '../components/CredentialsSheet';
import { GuestCardSheet } from '../components/GuestCardSheet';
import { GuestSheet } from '../components/GuestSheet';
import { ApptNotes, EventLine, StayMoneyLine, TypeBadge } from '../components/GuestParts';
import { ProcedureEditSheet } from '../components/ProcedureEditSheet';
import { sanMeQuery } from '../api/sections2';
import { StayDietSheet, canEditStayDiet } from '../components/sections2/DietParts';
import { ScheduleProcedureSheet } from '../components/sections2/Schedule';
import { StayDocumentsCard } from '../components/sections2/StayDocuments';
import { useSimpleAvailable } from '../simple/useSimpleAvailable';
import { useSanFeatures } from '../utils/features';
import { arriveTarget } from '../utils/guests';
import { ApptRow } from '../components/ApptRow';
import { Denied, PhoneLink, QueryBlock, useSanAccess } from '../components/common';
import type { GuestProfile, Procedure } from '../types';
import { fmtDate, canSanWrite, fmtDateTime, hasSanRole, maskPassport, procTone, sanErrorMessage, stayTone } from '../utils/sanatorium';

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
  const user = useAuthStore((s) => s.user);
  // Write gates: false for the view-only chairman, so no edit / booking / procedure control is drawn.
  const registrar = canSanWrite(user, 'registrar');
  const canEditProc = canSanWrite(user, 'doctor', 'registrar');
  const canBook = canSanWrite(user, 'registrar', 'doctor', 'nurse');
  const reset = useResetCredentials();
  const [editing, setEditing] = useState(false);
  const [booking, setBooking] = useState(false);
  const [apptStay, setApptStay] = useState<number | null>(null);
  const [proc, setProc] = useState<Procedure | null>(null);
  const [schedProc, setSchedProc] = useState<Procedure | null>(null);
  const feat = useSanFeatures();
  const scheduleOn = feat.on('procedure_schedule');
  const cabinetOn = feat.on('guest_cabinet');
  const telegramOn = feat.on('telegram_bot');
  const [family, setFamily] = useState(false);
  // The arrival wizard exists only on a server that has the simplified flow.
  const simple = useSimpleAvailable(registrar);
  const [creds, setCreds] = useState<CredentialsShown | null>(null);
  const [card, setCard] = useState(false);
  const g = p.guest;
  const liveStay = p.stays.find((s) => s.status === 'booked' || s.status === 'checked_in');
  // The attending doctor keeps the diet and the allergies of the guest who lives here (the registrar has them on the stay).
  const [dietOpen, setDietOpen] = useState(false);
  const isDoctor = hasSanRole(user, 'doctor');
  const me = useQuery(sanMeQuery(isDoctor && feat.on('diet')));
  const dietStay = isDoctor && feat.on('diet') && liveStay && canEditStayDiet(user, me.data, liveStay) ? liveStay : null;
  const resetLogin = async () => {
    const ok = await confirm({ title: t('sanatorium.resetLogin'), message: t('sanatorium.resetLoginInfo'), confirmLabel: t('sanatorium.resetLogin'), cancelLabel: t('common.cancel'), destructive: true });
    if (!ok) return;
    try {
      const c = await reset.mutateAsync(g.id);
      setCreds({ guestName: g.full_name, credentials: c, guestId: g.id });
      reset.reset();
    } catch (e) {
      toast.error(sanErrorMessage(e, t('errors.generic')));
    }
  };
  const arrive = () => {
    const tgt = arriveTarget(g.id, p.stays);
    if (tgt.kind === 'stay') router.push({ pathname: '/sanatorium-stay', params: { id: String(tgt.id) } });
    else router.push({ pathname: '/sanatorium-arrive', params: tgt.params });
  };
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
        {(!!g.birth_date || !!g.passport || !!g.address || !!g.login_code || !!g.note || !!g.created_at || g.has_password !== undefined || g.telegram_linked !== undefined) && (
          <View style={styles.details}>
            {!!g.birth_date && <Fact label={t('sanatorium.birthDate')} value={fmtDate(g.birth_date)} />}
            {!!g.passport && <Fact label={t('sanatorium.passport')} value={maskPassport(g.passport)} />}
            {!!g.address && <Fact label={t('sanatorium.address')} value={g.address} />}
            {!!g.login_code && <Fact label={t('sanatorium.loginCode')} value={g.login_code} />}
            {cabinetOn && g.has_password !== undefined && <Fact label={t('sanGuests.cabinet')} value={g.has_password ? t('sanGuests.cabinetOn') : t('sanGuests.cabinetOff')} testID="guest-cabinet" />}
            {telegramOn && g.telegram_linked !== undefined && <Fact label={t('sanGuests.telegram')} value={g.telegram_linked ? t('sanatorium.yes') : t('sanatorium.no')} testID="guest-telegram" />}
            {!!g.created_at && <Fact label={t('sanGuests.registeredAt')} value={fmtDateTime(g.created_at)} testID="guest-registered" />}
            {!!g.note && <Fact label={t('sanatorium.notes')} value={g.note} testID="guest-note-text" />}
          </View>
        )}
      </Card>

      {(registrar || (canBook && liveStay)) && (
        <View style={styles.actions}>
          {registrar && <Button testID="guest-edit" label={t('sanatorium.edit')} variant="soft" size="sm" icon="edit" onPress={() => setEditing(true)} />}
          {registrar && <Button testID="guest-book" label={t('sanatorium.newBooking')} variant="soft" size="sm" icon="plus" onPress={() => setBooking(true)} />}
          {registrar && simple && <Button testID="guest-arrive" label={t('sanGuests.arrive')} size="sm" icon="check" onPress={arrive} />}
          {registrar && <Button testID="guest-family-add" label={t('sanGuests.addToFamily')} variant="soft" size="sm" icon="users" onPress={() => setFamily(true)} />}
          {registrar && <Button testID="guest-card" label={t('sanatorium.idCard')} variant="soft" size="sm" icon="qr" onPress={() => setCard(true)} />}
          {registrar && <Button testID="guest-reset" label={t('sanatorium.resetLogin')} variant="dangerGhost" size="sm" loading={reset.isPending} onPress={() => void resetLogin()} />}
          {dietStay && <Button testID="guest-diet" label={t('sanatorium.s2.dietAndAllergies')} variant="soft" size="sm" onPress={() => setDietOpen(true)} />}
          {canBook && liveStay && <Button testID="guest-appt" label={t('sanatorium.newAppointment')} variant="soft" size="sm" onPress={() => setApptStay(liveStay.id)} />}
        </View>
      )}

      <SectionHeader title={t('sanatorium.stays')} />
      <Card>
        {p.stays.length === 0 && <Text variant="body" tone="muted">{t('sanatorium.noStays')}</Text>}
        {p.stays.map((s) => (
          <ListRow
            key={s.id}
            title={`${fmtDate(s.planned_from)} → ${fmtDate(s.planned_to)}`}
            subtitle={s.room ? `${t('sanatorium.room')} ${s.room.number}` : t('sanatorium.noRoom')}
            testID={`guest-stay-${s.id}`}
            below={<StayMoneyLine id={s.id} total={s.total_amount} debt={s.debt} status={s.payment_status} />}
            titleAddon={<TypeBadge type={s.guest_type} />}
            right={<Badge label={t(`sanatorium.stayStatus.${s.status}`)} tone={stayTone(s.status)} />}
            chevron={hasSanRole(user, 'registrar', 'room_keeper')}
            onPress={hasSanRole(user, 'registrar', 'room_keeper') ? () => router.push({ pathname: '/sanatorium-stay', params: { id: String(s.id) } }) : undefined}
          />
        ))}
      </Card>

      {hasSanRole(user, 'doctor') && !registrar && p.stays.map((s) => <StayDocumentsCard key={`doc-${s.id}`} stay={s} />)}

      {p.appointments && (
        <>
          <SectionHeader title={t('sanatorium.appointments')} />
          <Card>
            {p.appointments.length === 0 && <Text variant="body" tone="muted">{t('sanatorium.noAppointments')}</Text>}
            {p.appointments.map((a) => (
              <React.Fragment key={a.id}>
                <ApptRow
                  appt={{ ...a, guest: g }}
                  onPress={() => router.push({ pathname: '/sanatorium-appointment', params: { id: String(a.id), guestId: String(g.id) } })}
                />
                <ApptNotes appt={a} />
              </React.Fragment>
            ))}
          </Card>
        </>
      )}

      {p.procedures && p.procedures.length > 0 && (
        <>
          <SectionHeader title={t('sanatorium.procedures')} />
          <Card>
            {p.procedures.map((pr) => (
              <Pressable key={pr.id} style={styles.proc} testID={`proc-row-${pr.id}`} disabled={!canEditProc} onPress={() => setProc(pr)}>
                <View style={styles.row}>
                  <Text variant="body" weight="600" style={styles.flex}>{pr.name}</Text>
                  <Badge label={t(`sanatorium.procStatus.${pr.status}`)} tone={procTone(pr.status)} />
                </View>
                <ProgressBar value={pr.sessions_total ? pr.sessions_done / pr.sessions_total : 0} />
                <Text variant="caption" tone="muted">{pr.sessions_done}/{pr.sessions_total} {t('sanatorium.sessions')}</Text>
                {scheduleOn && canEditProc && pr.status === 'active' && <Button testID={`proc-schedule-${pr.id}`} label={t('sanatorium.s2.schedule')} icon="calendar" size="sm" variant="soft" onPress={() => setSchedProc(pr)} />}
              </Pressable>
            ))}
          </Card>
        </>
      )}

      {((p.family_members && p.family_members.length > 1) || !!g.family_name) && (
        <>
          <SectionHeader title={g.family_name ? `${t('sanGuests.familyTitle')}: ${g.family_name}` : t('sanatorium.family')} />
          <Card testID="guest-family">
            {(p.family_members ?? []).filter((m) => m.id !== g.id).map((m) => (
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
      <GuestSheet guest={editing ? g : null} onClose={() => setEditing(false)} onSaved={() => {}} />
      <BookingSheet open={booking ? { guests: [g] } : null} onClose={() => setBooking(false)} onDone={(ids) => ids[0] && router.push({ pathname: '/sanatorium-stay', params: { id: String(ids[0]) } })} />
      <AddToFamilySheet guest={family ? { id: g.id, full_name: g.full_name } : null} onClose={() => setFamily(false)} />
      <AppointmentSheet stayId={apptStay} from={liveStay?.planned_from} to={liveStay?.planned_to} onClose={() => setApptStay(null)} />
      <StayDietSheet stay={dietOpen && dietStay ? dietStay : null} onClose={() => setDietOpen(false)} />
      <ProcedureEditSheet proc={proc} onClose={() => setProc(null)} />
      <ScheduleProcedureSheet procedure={schedProc} onClose={() => setSchedProc(null)} />
      <CredentialsSheet creds={creds} onClose={() => setCreds(null)} />
      <GuestCardSheet info={card ? { guestId: g.id, name: g.full_name, loginCode: g.login_code } : null} onClose={() => setCard(false)} />
    </View>
  );
}

function Fact({ label, value, testID }: { label: string; value: string; testID?: string }) {
  return (
    <View style={styles.fact} testID={testID}>
      <Text variant="caption" tone="muted" style={styles.factLabel}>{label}</Text>
      <Text variant="body" style={styles.flex}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 4 },
  flex: { flex: 1 },
  head: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  details: { marginTop: 12, gap: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  fact: { flexDirection: 'row', gap: 8 },
  factLabel: { width: 96 },
  proc: { paddingVertical: 8, gap: 6 },
});
