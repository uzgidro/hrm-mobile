// Accepting a request = booking: guest type, a room that has free beds for the whole period,
// dates, meals and the child discount. The server then creates the guest and the credentials.
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DatePickerModal } from '@/components/DatePicker';
import { PickerModal } from '@/components/PickerModal';
import { Button, Chip, SelectField, Sheet, Text, Toggle } from '@/ui';
import { useAcceptRequest } from '../api/mutations';
import { availabilityQuery } from '../api/queries';
import { GUEST_TYPES, type Credentials, type GuestType, type SanRequest } from '../types';
import { fmtDate, minFreeBeds, sanErrorMessage, todayIso } from '../utils/sanatorium';

export type Accepted = {
  guestName: string;
  /** null when the guest already existed and keeps the old login. */
  credentials: Credentials | null;
};

export function AcceptSheet({
  request,
  onClose,
  onAccepted,
}: {
  request: SanRequest | null;
  onClose: () => void;
  /** Called once with the credentials; the caller must not store them anywhere. */
  onAccepted: (a: Accepted) => void;
}) {
  const { t } = useTranslation();
  return (
    <Sheet visible={!!request} onClose={onClose} title={t('sanatorium.accept')} scroll>
      {request && <AcceptForm key={request.id} request={request} onAccepted={onAccepted} />}
    </Sheet>
  );
}

// Mounted per opening: dates default to the request's referral period.
function AcceptForm({ request, onAccepted }: { request: SanRequest; onAccepted: (a: Accepted) => void }) {
  const { t } = useTranslation();
  const accept = useAcceptRequest();
  const initFrom = request.referral_from ?? todayIso();
  const [type, setType] = useState<GuestType>(request.guest_type ?? 'treatment');
  const [from, setFrom] = useState(initFrom);
  const [to, setTo] = useState(request.referral_to ?? dayjs(initFrom).add(10, 'day').format('YYYY-MM-DD'));
  const [roomId, setRoomId] = useState<number | null>(null);
  const [meals, setMeals] = useState(true);
  const [child, setChild] = useState(false);
  const [pick, setPick] = useState<'from' | 'to' | 'room' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const valid = dayjs(to).isAfter(dayjs(from));
  const nights = Math.min(62, Math.max(1, dayjs(to).diff(dayjs(from), 'day')));
  const avail = useQuery(availabilityQuery(from, nights, valid));
  const rooms = useMemo(
    () =>
      (avail.data?.rooms ?? [])
        .filter((r) => !r.out_of_service)
        .map((r) => ({ r, free: minFreeBeds(r.capacity, r.occupancy) }))
        .filter((x) => x.free > 0)
        .map(({ r, free }) => ({
          value: r.id,
          label: [r.number, r.building].filter(Boolean).join(' · '),
          subLabel: `${t('sanatorium.freeBeds')}: ${free}/${r.capacity}`,
        })),
    [avail.data, t],
  );
  const roomLabel = rooms.find((x) => x.value === roomId)?.label;

  const submit = async () => {
    if (!valid) return setError(t('sanatorium.errors.invalid_period'));
    try {
      const r = await accept.mutateAsync({
        id: request.id,
        body: { guest_type: type, room_id: roomId, planned_from: from, planned_to: to, with_meals: meals, child_discount: child },
      });
      const out = { guestName: r.guest.full_name, credentials: r.credentials };
      accept.reset();
      onAccepted(out);
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <>
      <View style={styles.body} testID="accept-sheet">
        <Text variant="body" weight="600">{request.full_name}</Text>
        <Text variant="label" tone="muted">{t('sanatorium.guestTypeLabel')}</Text>
        <View style={styles.chips}>
          {GUEST_TYPES.map((g) => (
            <Chip key={g} label={t(`sanatorium.guestType.${g}`)} selected={type === g} onPress={() => setType(g)} testID={`type-${g}`} />
          ))}
        </View>
        <SelectField label={t('sanatorium.dateFrom')} value={fmtDate(from)} icon="calendar" onPress={() => setPick('from')} testID="accept-from" />
        <SelectField label={t('sanatorium.dateTo')} value={fmtDate(to)} icon="calendar" onPress={() => setPick('to')} testID="accept-to" />
        <SelectField
          label={t('sanatorium.room')}
          value={roomLabel}
          placeholder={avail.isPending && valid ? t('sanatorium.loading') : t('sanatorium.choose')}
          onPress={() => setPick('room')}
          testID="accept-room"
        />
        <View style={styles.toggle}>
          <Text variant="body">{t('sanatorium.withMeals')}</Text>
          <Toggle value={meals} onValueChange={setMeals} accessibilityLabel={t('sanatorium.withMeals')} testID="accept-meals" />
        </View>
        <View style={styles.toggle}>
          <Text variant="body">{t('sanatorium.childDiscount')}</Text>
          <Toggle value={child} onValueChange={setChild} accessibilityLabel={t('sanatorium.childDiscount')} testID="accept-child" />
        </View>
        {!!error && <Text variant="label" tone="danger" testID="accept-error">{error}</Text>}
        <Button testID="accept-save" label={t('sanatorium.accept')} full loading={accept.isPending} onPress={() => void submit()} />
      </View>
      <DatePickerModal visible={pick === 'from'} value={from} title={t('sanatorium.dateFrom')} onConfirm={(v) => { setFrom(v); setRoomId(null); }} onClose={() => setPick(null)} />
      <DatePickerModal visible={pick === 'to'} value={to} title={t('sanatorium.dateTo')} onConfirm={(v) => { setTo(v); setRoomId(null); }} onClose={() => setPick(null)} />
      <PickerModal
        visible={pick === 'room'}
        title={t('sanatorium.room')}
        options={rooms}
        loading={avail.isPending}
        selected={roomId}
        avatars={false}
        onClose={() => setPick(null)}
        onSelect={(v) => {
          setRoomId(v);
          setPick(null);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  body: { gap: 8, paddingBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 4 },
});
