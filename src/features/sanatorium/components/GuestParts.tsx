// Small pieces of the guest profile / lists: stay money line, appointment notes, chronology.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Text } from '@/ui';
import { toneColors } from '@/ui/Chip';
import type { Appointment, GuestEvent, GuestType, PaymentStatus } from '../types';
import { fmtDateTime, fmtMoney } from '../utils/sanatorium';
import { timelineKind } from '../utils/guests';

export const PAY_TONE = { unpaid: 'danger', partial: 'warning', paid: 'success' } as const;
export const TYPE_TONE: Record<GuestType, 'brand' | 'info' | 'success' | 'neutral'> = { treatment: 'brand', rest: 'success', hotel: 'neutral', contract: 'info' };

/** Guest type chip (treatment / rest / hotel / contract). */
export function TypeBadge({ type, testID }: { type: GuestType; testID?: string }) {
  const { t } = useTranslation();
  return <Badge testID={testID} label={t(`sanatorium.guestType.${type}`)} tone={TYPE_TONE[type] ?? 'neutral'} />;
}

/** Payment status chip; nothing when the server did not send money (non-registrar). */
export function PayBadge({ status, testID }: { status?: PaymentStatus | null; testID?: string }) {
  const { t } = useTranslation();
  if (!status) return null;
  return <Badge testID={testID} label={t(`sanatorium.pay.${status}`)} tone={PAY_TONE[status]} />;
}

/** «Total 1 200 000 · Debt 300 000 [Partial]» for the registrar. */
export function StayMoneyLine({ total, debt, status, id }: { total?: string; debt?: string; status?: PaymentStatus; id: number }) {
  const { t } = useTranslation();
  if (total == null && status == null) return null;
  const owes = Number(debt) > 0;
  return (
    <View style={styles.money} testID={`stay-money-${id}`}>
      <Text variant="caption" tone="muted">{t('sanatorium.total')}: {fmtMoney(total)}</Text>
      <Text variant="caption" tone={owes ? 'danger' : 'muted'} testID={`stay-debt-${id}`}>{t('sanatorium.debt')}: {fmtMoney(debt)}</Text>
      <PayBadge status={status} testID={`stay-pay-${id}`} />
    </View>
  );
}

/** Referral note, complaint, diagnosis and recommendation of one appointment (only those present). */
export function ApptNotes({ appt }: { appt: Appointment }) {
  const { t } = useTranslation();
  const rows: [string, string | null | undefined][] = [
    [t('sanGuests.referralNote'), appt.referral_note],
    [t('sanatorium.complaint'), appt.complaint],
    [t('sanatorium.diagnosis'), appt.diagnosis],
    [t('sanatorium.recommendation'), appt.recommendation],
  ];
  const shown = rows.filter(([, v]) => !!v);
  if (shown.length === 0) return null;
  return (
    <View style={styles.notes} testID={`appt-notes-${appt.id}`}>
      {shown.map(([label, value]) => (
        <View key={label}>
          <Text variant="caption" tone="muted">{label}</Text>
          <Text variant="label">{value}</Text>
        </View>
      ))}
    </View>
  );
}

/** A chronology row: round icon in the event's tone, title, details, who and when. */
export function EventLine({ e, last }: { e: GuestEvent; last: boolean }) {
  const { colors: c } = useTheme();
  const def = timelineKind(e.kind);
  const tone = toneColors(c, def.tone);
  return (
    <View style={styles.event} testID={`event-${e.id}`}>
      <View style={styles.rail}>
        <View style={[styles.dot, { backgroundColor: tone.soft }]} testID={`event-icon-${e.kind}`}>
          <Icon name={def.icon} size={14} color={tone.fg} />
        </View>
        {!last && <View style={[styles.line, { backgroundColor: c.border }]} />}
      </View>
      <View style={styles.body}>
        <Text variant="body" weight="600">{e.title}</Text>
        {!!e.details && <Text variant="caption" tone="muted">{e.details}</Text>}
        <Text variant="caption" tone="subtle">{[fmtDateTime(e.created_at), e.actor_name].filter(Boolean).join(' · ')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  money: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 2 },
  notes: { gap: 4, paddingLeft: 4, paddingBottom: 8 },
  event: { flexDirection: 'row', gap: 10 },
  rail: { width: 28, alignItems: 'center' },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  line: { flex: 1, width: 2, marginTop: 2 },
  body: { flex: 1, paddingBottom: 14 },
});
