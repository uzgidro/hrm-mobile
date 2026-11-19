// Registrar creates a request on behalf of a walk-in guest (the same six fields the bot asks).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { Button, Sheet } from '@/ui';
import { useCreateWalkIn } from '../api/mutations';
import { publicRoomsQuery } from '../api/queries';
import { fmtMoney, parseDmy, sanErrorInfo, sanErrorMessage, todayIso } from '../utils/sanatorium';
import { RoomPickerField } from './RoomPickerField';
import { ChoiceField, DateField, ErrorLine } from './forms';
import dayjs from 'dayjs';

export function WalkInSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet visible={open} onClose={onClose} title={t('sanatorium.walkIn')} scroll>
      {open && <WalkInForm onClose={onClose} />}
    </Sheet>
  );
}

function WalkInForm({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const create = useCreateWalkIn();
  const [name, setName] = useState('');
  const [birth, setBirth] = useState('');
  const [passport, setPassport] = useState('');
  const [phone, setPhone] = useState('');
  const [org, setOrg] = useState('');
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(dayjs().add(10, 'day').format('YYYY-MM-DD'));
  const [lang, setLang] = useState<string | null>('uz');
  const [party, setParty] = useState('');
  const [roomId, setRoomId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Free rooms for the period and party (a room needs enough free beds on every night).
  const people = Math.min(20, Math.max(1, Number.parseInt(party, 10) || 1));
  const periodOk = dayjs(to).isAfter(dayjs(from));
  const rooms = useQuery(publicRoomsQuery(from, to, people, periodOk));

  const submit = async () => {
    const iso = parseDmy(birth);
    if (name.trim().length < 5) return setError(t('sanatorium.nameShort5'));
    if (!iso) return setError(t('sanatorium.birthInvalid'));
    if (!/^[A-Za-z]{2}\d{7}$/.test(passport.trim())) return setError(t('sanatorium.passportInvalid'));
    if (!phone.trim()) return setError(t('sanatorium.phoneRequired'));
    if (org.trim().length < 2) return setError(t('sanatorium.orgRequired'));
    if (!dayjs(to).isAfter(dayjs(from))) return setError(t('sanatorium.errors.invalid_period'));
    if (party.trim() && !(Number.parseInt(party, 10) >= 1 && Number.parseInt(party, 10) <= 20)) return setError(t('sanatorium.partyRange'));
    try {
      await create.mutateAsync({
        full_name: name.trim(),
        birth_date: iso,
        passport: passport.trim().toUpperCase(),
        phone: phone.trim(),
        organization_name: org.trim(),
        referral_from: from,
        referral_to: to,
        lang: lang ?? 'uz',
        ...(party.trim() ? { party_size: Number.parseInt(party, 10) } : {}),
        ...(roomId ? { preferred_room_id: roomId } : {}),
      });
      toast.success(t('sanatorium.requestCreated'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
      // Someone took the beds meanwhile: drop the choice and reload the free rooms.
      if (sanErrorInfo(e).code === 'room_taken') {
        setRoomId(null);
        void rooms.refetch();
      }
    }
  };
  return (
    <View style={styles.form} testID="walkin-sheet">
      <FormInput label={t('sanatorium.fullName')} value={name} onChangeText={setName} required testID="wi-name" />
      <FormInput label={t('sanatorium.birthDateInput')} value={birth} onChangeText={setBirth} placeholder="14.03.1985" keyboardType="numbers-and-punctuation" required testID="wi-birth" />
      <FormInput label={t('sanatorium.passport')} value={passport} onChangeText={(v) => setPassport(v.toUpperCase())} placeholder="AA1234567" required testID="wi-passport" />
      <FormInput label={t('sanatorium.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" required testID="wi-phone" />
      <FormInput label={t('sanatorium.organization')} value={org} onChangeText={setOrg} required testID="wi-org" />
      <DateField label={t('sanatorium.dateFrom')} value={from} onChange={(v) => { setFrom(v); setRoomId(null); }} />
      <DateField label={t('sanatorium.dateTo')} value={to} onChange={(v) => { setTo(v); setRoomId(null); }} />
      <FormInput label={t('sanatorium.partySize')} value={party} onChangeText={(v) => { setParty(v.replace(/\D/g, '')); setRoomId(null); }} keyboardType="number-pad" placeholder="1" testID="wi-party" />
      <RoomPickerField
        label={t('sanatorium.preferredRoom')}
        value={roomId}
        noneLabel={t('sanatorium.noPreference')}
        loading={rooms.isPending && periodOk}
        options={(rooms.data ?? []).map((r) => ({
          id: r.id,
          title: [r.number, r.building].filter(Boolean).join(' · '),
          sub: `${t('sanatorium.freeBeds')}: ${r.free_beds}/${r.capacity} · ${fmtMoney(r.price_per_day)} / ${t(r.price_mode === 'per_room' ? 'sanatorium.perRoom' : 'sanatorium.perBed')}`,
          photos: r.photos,
        }))}
        onChange={setRoomId}
        testID="wi-room"
      />
      <ChoiceField label={t('sanatorium.language')} value={lang} options={[{ value: 'uz', label: "O'zbekcha" }, { value: 'ru', label: 'Русский' }, { value: 'en', label: 'English' }]} onChange={setLang} />
      <ErrorLine message={error} testID="wi-error" />
      <Button testID="wi-save" label={t('sanatorium.createRequest')} full loading={create.isPending} onPress={() => void submit()} />
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: 2, paddingBottom: 8 } });
