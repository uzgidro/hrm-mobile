// Create / edit a guest. A new guest comes back with a one-time password: it goes straight to
// `onCreated` (shown once by the caller) and is never kept here.
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { Button, Sheet } from '@/ui';
import { useSaveGuest } from '../api/mutations';
import { familiesQuery } from '../api/queries';
import { RELATIONS, type Credentials, type GuestLite } from '../types';
import { LIMITS, clip, maskPassportInput, normalizePhoneInput, validateGuestFields, type GuestFormErrors } from '../utils/guests';
import { parseDmy, sanErrorMessage } from '../utils/sanatorium';
import { ChoiceField, ErrorLine, optNull } from './forms';

export type GuestSavedInfo = { id: number; guestName: string; credentials: Credentials | null };

export function GuestSheet({
  guest,
  onClose,
  onSaved,
}: {
  /** A guest to edit, `'new'` to create, null = closed. */
  guest: GuestLite | 'new' | null;
  onClose: () => void;
  onSaved: (info: GuestSavedInfo) => void;
}) {
  const { t } = useTranslation();
  return (
    <Sheet visible={!!guest} onClose={onClose} title={guest === 'new' ? t('sanatorium.newGuest') : t('sanatorium.editGuest')} scroll>
      {guest && <GuestForm key={guest === 'new' ? 'new' : guest.id} guest={guest === 'new' ? null : guest} onSaved={onSaved} onClose={onClose} />}
    </Sheet>
  );
}

function GuestForm({ guest, onClose, onSaved }: { guest: GuestLite | null; onClose: () => void; onSaved: (i: GuestSavedInfo) => void }) {
  const { t } = useTranslation();
  const save = useSaveGuest();
  const families = useQuery(familiesQuery(''));
  const [name, setName] = useState(guest?.full_name ?? '');
  const [birth, setBirth] = useState(guest?.birth_date ? dayjs(guest.birth_date).format('DD.MM.YYYY') : '');
  const [gender, setGender] = useState<'m' | 'f' | null>((guest?.gender as 'm' | 'f' | null) ?? null);
  // The full passport is only entered, never prefilled from the masked server value.
  const [passport, setPassport] = useState('');
  const [phone, setPhone] = useState(guest?.phone ?? '');
  const [org, setOrg] = useState(guest?.organization_name ?? '');
  const [address, setAddress] = useState(guest?.address ?? '');
  const [note, setNote] = useState(guest?.note ?? '');
  const [familyId, setFamilyId] = useState<number | null>(null);
  const [relation, setRelation] = useState<string | null>(guest?.relation ?? null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<GuestFormErrors>({});
  const msg = (k?: string) => (k ? t(k) : undefined);

  const submit = async () => {
    const errs = validateGuestFields({ name, passport, phone }, 'guest');
    setFieldErr(errs);
    if (errs.name || errs.passport || errs.phone) return setError(null);
    const iso = birth.trim() ? parseDmy(birth) : null;
    if (birth.trim() && !iso) return setError(t('sanatorium.birthInvalid'));
    try {
      const res = await save.mutateAsync({
        id: guest?.id,
        body: {
          full_name: name.trim(),
          birth_date: iso,
          gender,
          // Blank passport on edit = leave as is: the server PUT keeps the stored value only if sent as-is.
          ...(passport.trim() || !guest ? { passport: optNull(passport) } : {}),
          phone: optNull(normalizePhoneInput(phone)),
          organization_name: optNull(org),
          address: optNull(address),
          note: optNull(note),
          ...(familyId ? { family_id: familyId, family_relation: relation ?? 'other' } : {}),
        },
      });
      toast.success(t('sanatorium.saved'));
      onSaved({ id: res.id, guestName: name.trim(), credentials: res.credentials ?? null });
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <View style={styles.form} testID="guest-sheet">
      <FormInput label={t('sanatorium.fullName')} value={name} onChangeText={(v) => setName(clip(v, LIMITS.name))} required error={msg(fieldErr.name)} testID="guest-name" />
      <FormInput label={t('sanatorium.birthDateInput')} value={birth} onChangeText={setBirth} placeholder="14.03.1985" keyboardType="numbers-and-punctuation" testID="guest-birth" />
      <ChoiceField
        label={t('sanatorium.genderLabel')}
        value={gender}
        noneLabel="—"
        options={[{ value: 'm' as const, label: t('sanatorium.gender.m') }, { value: 'f' as const, label: t('sanatorium.gender.f') }]}
        onChange={setGender}
        testID="guest-gender"
      />
      <FormInput label={t('sanatorium.passport')} value={passport} onChangeText={(v) => setPassport(maskPassportInput(v))} placeholder={guest ? t('sanatorium.passportKeep') : 'AA1234567'} error={msg(fieldErr.passport)} testID="guest-passport" />
      <FormInput label={t('sanatorium.phone')} value={phone} onChangeText={(v) => setPhone(clip(v, 20))} placeholder="+998901234567" keyboardType="phone-pad" error={msg(fieldErr.phone)} testID="guest-phone" />
      <FormInput label={t('sanatorium.organization')} value={org} onChangeText={(v) => setOrg(clip(v, LIMITS.short))} testID="guest-org" />
      <FormInput label={t('sanatorium.address')} value={address} onChangeText={(v) => setAddress(clip(v, LIMITS.short))} testID="guest-address" />
      <FormInput label={t('sanatorium.notes')} value={note} onChangeText={(v) => setNote(clip(v, LIMITS.note))} multiline testID="guest-note" />
      <ChoiceField
        label={t('sanatorium.family')}
        value={familyId}
        noneLabel={t('sanatorium.none')}
        options={(families.data ?? []).map((f) => ({ value: f.id, label: f.name }))}
        onChange={setFamilyId}
        loading={families.isPending}
        testID="guest-family"
      />
      {familyId != null && (
        <ChoiceField
          label={t('sanatorium.relationLabel')}
          value={relation}
          options={RELATIONS.map((r) => ({ value: r as string, label: t(`sanatorium.relation.${r}`) }))}
          onChange={setRelation}
        />
      )}
      <ErrorLine message={error} testID="guest-error" />
      <Button testID="guest-save" label={t('common.save')} full loading={save.isPending} onPress={() => void submit()} />
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: 2, paddingBottom: 8 } });
