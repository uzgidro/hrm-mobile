// The booking field group shared by «new booking», «edit stay» and «accept request»:
// guest type, dates, a room that still has free beds for the WHOLE period, meals, doctor,
// nurse, contract note and note. Stateless: the owner keeps the draft.
import React, { useMemo } from 'react';
import { View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { Text } from '@/ui';
import { availabilityQuery, staffRoleQuery } from '../api/queries';
import { GUEST_TYPES, type GuestType } from '../types';
import { minFreeBeds, todayIso } from '../utils/sanatorium';
import { ChoiceField, DateField, SwitchRow } from './forms';

export type BookingDraft = {
  type: GuestType;
  from: string;
  to: string;
  roomId: number | null;
  meals: boolean;
  diet: string;
  doctorId: number | null;
  nurseId: number | null;
  contract: string;
  note: string;
};

export const newBookingDraft = (over: Partial<BookingDraft> = {}): BookingDraft => ({
  type: 'treatment',
  from: todayIso(),
  to: dayjs().add(10, 'day').format('YYYY-MM-DD'),
  roomId: null,
  meals: true,
  diet: '',
  doctorId: null,
  nurseId: null,
  contract: '',
  note: '',
  ...over,
});

export function BookingFields({
  draft,
  onChange,
  showDiet = true,
  keepRoom,
}: {
  draft: BookingDraft;
  onChange: (patch: Partial<BookingDraft>) => void;
  showDiet?: boolean;
  /** Editing a stay: its own room must stay selectable even though its own bed counts as taken. */
  keepRoom?: { id: number; label: string } | null;
}) {
  const { t } = useTranslation();
  const valid = dayjs(draft.to).isAfter(dayjs(draft.from));
  const nights = Math.min(62, Math.max(1, dayjs(draft.to).diff(dayjs(draft.from), 'day')));
  const avail = useQuery(availabilityQuery(draft.from, nights, valid));
  const doctors = useQuery(staffRoleQuery('doctor'));
  const nurses = useQuery(staffRoleQuery('nurse'));
  const rooms = useMemo(() => {
    const list = (avail.data?.rooms ?? [])
      .filter((r) => !r.out_of_service)
      .map((r) => ({ r, free: minFreeBeds(r.capacity, r.occupancy) }))
      .filter((x) => x.free > 0 || x.r.id === keepRoom?.id)
      .map(({ r, free }) => ({
        value: r.id,
        label: [r.number, r.building].filter(Boolean).join(' · '),
        sub: `${t('sanatorium.freeBeds')}: ${free}/${r.capacity}`,
      }));
    if (keepRoom && !list.some((x) => x.value === keepRoom.id)) list.unshift({ value: keepRoom.id, label: keepRoom.label, sub: '' });
    return list;
  }, [avail.data, keepRoom, t]);

  return (
    <View testID="booking-fields">
      <ChoiceField
        label={t('sanatorium.guestTypeLabel')}
        value={draft.type}
        options={GUEST_TYPES.map((g) => ({ value: g, label: t(`sanatorium.guestType.${g}`) }))}
        onChange={(v) => v && onChange({ type: v })}
        testID="bk-type"
      />
      <DateField label={t('sanatorium.dateFrom')} value={draft.from} onChange={(v) => onChange({ from: v, roomId: null })} testID="bk-from" />
      <DateField label={t('sanatorium.dateTo')} value={draft.to} onChange={(v) => onChange({ to: v, roomId: null })} testID="bk-to" />
      {!valid && <Text variant="label" tone="danger">{t('sanatorium.errors.invalid_period')}</Text>}
      <ChoiceField
        label={t('sanatorium.room')}
        value={draft.roomId}
        noneLabel={t('sanatorium.noRoom')}
        options={rooms}
        onChange={(v) => onChange({ roomId: v })}
        loading={avail.isPending && valid}
        testID="bk-room"
      />
      <SwitchRow label={t('sanatorium.withMeals')} value={draft.meals} onChange={(v) => onChange({ meals: v })} testID="bk-meals" />
      {showDiet && draft.meals && <FormInput label={t('sanatorium.dietNote')} value={draft.diet} onChangeText={(v) => onChange({ diet: v })} testID="bk-diet" />}
      <ChoiceField
        label={t('sanatorium.doctor')}
        value={draft.doctorId}
        noneLabel={t('sanatorium.none')}
        options={(doctors.data ?? []).map((d) => ({ value: d.id, label: d.full_name, sub: d.specialty ?? undefined }))}
        onChange={(v) => onChange({ doctorId: v })}
        loading={doctors.isPending}
        testID="bk-doctor"
      />
      <ChoiceField
        label={t('sanatorium.nurse')}
        value={draft.nurseId}
        noneLabel={t('sanatorium.none')}
        options={(nurses.data ?? []).map((d) => ({ value: d.id, label: d.full_name }))}
        onChange={(v) => onChange({ nurseId: v })}
        loading={nurses.isPending}
        testID="bk-nurse"
      />
      <FormInput label={t('sanatorium.contractNote')} value={draft.contract} onChangeText={(v) => onChange({ contract: v })} testID="bk-contract" />
      <FormInput label={t('sanatorium.notes')} value={draft.note} onChangeText={(v) => onChange({ note: v })} multiline testID="bk-note" />
    </View>
  );
}
