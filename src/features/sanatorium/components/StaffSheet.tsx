// Add / edit a sanatorium staff member: pick a user (create only), roles, specialty, cabinet, phone.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { Badge, Button, ListRow, SearchField, Sheet, Text } from '@/ui';
import { useSaveStaff } from '../api/mutations';
import { candidatesQuery, specialtiesQuery } from '../api/queries';
import type { SanRole, StaffMember } from '../types';
import { sanErrorMessage } from '../utils/sanatorium';
import { flagLocked, lockExternal, staffBody, staffError, phoneIssue } from '../utils/staffParity';
import { ChoiceField, ErrorLine, SwitchRow } from './forms';
import { PoiField, usePoiOn } from './sections1/PoiField';
import { useSingleFlight } from '../simple/useSingleFlight';

const ROLE_FLAGS = [
  ['is_registrar', 'registrar'],
  ['is_room_keeper', 'room_keeper'],
  ['is_kitchen', 'kitchen'],
  ['is_doctor', 'doctor'],
  ['is_nurse', 'nurse'],
  ['is_housekeeper', 'housekeeper'],
] as const satisfies readonly (readonly [string, SanRole])[];
type Flags = Record<(typeof ROLE_FLAGS)[number][0], boolean>;

/** `staff` = edit that member, `{}` (null id) = new one; null = closed. */
export function StaffSheet({ staff, onClose }: { staff: StaffMember | 'new' | null; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet visible={!!staff} onClose={onClose} title={staff === 'new' ? t('sanatorium.addStaff') : t('sanatorium.editStaff')} scroll>
      {staff && <StaffForm key={staff === 'new' ? 'new' : staff.id} staff={staff === 'new' ? null : staff} onClose={onClose} />}
    </Sheet>
  );
}

function StaffForm({ staff, onClose }: { staff: StaffMember | null; onClose: () => void }) {
  const { t } = useTranslation();
  const save = useSaveStaff();
  const flight = useSingleFlight();
  const specialties = useQuery(specialtiesQuery());
  const [term, setTerm] = useState('');
  const debounced = useDebouncedValue(term);
  const cands = useQuery(candidatesQuery(debounced));
  const [picked, setPicked] = useState<{ id: number; name: string; external: boolean } | null>(
    staff ? { id: staff.user_id, name: staff.full_name, external: staff.is_external } : null,
  );
  const [rawFlags, setFlags] = useState<Flags>({
    is_registrar: staff?.is_registrar ?? false,
    is_room_keeper: staff?.is_room_keeper ?? false,
    is_kitchen: staff?.is_kitchen ?? false,
    is_doctor: staff?.is_doctor ?? false,
    is_nurse: staff?.is_nurse ?? false,
    is_housekeeper: staff?.is_housekeeper ?? false,
  });
  const poiOn = usePoiOn();
  const [poiId, setPoiId] = useState<number | null>(staff?.poi_id ?? null);
  const [specialtyId, setSpecialtyId] = useState<number | null>(staff?.specialty_id ?? null);
  const [cabinet, setCabinet] = useState(staff?.cabinet ?? '');
  const [phone, setPhone] = useState(staff?.phone ?? '');
  const [active, setActive] = useState(staff?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);
  const external = !!picked?.external;
  // An invited (external) user is clinical only: the other roles read as off and are locked.
  const flags = lockExternal(rawFlags, external);

  const submit = async () => {
    const bad = staffError({ hasPicked: !!picked, flags, phone });
    if (bad) return setError(t(bad === 'user' ? 'sanatorium.pickUser' : bad === 'role' ? 'sanStaff.staff.roleRequired' : 'sanStaff.staff.phoneInvalid'));
    try {
      await save.mutateAsync({
        id: staff?.id,
        body: staffBody({ flags, specialtyId, cabinet, phone, active, poiId, poiOn, userId: staff ? undefined : picked!.id }),
      });
      toast.success(t('sanatorium.saved'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <View style={styles.body} testID="staff-sheet">
      {picked ? (
        <View style={styles.picked}>
          <Text variant="heading" style={styles.flex}>{picked.name}</Text>
          {picked.external && <Badge label={t('sanatorium.external')} tone="info" />}
          {!staff && <Button label={t('sanatorium.change')} variant="link" size="sm" onPress={() => setPicked(null)} />}
        </View>
      ) : (
        <>
          <SearchField testID="staff-search" value={term} onChangeText={setTerm} placeholder={t('sanatorium.candidateSearch')} />
          {debounced.trim().length < 2 ? (
            <Text variant="caption" tone="muted">{t('sanatorium.guestSearchHint')}</Text>
          ) : (
            (cands.data ?? []).map((c) => (
              <ListRow
                key={`${c.kind}-${c.user_id}`}
                testID={`cand-${c.user_id}`}
                title={c.full_name}
                subtitle={c.kind === 'external' ? t('sanatorium.external') : undefined}
                right={c.already_staff ? <Badge label={t('sanatorium.alreadyStaff')} tone="neutral" /> : undefined}
                chevron={!c.already_staff}
                onPress={c.already_staff ? undefined : () => setPicked({ id: c.user_id, name: c.full_name, external: c.kind === 'external' })}
              />
            ))
          )}
          {cands.data?.length === 0 && debounced.trim().length >= 2 && <Text variant="body" tone="muted">{t('sanatorium.noGuests')}</Text>}
        </>
      )}
      {picked && (
        <>
          <Text variant="label" tone="muted">{t('sanatorium.roles')}</Text>
          {ROLE_FLAGS.map(([flag, role]) => (
            <SwitchRow
              key={flag}
              testID={`role-${role}`}
              label={t(`sanatorium.role.${role}`)}
              value={flags[flag]}
              disabled={flagLocked(external, flag)}
              onChange={(v) => {
                setFlags((f) => ({ ...f, [flag]: v }));
                setError(null);
              }}
            />
          ))}
          {external && <Text variant="caption" tone="muted" testID="staff-external-hint">{t('sanStaff.staff.externalHint')}</Text>}
          {flags.is_doctor && (
            <ChoiceField
              label={t('sanatorium.specialty')}
              value={specialtyId}
              noneLabel={t('sanatorium.none')}
              options={(specialties.data ?? []).map((s) => ({ value: s.id, label: s.name }))}
              onChange={setSpecialtyId}
              loading={specialties.isPending}
              testID="staff-specialty"
            />
          )}
          <FormInput label={t('sanatorium.cabinet')} value={cabinet} onChangeText={setCabinet} maxLength={50} testID="staff-cabinet" />
          {flags.is_doctor && <PoiField value={poiId} onChange={setPoiId} testID="staff-poi" />}
          <FormInput
            label={t('sanatorium.phone')}
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              setError(null);
            }}
            keyboardType="phone-pad"
            maxLength={50}
            error={phoneIssue(phone) ? t('sanStaff.staff.phoneInvalid') : undefined}
            testID="staff-phone"
          />
          <SwitchRow label={t('sanatorium.active')} value={active} onChange={setActive} testID="staff-active" />
          <ErrorLine message={error} testID="staff-error" />
          <Button testID="staff-save" label={t('common.save')} full loading={save.isPending || flight.pending} onPress={() => void flight.run(submit)} />
        </>
      )}
      {!picked && <ErrorLine message={error} />}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 6, paddingBottom: 8 },
  flex: { flex: 1 },
  picked: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
});
