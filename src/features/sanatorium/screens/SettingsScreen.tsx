// Registrar settings: staff, specialties and the public texts / discount rules.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { Badge, Button, Card, EmptyState, ListRow, PageHeader, Screen, Segmented, Sheet, Text } from '@/ui';
import { useSaveSettings, useSaveSpecialty } from '../api/mutations';
import { allSpecialtiesQuery, settingsQuery, staffQuery } from '../api/queries';
import { ChoiceField, ErrorLine, optNull, SwitchRow } from '../components/forms';
import { Denied, QueryBlock, useSanAccess } from '../components/common';
import { StaffSheet } from '../components/StaffSheet';
import { SPECIALTY_KINDS, type SanSettings, type Specialty, type SpecialtyKind, type StaffMember } from '../types';
import { sanErrorMessage } from '../utils/sanatorium';

type Seg = 'staff' | 'specialties' | 'texts';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const allowed = useSanAccess('registrar');
  const [seg, setSeg] = useState<Seg>('staff');
  const staff = useQuery(staffQuery(allowed && seg === 'staff'));
  const specs = useQuery(allSpecialtiesQuery(allowed && seg === 'specialties'));
  const settings = useQuery(settingsQuery(allowed && seg === 'texts'));
  const [editStaff, setEditStaff] = useState<StaffMember | 'new' | null>(null);
  const [editSpec, setEditSpec] = useState<Specialty | 'new' | null>(null);
  if (!allowed) return <Denied />;
  const cur = seg === 'staff' ? staff : seg === 'specialties' ? specs : settings;

  return (
    <Screen refreshing={cur.isRefetching} onRefresh={() => void cur.refetch()} testID="sanatorium-settings-screen">
      <PageHeader
        title={t('sanatorium.nav.settings')}
        right={
          seg === 'staff' ? (
            <Button testID="staff-add" label={t('sanatorium.add')} icon="plus" size="sm" onPress={() => setEditStaff('new')} />
          ) : seg === 'specialties' ? (
            <Button testID="spec-add" label={t('sanatorium.add')} icon="plus" size="sm" onPress={() => setEditSpec('new')} />
          ) : undefined
        }
      />
      <Segmented
        testID="settings-seg"
        value={seg}
        onChange={setSeg}
        options={[
          { value: 'staff', label: t('sanatorium.staff') },
          { value: 'specialties', label: t('sanatorium.specialties') },
          { value: 'texts', label: t('sanatorium.texts') },
        ]}
      />
      <View style={styles.body}>
        {seg === 'staff' && (
          <QueryBlock query={staff}>
            {(items) =>
              items.length === 0 ? (
                <EmptyState title={t('sanatorium.noStaff')} />
              ) : (
                <View style={styles.stack}>
                  {items.map((m) => (
                    <ListRow
                      key={m.id}
                      pressable
                      testID={`staff-${m.id}`}
                      title={m.full_name}
                      subtitle={[
                        ...(['registrar', 'room_keeper', 'kitchen', 'doctor', 'nurse'] as const)
                          .filter((r) => m[`is_${r}` as keyof StaffMember])
                          .map((r) => t(`sanatorium.role.${r}`)),
                        m.specialty,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                      right={!m.is_active ? <Badge label={t('sanatorium.inactive')} tone="neutral" /> : m.is_external ? <Badge label={t('sanatorium.external')} tone="info" /> : undefined}
                      chevron
                      onPress={() => setEditStaff(m)}
                    />
                  ))}
                </View>
              )
            }
          </QueryBlock>
        )}
        {seg === 'specialties' && (
          <QueryBlock query={specs}>
            {(items) => (
              <View style={styles.stack}>
                {items.map((s) => (
                  <ListRow
                    key={s.id}
                    pressable
                    testID={`spec-${s.id}`}
                    title={s.name}
                    subtitle={t(`sanatorium.kind.${s.kind}`)}
                    right={!s.is_active ? <Badge label={t('sanatorium.inactive')} tone="neutral" /> : undefined}
                    chevron
                    onPress={() => setEditSpec(s)}
                  />
                ))}
              </View>
            )}
          </QueryBlock>
        )}
        {seg === 'texts' && <QueryBlock query={settings}>{(s) => <TextsForm key={JSON.stringify(s)} s={s} />}</QueryBlock>}
      </View>
      <StaffSheet staff={editStaff} onClose={() => setEditStaff(null)} />
      <SpecialtySheet spec={editSpec} onClose={() => setEditSpec(null)} />
    </Screen>
  );
}

function SpecialtySheet({ spec, onClose }: { spec: Specialty | 'new' | null; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet visible={!!spec} onClose={onClose} title={t('sanatorium.specialty')} scroll>
      {spec && <SpecialtyForm key={spec === 'new' ? 'new' : spec.id} spec={spec === 'new' ? null : spec} onClose={onClose} />}
    </Sheet>
  );
}

function SpecialtyForm({ spec, onClose }: { spec: Specialty | null; onClose: () => void }) {
  const { t } = useTranslation();
  const save = useSaveSpecialty();
  const [name, setName] = useState(spec?.name ?? '');
  const [kind, setKind] = useState<SpecialtyKind>((spec?.kind as SpecialtyKind) ?? 'doctor');
  const [active, setActive] = useState(spec?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    if (name.trim().length < 2) return setError(t('sanatorium.nameShort'));
    try {
      await save.mutateAsync({ id: spec?.id, body: { name: name.trim(), kind, is_active: active } });
      toast.success(t('sanatorium.saved'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <View style={styles.form} testID="specialty-sheet">
      <FormInput label={t('sanatorium.name')} value={name} onChangeText={setName} required testID="spec-name" />
      <ChoiceField label={t('sanatorium.kindLabel')} value={kind} options={SPECIALTY_KINDS.map((k) => ({ value: k, label: t(`sanatorium.kind.${k}`) }))} onChange={(v) => v && setKind(v)} testID="spec-kind" />
      <SwitchRow label={t('sanatorium.active')} value={active} onChange={setActive} />
      <ErrorLine message={error} />
      <Button testID="spec-save" label={t('common.save')} full loading={save.isPending} onPress={() => void submit()} />
    </View>
  );
}

function TextsForm({ s }: { s: SanSettings }) {
  const { t } = useTranslation();
  const save = useSaveSettings();
  const [contacts, setContacts] = useState(s.contacts ?? '');
  const [addresses, setAddresses] = useState(s.addresses ?? '');
  const [hours, setHours] = useState(s.work_hours ?? '');
  const [about, setAbout] = useState(s.about ?? '');
  const [percent, setPercent] = useState(String(s.child_discount_percent ?? 0));
  const [age, setAge] = useState(String(s.child_age_limit ?? 0));
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    const p = Number.parseInt(percent, 10);
    const a = Number.parseInt(age, 10);
    if (!Number.isFinite(p) || p < 0 || p > 100) return setError(t('sanatorium.percentRange'));
    if (!Number.isFinite(a) || a < 0 || a > 18) return setError(t('sanatorium.ageRange'));
    try {
      await save.mutateAsync({
        contacts: optNull(contacts),
        addresses: optNull(addresses),
        work_hours: optNull(hours),
        about: optNull(about),
        child_discount_percent: p,
        child_age_limit: a,
      });
      setError(null);
      toast.success(t('sanatorium.saved'));
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <Card testID="settings-texts">
      <FormInput label={t('sanatorium.contacts')} value={contacts} onChangeText={setContacts} multiline testID="set-contacts" />
      <FormInput label={t('sanatorium.addresses')} value={addresses} onChangeText={setAddresses} multiline />
      <FormInput label={t('sanatorium.workHours')} value={hours} onChangeText={setHours} />
      <FormInput label={t('sanatorium.about')} value={about} onChangeText={setAbout} multiline />
      <FormInput label={t('sanatorium.childDiscountPercent')} value={percent} onChangeText={setPercent} keyboardType="number-pad" testID="set-percent" />
      <FormInput label={t('sanatorium.childAgeLimit')} value={age} onChangeText={setAge} keyboardType="number-pad" />
      <ErrorLine message={error} />
      <Button testID="settings-save" label={t('common.save')} full loading={save.isPending} onPress={() => void submit()} />
      <Text variant="caption" tone="muted" style={styles.hint}>{t('sanatorium.textsHint')}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { marginTop: 12 },
  stack: { gap: 8 },
  form: { gap: 4, paddingBottom: 8 },
  hint: { marginTop: 8 },
});
