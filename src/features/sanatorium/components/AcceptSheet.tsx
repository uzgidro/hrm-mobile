// Accepting a request = booking: the shared booking fields plus the family and the child
// discount. The server then creates (or matches) the guest and, for a new one, the credentials.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Sheet, Text } from '@/ui';
import { useAcceptRequest } from '../api/mutations';
import { familiesQuery } from '../api/queries';
import type { Credentials, SanRequest } from '../types';
import { sanErrorMessage, todayIso } from '../utils/sanatorium';
import { BookingFields, newBookingDraft, type BookingDraft } from './BookingFields';
import { ChoiceField, ErrorLine, opt, SwitchRow } from './forms';

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
  const families = useQuery(familiesQuery(''));
  const from = request.referral_from ?? todayIso();
  const [draft, setDraft] = useState<BookingDraft>(() =>
    newBookingDraft({
      type: request.guest_type ?? 'treatment',
      from,
      to: request.referral_to ?? dayjs(from).add(10, 'day').format('YYYY-MM-DD'),
    }),
  );
  const [child, setChild] = useState(false);
  const [familyId, setFamilyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!dayjs(draft.to).isAfter(dayjs(draft.from))) return setError(t('sanatorium.errors.invalid_period'));
    try {
      const r = await accept.mutateAsync({
        id: request.id,
        body: {
          guest_type: draft.type,
          room_id: draft.roomId,
          planned_from: draft.from,
          planned_to: draft.to,
          with_meals: draft.meals,
          child_discount: child,
          ...(draft.doctorId ? { doctor_staff_id: draft.doctorId } : {}),
          ...(draft.nurseId ? { nurse_staff_id: draft.nurseId } : {}),
          ...(familyId ? { family_id: familyId } : {}),
          ...(opt(draft.contract) ? { contract_note: opt(draft.contract) } : {}),
          ...(opt(draft.note) ? { note: opt(draft.note) } : {}),
        },
      });
      const out = { guestName: r.guest.full_name, credentials: r.credentials };
      accept.reset();
      onAccepted(out);
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <View style={styles.body} testID="accept-sheet">
      <Text variant="body" weight="600">{request.full_name}</Text>
      <BookingFields draft={draft} onChange={(p) => setDraft((d) => ({ ...d, ...p }))} showDiet={false} />
      <ChoiceField
        label={t('sanatorium.family')}
        value={familyId}
        noneLabel={t('sanatorium.none')}
        options={(families.data ?? []).map((f) => ({ value: f.id, label: f.name }))}
        onChange={setFamilyId}
        loading={families.isPending}
        testID="accept-family"
      />
      <SwitchRow label={t('sanatorium.childDiscount')} value={child} onChange={setChild} testID="accept-child" />
      <ErrorLine message={error} testID="accept-error" />
      <Button testID="accept-save" label={t('sanatorium.accept')} full loading={accept.isPending} onPress={() => void submit()} />
    </View>
  );
}

const styles = StyleSheet.create({ body: { gap: 4, paddingBottom: 8 } });
