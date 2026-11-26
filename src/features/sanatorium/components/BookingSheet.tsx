// New booking for one or several guests (a family books together: one room, per-member child
// discount). Opened empty, from a guest card (that guest preselected) or with a family.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from '@/lib/toast';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { Button, ListRow, SearchField, Sheet, Text } from '@/ui';
import { useSanAccess } from './common';
import { useCreateStays } from '../api/mutations';
import { applyDietToStays } from '../api/sections2';
import { familiesQuery, guestsQuery, settingsQuery } from '../api/queries';
import type { Family, GuestLite } from '../types';
import { isChildMember } from '../utils/guests';
import { sanErrorMessage } from '../utils/sanatorium';
import { useSingleFlight } from '../simple/useSingleFlight';
import { BookingFields, newBookingDraft, type BookingDraft } from './BookingFields';
import { ChoiceField, ErrorLine, opt, SwitchRow } from './forms';

/** `child` null = decided by age (or the relation) against the settings limit; true / false = the registrar's choice. */
type Member = { id: number; name: string; age: number | null; relation: string | null; child: boolean | null };

/** `open`: null = closed; otherwise the guests to start with. */
export function BookingSheet({ open, onClose, onDone }: { open: { guests: GuestLite[] } | null; onClose: () => void; onDone?: (stayIds: number[]) => void }) {
  const { t } = useTranslation();
  return (
    <Sheet visible={!!open} onClose={onClose} title={t('sanatorium.newBooking')} scroll>
      {open && <BookingForm key={open.guests.map((g) => g.id).join(',')} initial={open.guests} onClose={onClose} onDone={onDone} />}
    </Sheet>
  );
}

function BookingForm({ initial, onClose, onDone }: { initial: GuestLite[]; onClose: () => void; onDone?: (ids: number[]) => void }) {
  const { t } = useTranslation();
  const create = useCreateStays();
  const flight = useSingleFlight();
  const families = useQuery(familiesQuery(''));
  const registrar = useSanAccess('registrar');
  const settings = useQuery(settingsQuery(registrar));
  const limit = settings.data?.child_age_limit;
  const percent = settings.data?.child_discount_percent;
  const [members, setMembers] = useState<Member[]>(initial.map((g) => ({ id: g.id, name: g.full_name, age: g.age ?? null, relation: g.relation ?? null, child: null })));
  const isChild = (m: Member) => m.child ?? isChildMember(m.age, m.relation, limit);
  const [familyId, setFamilyId] = useState<number | null>(null);
  const [term, setTerm] = useState('');
  const debounced = useDebouncedValue(term);
  const found = useQuery({ ...guestsQuery(debounced), enabled: debounced.trim().length >= 2 });
  const [draft, setDraft] = useState<BookingDraft>(() => newBookingDraft());
  const [error, setError] = useState<string | null>(null);

  const pickFamily = (id: number | null) => {
    setFamilyId(id);
    const f: Family | undefined = families.data?.find((x) => x.id === id);
    if (f) {
      setMembers(f.members.map((m) => ({ id: m.id, name: m.full_name, age: m.age ?? null, relation: m.relation ?? null, child: null })));
      setDraft((d) => ({ ...d, roomId: null }));
    }
  };
  const add = (g: GuestLite) => {
    setMembers((m) => (m.some((x) => x.id === g.id) ? m : [...m, { id: g.id, name: g.full_name, age: g.age ?? null, relation: g.relation ?? null, child: null }]));
    // More people may no longer fit the chosen room.
    setDraft((d) => ({ ...d, roomId: null }));
    setTerm('');
  };

  const submit = async () => {
    if (members.length === 0) return setError(t('sanatorium.pickGuests'));
    try {
      const res = await create.mutateAsync({
        members: members.map((m) => ({ guest_id: m.id, child_discount: isChild(m) })),
        guest_type: draft.type,
        planned_from: draft.from,
        planned_to: draft.to,
        with_meals: draft.meals,
        ...(draft.roomId ? { room_id: draft.roomId } : {}),
        ...(opt(draft.diet) && draft.meals ? { diet_note: opt(draft.diet) } : {}),
        ...(draft.doctorId ? { doctor_staff_id: draft.doctorId } : {}),
        ...(draft.nurseId ? { nurse_staff_id: draft.nurseId } : {}),
        ...(draft.type === 'contract' && opt(draft.contract) ? { contract_note: opt(draft.contract) } : {}),
        ...(opt(draft.note) ? { note: opt(draft.note) } : {}),
        ...(familyId ? { family_id: familyId } : {}),
        ...(draft.packageId ? { package_id: draft.packageId } : {}),
        ...(draft.organizationId ? { organization_id: draft.organizationId } : {}),
      });
      if (await applyDietToStays(res.map((s) => s.id), draft.dietId)) toast.error(t('sanatorium.s2.dietNotSaved'));
      toast.success(t('sanatorium.bookingCreated'));
      onDone?.(res.map((s) => s.id));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <View style={styles.form} testID="booking-sheet">
      <ChoiceField
        label={t('sanatorium.family')}
        value={familyId}
        noneLabel={t('sanatorium.none')}
        options={(families.data ?? []).map((f) => ({ value: f.id, label: f.name, sub: `${f.members.length} ${t('sanatorium.members')}` }))}
        onChange={pickFamily}
        loading={families.isPending}
        testID="bs-family"
      />
      <Text variant="label" tone="muted">{t('sanatorium.guests')}</Text>
      {members.map((m) => (
        <View key={m.id} style={styles.member} testID={`member-row-${m.id}`}>
          <Text variant="body" weight="600">{m.name}</Text>
          <SwitchRow
            label={percent != null ? t('sanGuests.childLabel', { percent }) : t('sanatorium.childDiscount')}
            value={isChild(m)}
            onChange={(v) => setMembers((l) => l.map((x) => (x.id === m.id ? { ...x, child: v } : x)))}
            testID={`member-child-${m.id}`}
          />
          <Button label={t('sanatorium.remove')} variant="dangerGhost" size="sm" onPress={() => setMembers((l) => l.filter((x) => x.id !== m.id))} />
        </View>
      ))}
      <SearchField testID="bs-search" value={term} onChangeText={setTerm} placeholder={t('sanatorium.addGuestSearch')} />
      {(found.data ?? []).filter((g) => !members.some((m) => m.id === g.id)).slice(0, 6).map((g) => (
        <ListRow key={g.id} testID={`bs-found-${g.id}`} title={g.full_name} subtitle={g.phone ?? undefined} chevron onPress={() => add(g)} />
      ))}
      <BookingFields draft={draft} onChange={(p) => setDraft((d) => ({ ...d, ...p }))} need={Math.max(1, members.length)} />
      <ErrorLine message={error} testID="bs-error" />
      <Button testID="bs-save" label={t('sanatorium.createBooking')} full loading={create.isPending || flight.pending} onPress={() => void flight.run(submit)} />
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: 4, paddingBottom: 8 }, member: { paddingVertical: 4, gap: 2 } });
