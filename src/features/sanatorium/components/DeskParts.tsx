// Doctor-desk building blocks (web DeskDialogs + SanDeskPage): finish sheet, a guest's medical history,
// the resolved-guest card (scan / ID lookup) and the appointment card with its quick actions.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { Badge, Button, Card, EmptyState, ErrorState, LoadingView, ProgressBar, Sheet, Text } from '@/ui';
import { useFinishAppointment } from '../api/mutations';
import { guestQuery } from '../api/queries';
import type { Appointment, Procedure, QrResolveResult } from '../types';
import { apptTone, fmtDate, fmtDateTime, fmtTime, procTone, sanErrorMessage, stayTone } from '../utils/sanatorium';
import { FINISH_MAX, finishBody, finishError } from '../utils/staffParity';
import { ErrorLine } from './forms';
import { useSingleFlight } from '../simple/useSingleFlight';

// ── Finish ──
export function FinishSheet({ appt, onClose }: { appt: Appointment | null; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet visible={!!appt} onClose={onClose} title={t('sanatorium.finish')} scroll>
      {appt && <FinishForm key={appt.id} appt={appt} onClose={onClose} />}
    </Sheet>
  );
}

function FinishForm({ appt, onClose }: { appt: Appointment; onClose: () => void }) {
  const { t } = useTranslation();
  const finish = useFinishAppointment();
  const flight = useSingleFlight();
  const [f, setF] = useState({ complaint: appt.complaint ?? '', diagnosis: appt.diagnosis ?? '', recommendation: appt.recommendation ?? '' });
  const [error, setError] = useState<string | null>(null);
  const bad = finishError(f);
  const submit = async () => {
    if (bad) return setError(t(bad === 'empty' ? 'sanStaff.desk.finishEmpty' : 'sanStaff.desk.tooLong', { max: FINISH_MAX }));
    try {
      await finish.mutateAsync({ id: appt.id, ...finishBody(f) });
      toast.success(t('sanatorium.appointmentFinished'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  const set = (k: keyof typeof f) => (v: string) => {
    setF((p) => ({ ...p, [k]: v }));
    setError(null);
  };
  return (
    <View style={styles.body} testID="finish-sheet">
      <Text variant="caption" tone="muted">{[appt.guest?.full_name, fmtTime(appt.scheduled_at)].filter(Boolean).join(' · ')}</Text>
      <FormInput label={t('sanatorium.complaint')} value={f.complaint} onChangeText={set('complaint')} multiline maxLength={FINISH_MAX} testID="finish-complaint" />
      <FormInput label={t('sanatorium.diagnosis')} value={f.diagnosis} onChangeText={set('diagnosis')} multiline maxLength={FINISH_MAX} testID="finish-diagnosis" />
      <FormInput label={t('sanatorium.recommendation')} value={f.recommendation} onChangeText={set('recommendation')} multiline maxLength={FINISH_MAX} testID="finish-recommendation" />
      <ErrorLine message={error} testID="finish-error" />
      <Button testID="finish-save" label={t('sanatorium.finish')} full disabled={!!bad} loading={finish.isPending || flight.pending} onPress={() => void flight.run(submit)} />
    </View>
  );
}

// ── History ──
function ProcLine({ p }: { p: Procedure }) {
  const { t } = useTranslation();
  return (
    <Card testID={`hist-proc-${p.id}`}>
      <View style={styles.row}>
        <Text variant="heading" style={styles.flex}>{p.name}</Text>
        <Badge label={t(`sanatorium.procStatus.${p.status}`)} tone={procTone(p.status)} />
      </View>
      <ProgressBar value={p.sessions_total ? p.sessions_done / p.sessions_total : 0} />
      <Text variant="caption" tone="muted">
        {[`${p.sessions_done}/${p.sessions_total} ${t('sanatorium.sessions')}`, p.time_text, p.place, p.start_date ? `${fmtDate(p.start_date)}${p.end_date ? ` – ${fmtDate(p.end_date)}` : ''}` : null].filter(Boolean).join(' · ')}
      </Text>
    </Card>
  );
}

/** All appointments (with findings) and procedures of a guest. */
export function MedicalHistory({ appointments, procedures }: { appointments: Appointment[]; procedures: Procedure[] }) {
  const { t } = useTranslation();
  const sorted = [...appointments].sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));
  return (
    <View style={styles.stack} testID="medical-history">
      <Text variant="heading">{t('sanatorium.appointments')}</Text>
      {sorted.length === 0 && <EmptyState title={t('sanatorium.noAppointments')} />}
      {sorted.map((a) => (
        <Card key={a.id} testID={`hist-appt-${a.id}`}>
          <View style={styles.row}>
            <Text variant="label" tone="brand" style={styles.flex}>{`${fmtDateTime(a.scheduled_at)}${a.specialty ? ` · ${a.specialty}` : ''}${a.doctor?.full_name ? ` · ${a.doctor.full_name}` : ''}`}</Text>
            <Badge label={t(`sanatorium.apptStatus.${a.status}`)} tone={apptTone(a.status)} />
          </View>
          {!!a.referral_note && <Text variant="body" tone="muted">{t('sanatorium.referralNote')}: {a.referral_note}</Text>}
          {!!a.complaint && <Text variant="body">{t('sanatorium.complaint')}: {a.complaint}</Text>}
          {!!a.diagnosis && <Text variant="body">{t('sanatorium.diagnosis')}: {a.diagnosis}</Text>}
          {!!a.recommendation && <Text variant="body">{t('sanatorium.recommendation')}: {a.recommendation}</Text>}
        </Card>
      ))}
      <Text variant="heading" style={styles.gap}>{t('sanatorium.procedures')}</Text>
      {procedures.length === 0 && <EmptyState title={t('sanatorium.noProcedures')} />}
      {procedures.map((p) => <ProcLine key={p.id} p={p} />)}
    </View>
  );
}

export function HistorySheet({ guest, onClose }: { guest: { id: number; name: string } | null; onClose: () => void }) {
  const { t } = useTranslation();
  const q = useQuery({ ...guestQuery(guest?.id ?? 0), enabled: !!guest });
  return (
    <Sheet visible={!!guest} onClose={onClose} title={guest ? `${t('sanStaff.desk.history')} · ${guest.name}` : undefined} scroll>
      {q.isPending ? <LoadingView rows={3} /> : q.isError || !q.data ? <ErrorState onRetry={() => void q.refetch()} /> : (
        <MedicalHistory appointments={q.data.appointments ?? []} procedures={q.data.procedures ?? []} />
      )}
    </Sheet>
  );
}

// ── Resolved guest (QR scan / ID lookup) ──
function InfoRow({ label, value, testID }: { label: string; value?: string | null; testID?: string }) {
  return (
    <View style={styles.info}>
      <Text variant="caption" tone="muted">{label}</Text>
      <Text variant="body" testID={testID}>{value || '—'}</Text>
    </View>
  );
}

/** Guest card of a resolved QR / ID: contact, age, room, stay status and period; opens the profile or the history. */
export function ResolvedGuestSheet({ result, onClose, onHistory }: { result: QrResolveResult | null; onClose: () => void; onHistory: (g: { id: number; name: string }) => void }) {
  const { t } = useTranslation();
  const g = result?.guest;
  const s = result?.active_stay ?? null;
  return (
    <Sheet visible={!!result} onClose={onClose} title={g?.full_name} scroll>
      {g && (
        <View style={styles.body} testID="resolved-guest">
          <Text variant="caption" tone="muted">{t('sanStaff.desk.guestCard')}</Text>
          <InfoRow label={t('sanatorium.phone')} value={g.phone} testID="rg-phone" />
          <InfoRow label={t('sanStaff.desk.age')} value={g.age != null ? String(g.age) : null} testID="rg-age" />
          <InfoRow label={t('sanatorium.room')} value={s?.room ? `${s.room.number}${s.room.building ? ` · ${s.room.building}` : ''}` : null} testID="rg-room" />
          <View style={styles.info}>
            <Text variant="caption" tone="muted">{t('sanatorium.statusLabel')}</Text>
            {s ? <Badge label={t(`sanatorium.stayStatus.${s.status}`)} tone={stayTone(s.status)} testID="rg-status" /> : <Text variant="body" testID="rg-status">{t('sanStaff.desk.noStay')}</Text>}
          </View>
          {s && <InfoRow label={t('sanatorium.period')} value={`${fmtDate(s.planned_from)} — ${fmtDate(s.planned_to)}`} testID="rg-period" />}
          <Button
            testID="rg-open"
            label={t('sanStaff.desk.openGuest')}
            full
            onPress={() => {
              onClose();
              router.push({ pathname: '/sanatorium-guest', params: { id: String(g.id) } });
            }}
          />
          <Button testID="rg-history" label={t('sanStaff.desk.history')} variant="soft" full onPress={() => { onClose(); onHistory({ id: g.id, name: g.full_name }); }} />
        </View>
      )}
    </Sheet>
  );
}

// ── Appointment card with quick actions ──
export type DeskAction = 'finish' | 'refer' | 'procedure' | 'history';

export function DeskApptCard({ appt, onAction, onOpen }: { appt: Appointment; onAction: (a: DeskAction, appt: Appointment) => void; onOpen: () => void }) {
  const { t } = useTranslation();
  const sub = [appt.specialty, appt.room_number ? `${t('sanatorium.room')} ${appt.room_number}` : null, `${appt.duration_min} ${t('sanatorium.min')}`].filter(Boolean).join(' · ');
  return (
    <Card testID={`appt-${appt.id}`}>
      <View style={styles.row}>
        <Text variant="heading" tone="brand">{fmtTime(appt.scheduled_at)}</Text>
        <View style={styles.flex}>
          <Text variant="heading" numberOfLines={2} onPress={onOpen} testID={`appt-open-${appt.id}`}>{appt.guest?.full_name ?? `#${appt.guest_id}`}</Text>
          <Text variant="caption" tone="muted">{sub}</Text>
        </View>
        <Badge label={t(`sanatorium.apptStatus.${appt.status}`)} tone={apptTone(appt.status)} />
      </View>
      {!!appt.referral_note && <Text variant="body" tone="muted" testID={`appt-note-${appt.id}`}>{appt.referral_note}</Text>}
      {appt.status === 'done' && (!!appt.diagnosis || !!appt.recommendation) && (
        <View style={styles.findings} testID={`appt-findings-${appt.id}`}>
          {!!appt.diagnosis && <Text variant="caption"><Text variant="label">{t('sanatorium.diagnosis')}: </Text>{appt.diagnosis}</Text>}
          {!!appt.recommendation && <Text variant="caption"><Text variant="label">{t('sanatorium.recommendation')}: </Text>{appt.recommendation}</Text>}
        </View>
      )}
      <View style={styles.actions}>
        {appt.status === 'scheduled' && <Button testID={`appt-finish-${appt.id}`} label={t('sanStaff.desk.finish')} icon="check" size="sm" onPress={() => onAction('finish', appt)} />}
        <Button testID={`appt-refer-${appt.id}`} label={t('sanStaff.desk.refer')} variant="soft" size="sm" onPress={() => onAction('refer', appt)} />
        <Button testID={`appt-proc-${appt.id}`} label={t('sanStaff.desk.procedure')} variant="soft" size="sm" onPress={() => onAction('procedure', appt)} />
        <Button testID={`appt-history-${appt.id}`} label={t('sanStaff.desk.history')} variant="ghost" size="sm" onPress={() => onAction('history', appt)} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { gap: 6, paddingBottom: 8 },
  stack: { gap: 8 },
  gap: { marginTop: 8 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 4 },
  info: { gap: 2, paddingVertical: 2 },
  findings: { gap: 2, marginTop: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
});
