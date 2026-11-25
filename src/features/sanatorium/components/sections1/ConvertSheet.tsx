// Waitlist entry -> request. Used by the waitlist screen and by the work queue («offered» entries).
// The sheet starts from what the entry already holds (birth date, passport, organization).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSingleFlight } from '../../simple/useSingleFlight';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { Button, Card, Sheet, Text } from '@/ui';
import { roomsQuery } from '../../api/queries';
import { useConvertWaitlist, waitlistEntryQuery } from '../../api/sections1';
import { useSimpleAvailable } from '../../simple/useSimpleAvailable';
import type { WaitlistItem } from '../../types1';
import { convertDefaults } from '../../utils/sections1';
import { fmtDate, sanErrorMessage, todayIso } from '../../utils/sanatorium';
import { BirthField } from '../BirthField';
import { ChoiceField, ErrorLine, opt } from '../forms';

/** After a conversion: the arrival wizard when the simplified flow exists, otherwise the requests list. */
export function useAfterConvert(): (requestId: number) => void {
  const simple = useSimpleAvailable();
  return (requestId) => {
    if (simple) router.push({ pathname: '/sanatorium-arrive', params: { request: String(requestId) } });
    else router.push('/sanatorium-requests');
  };
}

export function ConvertSheet({ item, onClose, onConverted }: { item: WaitlistItem | null; onClose: () => void; onConverted: (requestId: number) => void }) {
  const { t } = useTranslation();
  return (
    <Sheet visible={!!item} onClose={onClose} title={item ? t('sanPlaces.waitlist.convertTitle', { name: item.full_name }) : ''} scroll>
      {item && <ConvertForm key={item.id} item={item} onClose={onClose} onConverted={onConverted} />}
    </Sheet>
  );
}

function ConvertForm({ item, onClose, onConverted }: { item: WaitlistItem; onClose: () => void; onConverted: (requestId: number) => void }) {
  const { t } = useTranslation();
  const conv = useConvertWaitlist();
  const rooms = useQuery(roomsQuery(true));
  const d = convertDefaults(item);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [passport, setPassport] = useState(d.passport);
  const [birth, setBirth] = useState<string | null>(d.birth);
  const [birthOk, setBirthOk] = useState(true);
  const [org, setOrg] = useState(d.org);
  const [error, setError] = useState<string | null>(null);
  const flight = useSingleFlight();
  const submit = async () => {
    if (!birthOk) return setError(t('sanSimple.val.birth'));
    if (birth && birth > todayIso()) return setError(t('sanPlaces.waitlist.birthFuture'));
    try {
      const res = (await conv.mutateAsync({
        id: item.id,
        body: {
          ...(roomId != null ? { preferred_room_id: roomId } : {}),
          ...(opt(passport) ? { passport: passport.trim().toUpperCase() } : {}),
          ...(birth ? { birth_date: birth } : {}),
          ...(opt(org) ? { organization_name: opt(org) } : {}),
        },
      })) as { request?: { id?: number } } | null;
      toast.success(t('san1.waitlist.converted'));
      onClose();
      if (res?.request?.id != null) onConverted(res.request.id);
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <View style={styles.form} testID="convert-sheet">
      <Card>
        <Text variant="caption" tone="muted">
          {t('sanPlaces.waitlist.convertHint', { period: `${fmtDate(item.period_from)} - ${fmtDate(item.period_to)}` })}
        </Text>
      </Card>
      <ChoiceField
        label={t('san1.waitlist.preferredRoom')}
        value={roomId}
        noneLabel={t('sanatorium.noPreference')}
        options={(rooms.data ?? []).filter((r) => r.is_active).map((r) => ({ value: r.id, label: `${t('sanatorium.room')} ${r.number}`, sub: r.room_type ?? undefined }))}
        onChange={setRoomId}
        loading={rooms.isPending}
        testID="conv-room"
      />
      <FormInput label={t('san1.waitlist.passport')} value={passport} onChangeText={(v) => setPassport(v.toUpperCase())} maxLength={9} testID="conv-passport" />
      <BirthField label={t('san1.waitlist.birth')} value={birth ?? ''} onChange={(v, complete) => { setBirth(v || null); setBirthOk(complete); setError(null); }} testID="conv-birth" />
      <FormInput label={t('san1.waitlist.organization')} value={org} onChangeText={setOrg} maxLength={200} testID="conv-org" />
      <ErrorLine message={error} testID="conv-error" />
      <Button testID="conv-save" label={t('san1.waitlist.convert')} full loading={conv.isPending} onPress={() => void flight.run(submit)} />
    </View>
  );
}

/** Loads the entry by id, then shows the convert sheet (the API has no single-entry route). */
export function ConvertByIdSheet({ waitlistId, onClose, onConverted }: { waitlistId: number | null; onClose: () => void; onConverted: (requestId: number) => void }) {
  const q = useQuery(waitlistEntryQuery(waitlistId));
  return <ConvertSheet item={waitlistId != null ? q.data ?? null : null} onClose={onClose} onConverted={onConverted} />;
}

const styles = StyleSheet.create({ form: { gap: 6, paddingBottom: 8 } });
