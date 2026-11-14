// Registrar creates a request on behalf of a walk-in guest (the same six fields the bot asks).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { Button, Sheet } from '@/ui';
import { useCreateWalkIn } from '../api/mutations';
import { parseDmy, sanErrorMessage, todayIso } from '../utils/sanatorium';
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
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const iso = parseDmy(birth);
    if (name.trim().length < 5) return setError(t('sanatorium.nameShort5'));
    if (!iso) return setError(t('sanatorium.birthInvalid'));
    if (!/^[A-Za-z]{2}\d{7}$/.test(passport.trim())) return setError(t('sanatorium.passportInvalid'));
    if (!phone.trim()) return setError(t('sanatorium.phoneRequired'));
    if (org.trim().length < 2) return setError(t('sanatorium.orgRequired'));
    if (!dayjs(to).isAfter(dayjs(from))) return setError(t('sanatorium.errors.invalid_period'));
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
      });
      toast.success(t('sanatorium.requestCreated'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <View style={styles.form} testID="walkin-sheet">
      <FormInput label={t('sanatorium.fullName')} value={name} onChangeText={setName} required testID="wi-name" />
      <FormInput label={t('sanatorium.birthDateInput')} value={birth} onChangeText={setBirth} placeholder="14.03.1985" keyboardType="numbers-and-punctuation" required testID="wi-birth" />
      <FormInput label={t('sanatorium.passport')} value={passport} onChangeText={(v) => setPassport(v.toUpperCase())} placeholder="AA1234567" required testID="wi-passport" />
      <FormInput label={t('sanatorium.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" required testID="wi-phone" />
      <FormInput label={t('sanatorium.organization')} value={org} onChangeText={setOrg} required testID="wi-org" />
      <DateField label={t('sanatorium.dateFrom')} value={from} onChange={setFrom} />
      <DateField label={t('sanatorium.dateTo')} value={to} onChange={setTo} />
      <ChoiceField label={t('sanatorium.language')} value={lang} options={[{ value: 'uz', label: "O'zbekcha" }, { value: 'ru', label: 'Русский' }, { value: 'en', label: 'English' }]} onChange={setLang} />
      <ErrorLine message={error} testID="wi-error" />
      <Button testID="wi-save" label={t('sanatorium.createRequest')} full loading={create.isPending} onPress={() => void submit()} />
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: 2, paddingBottom: 8 } });
