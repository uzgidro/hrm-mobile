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
import { ChoiceField, ErrorLine, opt, SwitchRow } from './forms';

const ROLE_FLAGS = [
  ['is_registrar', 'registrar'],
  ['is_room_keeper', 'room_keeper'],
  ['is_kitchen', 'kitchen'],
  ['is_doctor', 'doctor'],
  ['is_nurse', 'nurse'],
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
  const specialties = useQuery(specialtiesQuery());
  const [term, setTerm] = useState('');
  const debounced = useDebouncedValue(term);
  const cands = useQuery(candidatesQuery(debounced));
  const [picked, setPicked] = useState<{ id: number; name: string; external: boolean } | null>(
    staff ? { id: staff.user_id, name: staff.full_name, external: staff.is_external } : null,
  );
  const [flags, setFlags] = useState<Flags>({
    is_registrar: staff?.is_registrar ?? false,
    is_room_keeper: staff?.is_room_keeper ?? false,
    is_kitchen: staff?.is_kitchen ?? false,
    is_doctor: staff?.is_doctor ?? false,
    is_nurse: staff?.is_nurse ?? false,
  });
  const [specialtyId, setSpecialtyId] = useState<number | null>(staff?.specialty_id ?? null);
  const [cabinet, setCabinet] = useState(staff?.cabinet ?? '');
  const [phone, setPhone] = useState(staff?.phone ?? '');
  const [active, setActive] = useState(staff?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!picked) return setError(t('sanatorium.pickUser'));
    try {
      await save.mutateAsync({
        id: staff?.id,
        body: {
          ...(staff ? {} : { user_id: picked.id }),
          ...flags,
          specialty_id: specialtyId,
          cabinet: opt(cabinet) ?? null,
          phone: opt(phone) ?? null,
          is_active: active,
        },
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
              // An invited (external) user may only hold clinical roles — the server enforces it.
              onChange={(v) => setFlags((f) => ({ ...f, [flag]: v }))}
            />
          ))}
          <ChoiceField
            label={t('sanatorium.specialty')}
            value={specialtyId}
            noneLabel={t('sanatorium.none')}
            options={(specialties.data ?? []).map((s) => ({ value: s.id, label: s.name }))}
            onChange={setSpecialtyId}
            loading={specialties.isPending}
            testID="staff-specialty"
          />
          <FormInput label={t('sanatorium.cabinet')} value={cabinet} onChangeText={setCabinet} testID="staff-cabinet" />
          <FormInput label={t('sanatorium.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" testID="staff-phone" />
          <SwitchRow label={t('sanatorium.active')} value={active} onChange={setActive} />
          <ErrorLine message={error} testID="staff-error" />
          <Button testID="staff-save" label={t('common.save')} full loading={save.isPending} onPress={() => void submit()} />
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
