// «Joylashtirish»: five short steps (Kim, Xona, Shifokor, Ovqat, Tekshirish) that place a guest in a
// room, with a doctor and a meal plan, in one go. The server suggests, the screen shows the
// suggestion prefilled and the registrar confirms. Opened for a request, for booked stays or a walk-in.
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { DateTimePickerModal } from '@/components/DateTimePicker';
import { Button, Card, ErrorState, LoadingView, PageHeader, ProgressBar, Screen, SearchField, SelectField, Text, ListRow } from '@/ui';
import { guestsQuery, requestsQuery, stayQuery } from '../../api/queries';
import { RoomPickerField } from '../../components/RoomPickerField';
import { ChoiceField, DateField, ErrorLine, SwitchRow } from '../../components/forms';
import { Denied, useSanAccess } from '../../components/common';
import { GUEST_TYPES, type GuestType } from '../../types';
import { useSanFeatures } from '../../utils/features';
import { fmtDate, fmtDateTime, fmtMoney, sanErrorMessage, todayIso, toLocalIso } from '../../utils/sanatorium';
import { optionsQuery, useCreateArrival } from '../api';
import { ArrivalResultView } from '../components/ArrivalResultView';
import type { ArrivalOptions, ArrivalResult } from '../types';
import {
  applySuggestions, buildArrivalBody, canCheckInNow, draftFromRequest, draftFromStays, emptyMember, examDefault, parseIds, partySize,
  slotLabel, validateStep, visibleSteps, type MemberDraft, type WizardDraft, type WizardStep,
} from '../utils';
import dayjs from 'dayjs';

export default function WizardScreen() {
  const { t } = useTranslation();
  const allowed = useSanAccess('registrar');
  const params = useLocalSearchParams<{ request?: string; stay?: string }>();
  const requestId = Number(params.request ?? 0);
  const stayIds = parseIds(params.stay);
  const reqs = useQuery(requestsQuery('new', allowed && requestId > 0));
  const stays = useQueries({ queries: stayIds.map((id) => stayQuery(id, allowed)) });
  if (!allowed) return <Denied />;

  let content: React.ReactNode;
  if (requestId > 0) {
    const req = reqs.data?.find((r) => r.id === requestId);
    content = reqs.isPending ? <LoadingView rows={3} /> : !req ? <ErrorState onRetry={() => void reqs.refetch()} /> : <Wizard key={`r${req.id}`} initial={draftFromRequest(req, todayIso())} declared={req.party_size ?? null} />;
  } else if (stayIds.length > 0) {
    const loaded = stays.every((s) => s.data);
    content = stays.some((s) => s.isPending) ? <LoadingView rows={3} /> : !loaded ? <ErrorState onRetry={() => stays.forEach((s) => void s.refetch())} /> : <Wizard key={`s${stayIds.join('-')}`} initial={draftFromStays(stays.map((s) => s.data!), todayIso())} />;
  } else {
    content = <Wizard key="walkin" initial={draftFromStays([], todayIso())} />;
  }
  return (
    <Screen testID="sanatorium-arrive-screen">
      <PageHeader title={t('sanSimple.wiz.title')} />
      {content}
    </Screen>
  );
}

function Wizard({ initial, declared = null }: { initial: WizardDraft; declared?: number | null }) {
  const { t } = useTranslation();
  const features = useSanFeatures();
  const create = useCreateArrival();
  const [d, setD] = useState<WizardDraft>(initial);
  const [step, setStep] = useState<WizardStep>('who');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ data: ArrivalResult; checkedIn: boolean } | null>(null);
  const [examTouched, setExamTouched] = useState(false);
  const people = partySize(d, declared);
  const periodOk = dayjs(d.end).isAfter(dayjs(d.start));
  const optsQ = useQuery(
    optionsQuery(
      { start: d.start, end: d.end, people, guest_type: d.guestType, ...(d.requestId ? { request_id: d.requestId } : {}), ...(d.stayIds[0] ? { stay_id: d.stayIds[0] } : {}) },
      periodOk,
    ),
  );
  const options = optsQ.data ?? null;
  const steps = visibleSteps({ options, doctorsOn: true, mealsOn: features.on('kitchen_menu') || features.on('diet'), dietOn: features.on('diet') });
  const idx = Math.max(0, steps.indexOf(step));

  // Take the server's suggestions once per options answer, never over what was chosen by hand.
  const applied = useRef<ArrivalOptions | null>(null);
  useEffect(() => {
    if (!options || applied.current === options) return;
    applied.current = options;
    setD((cur) => {
      const next = applySuggestions(cur, options);
      return examTouched ? next : { ...next, needExam: examDefault(next.guestType, options) && !!next.doctorId };
    });
  }, [options, examTouched]);

  const patch = (p: Partial<WizardDraft>) => {
    setError(null);
    setD((cur) => ({ ...cur, ...p }));
  };
  // A new period / type / head count means the old room and slot may no longer fit.
  const patchPeriod = (p: Partial<WizardDraft>) => patch({ ...p, roomId: d.stayIds.length ? d.roomId : null, examAt: null });

  const go = (to: WizardStep) => {
    setError(null);
    setStep(to);
  };
  const next = () => {
    const bad = validateStep(step, d);
    if (bad) return setError(t(`sanSimple.val.${bad}`));
    go(steps[Math.min(steps.length - 1, idx + 1)]!);
  };
  const back = () => (idx === 0 ? router.back() : go(steps[idx - 1]!));

  const submit = async (checkIn: boolean) => {
    for (const s of steps) {
      const bad = validateStep(s, d);
      if (bad) {
        go(s);
        return setError(t(`sanSimple.val.${bad}`));
      }
    }
    try {
      const data = await create.mutateAsync(buildArrivalBody(d, checkIn));
      setResult({ data, checkedIn: checkIn });
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };

  const reset = () => {
    setResult(null);
    setD(initial.requestId || initial.stayIds.length ? initial : { ...initial, members: [emptyMember()] });
    applied.current = null;
    setExamTouched(false);
    setStep('who');
  };

  if (result) return <ArrivalResultView result={result.data} checkedIn={result.checkedIn} onAnother={reset} />;

  return (
    <View style={styles.stack} testID="wizard">
      <View style={styles.stepHead}>
        <Text variant="label" tone="muted" testID="wizard-step">{t('sanSimple.wiz.stepOf', { n: idx + 1, total: steps.length })}</Text>
        <Text variant="title">{t(`sanSimple.wiz.step.${step}`)}</Text>
        <ProgressBar value={(idx + 1) / steps.length} />
        <Text variant="caption" tone="muted">{t(`sanSimple.wiz.help.${step}`)}</Text>
      </View>
      {step === 'who' && <WhoStep d={d} patch={patch} patchPeriod={patchPeriod} />}
      {step === 'room' && <RoomStep d={d} patch={patch} patchPeriod={patchPeriod} people={people} options={options} loading={optsQ.isPending && periodOk} failed={optsQ.isError} onRetry={() => void optsQ.refetch()} />}
      {step === 'doctor' && <DoctorStep d={d} patch={patch} options={options} onTouch={() => setExamTouched(true)} />}
      {step === 'meal' && <MealStep d={d} patch={patch} options={options} dietOn={features.on('diet')} />}
      {step === 'review' && <ReviewStep d={d} patch={patch} options={options} people={people} />}
      <ErrorLine message={error} testID="wizard-error" />
      {step === 'review' ? (
        <View style={styles.stack}>
          <Button testID="wizard-place" label={t('sanSimple.wiz.place')} size="lg" full icon="check" disabled={!canCheckInNow(d, todayIso())} loading={create.isPending} onPress={() => void submit(true)} />
          {!canCheckInNow(d, todayIso()) && <Text variant="caption" tone="muted">{t(d.roomId ? 'sanSimple.wiz.futureHint' : 'sanSimple.wiz.noRoomHint')}</Text>}
          <Button testID="wizard-book" label={t('sanSimple.wiz.bookOnly')} variant="soft" full loading={create.isPending} onPress={() => void submit(false)} />
        </View>
      ) : (
        <Button testID="wizard-next" label={t('sanSimple.wiz.next')} size="lg" full onPress={next} />
      )}
      <Button testID="wizard-back" label={idx === 0 ? t('common.cancel') : t('sanSimple.wiz.back')} variant="neutral" full onPress={back} />
    </View>
  );
}

type StepProps = { d: WizardDraft; patch: (p: Partial<WizardDraft>) => void };

function WhoStep({ d, patch, patchPeriod }: StepProps & { patchPeriod: (p: Partial<WizardDraft>) => void }) {
  const { t } = useTranslation();
  const fromStays = d.stayIds.length > 0;
  const fromRequest = d.requestId != null;
  const [q, setQ] = useState('');
  const found = useQuery(guestsQuery(q));
  const [extra, setExtra] = useState(false);
  const setMember = (i: number, p: Partial<MemberDraft>) => patch({ members: d.members.map((m, j) => (j === i ? { ...m, ...p } : m)) });
  return (
    <View style={styles.stack}>
      {!fromStays && !fromRequest && (
        <>
          <SearchField value={q} onChangeText={setQ} placeholder={t('sanSimple.wiz.findGuest')} testID="wiz-find" />
          {q.trim().length >= 2 && (found.data ?? []).slice(0, 4).map((g) => (
            <ListRow key={g.id} pressable testID={`wiz-found-${g.id}`} title={g.full_name} subtitle={g.phone ?? undefined} chevron onPress={() => { setMember(0, { guestId: g.id, name: g.full_name, phone: g.phone ?? '' }); setQ(''); }} />
          ))}
        </>
      )}
      {d.members.map((m, i) => (
        <Card key={i} testID={`wiz-member-${i}`}>
          {fromStays || m.guestId ? (
            <View>
              <Text variant="heading">{m.name}</Text>
              {!!m.phone && <Text variant="caption" tone="muted">{m.phone}</Text>}
              {!fromStays && !fromRequest && <Button label={t('sanSimple.wiz.otherGuest')} variant="link" size="sm" onPress={() => setMember(i, { guestId: undefined, name: '', phone: '' })} />}
            </View>
          ) : (
            <>
              <FormInput label={t('sanatorium.fullName')} value={m.name} onChangeText={(v) => setMember(i, { name: v })} required testID={`wiz-name-${i}`} />
              <FormInput label={t('sanatorium.phone')} value={m.phone} onChangeText={(v) => setMember(i, { phone: v })} keyboardType="phone-pad" testID={`wiz-phone-${i}`} />
              {extra && (
                <>
                  <FormInput label={t('sanatorium.birthDateInput')} value={m.birth} onChangeText={(v) => setMember(i, { birth: v })} placeholder="14.03.1985" keyboardType="numbers-and-punctuation" testID={`wiz-birth-${i}`} />
                  <FormInput label={t('sanatorium.passport')} value={m.passport} onChangeText={(v) => setMember(i, { passport: v.toUpperCase() })} placeholder="AA1234567" testID={`wiz-passport-${i}`} />
                </>
              )}
            </>
          )}
          {!fromStays && i > 0 && <Button label={t('sanSimple.wiz.removePerson')} variant="dangerGhost" size="sm" onPress={() => patch({ members: d.members.filter((_, j) => j !== i) })} />}
        </Card>
      ))}
      {!fromStays && !fromRequest && !d.members[0]?.guestId && (
        <Button testID="wiz-extra" label={extra ? t('sanSimple.wiz.lessFields') : t('sanSimple.wiz.moreFields')} variant="link" onPress={() => setExtra((v) => !v)} />
      )}
      {!fromStays && (
        <Button testID="wiz-add-person" label={t('sanSimple.wiz.addPerson')} variant="soft" icon="plus" onPress={() => patch({ members: [...d.members, emptyMember()] })} />
      )}
      <ChoiceField
        label={t('sanatorium.guestTypeLabel')}
        value={d.guestType}
        options={GUEST_TYPES.map((g: GuestType) => ({ value: g, label: t(`sanatorium.guestType.${g}`) }))}
        onChange={(v) => v && patchPeriod({ guestType: v, needExam: false })}
        testID="wiz-type"
      />
    </View>
  );
}

function RoomStep({ d, patch, patchPeriod, people, options, loading, failed, onRetry }: StepProps & { patchPeriod: (p: Partial<WizardDraft>) => void; people: number; options: ArrivalOptions | null; loading: boolean; failed: boolean; onRetry: () => void }) {
  const { t } = useTranslation();
  const nights = Math.max(0, dayjs(d.end).diff(dayjs(d.start), 'day'));
  return (
    <View style={styles.stack}>
      <DateField label={t('sanatorium.dateFrom')} value={d.start} onChange={(v) => patchPeriod({ start: v })} testID="wiz-start" />
      <DateField label={t('sanatorium.dateTo')} value={d.end} onChange={(v) => patchPeriod({ end: v })} testID="wiz-end" />
      <Text variant="caption" tone="muted">{t('sanSimple.wiz.nightsPeople', { nights, count: people })}</Text>
      {failed ? (
        <ErrorState onRetry={onRetry} />
      ) : (
        <RoomPickerField
          label={t('sanatorium.room')}
          value={d.roomId}
          noneLabel={t('sanSimple.wiz.roomLater')}
          loading={loading}
          options={(options?.rooms ?? []).map((r) => ({
            id: r.id,
            title: `${[r.number, r.building].filter(Boolean).join(' · ')}${r.id === options?.suggested_room_id ? ` · ${t('sanSimple.wiz.suggested')}` : ''}`,
            sub: `${t('sanatorium.freeBeds')}: ${r.free_beds}/${r.capacity}${r.price_per_day ? ` · ${fmtMoney(r.price_per_day)}` : ''}${r.ready === false ? ` · ${t('sanSimple.room.notReady')}` : ''}${r.fits === false ? ` · ${t('sanSimple.room.noFit')}` : ''}${r.held ? ` · ${t('sanSimple.room.held')}` : ''}`,
          }))}
          onChange={(v) => patch({ roomId: v })}
          testID="wiz-room"
        />
      )}
      {(options?.warnings ?? []).map((w) => (
        <Text key={w} variant="caption" tone="danger" testID={`wiz-warn-${w}`}>{t(`sanSimple.warn.${w}`, { defaultValue: w })}</Text>
      ))}
    </View>
  );
}

function DoctorStep({ d, patch, options, onTouch }: StepProps & { options: ArrivalOptions | null; onTouch: () => void }) {
  const { t } = useTranslation();
  const [pick, setPick] = useState(false);
  const doctors = options?.doctors ?? [];
  const doc = doctors.find((x) => x.staff_id === d.doctorId);
  return (
    <View style={styles.stack}>
      <SwitchRow label={t('sanSimple.wiz.needExam')} value={d.needExam} onChange={(v) => { onTouch(); patch({ needExam: v }); }} testID="wiz-need-exam" />
      {!d.needExam && <Text variant="caption" tone="muted" testID="wiz-no-exam">{t('sanSimple.wiz.noExam')}</Text>}
      {d.needExam && (
        <>
          <ChoiceField
            label={t('sanatorium.doctor')}
            value={d.doctorId}
            options={doctors.map((x) => ({ value: x.staff_id, label: x.full_name, sub: [x.specialty, x.cabinet, x.load != null ? t('sanSimple.wiz.load', { count: x.load }) : null].filter(Boolean).join(' · ') }))}
            onChange={(v) => { const nd = doctors.find((x) => x.staff_id === v); patch({ doctorId: v, examAt: nd?.next_slots?.[0] ?? null }); }}
            testID="wiz-doctor"
          />
          {!!doc && (doc.cabinet || doc.place) && <Text variant="caption" tone="muted">{t('sanSimple.wiz.cabinet')}: {[doc.cabinet, doc.place].filter(Boolean).join(' · ')}</Text>}
          <View style={styles.slots} testID="wiz-slots">
            {(doc?.next_slots ?? []).map((s) => (
              <Button key={s} label={slotLabel(s)} size="sm" variant={d.examAt === s ? 'primary' : 'soft'} onPress={() => patch({ examAt: s })} testID={`wiz-slot-${s}`} />
            ))}
          </View>
          <SelectField label={t('sanatorium.dateTime')} value={d.examAt ? fmtDateTime(d.examAt) : undefined} placeholder="—" icon="calendar" onPress={() => setPick(true)} testID="wiz-exam-at" />
          <DateTimePickerModal visible={pick} value={d.examAt} title={t('sanatorium.dateTime')} onConfirm={(iso) => patch({ examAt: toLocalIso(iso) })} onClose={() => setPick(false)} />
        </>
      )}
      <ChoiceField
        label={t('sanatorium.nurse')}
        value={d.nurseId}
        noneLabel={t('sanatorium.none')}
        options={(options?.nurses ?? []).map((x) => ({ value: x.staff_id, label: x.full_name, sub: x.load != null ? t('sanSimple.wiz.load', { count: x.load }) : undefined }))}
        onChange={(v) => patch({ nurseId: v })}
        testID="wiz-nurse"
      />
    </View>
  );
}

function MealStep({ d, patch, options, dietOn }: StepProps & { options: ArrivalOptions | null; dietOn: boolean }) {
  const { t } = useTranslation();
  const m = options?.meals;
  return (
    <View style={styles.stack}>
      <SwitchRow label={t('sanatorium.meals')} value={d.withMeals} onChange={(v) => patch({ withMeals: v })} testID="wiz-meals" />
      {d.withMeals && !!m && (m.breakfast || m.lunch || m.dinner) && (
        <Text variant="caption" tone="muted">{(['breakfast', 'lunch', 'dinner'] as const).filter((k) => m[k]).map((k) => `${t(`sanatorium.meal.${k}`)} ${m[k]}`).join(' · ')}</Text>
      )}
      {(options?.packages ?? []).length > 0 && (
        <ChoiceField label={t('sanatorium.s2.package')} value={d.packageId} noneLabel={t('sanatorium.none')} options={(options?.packages ?? []).map((p) => ({ value: p.id, label: p.name }))} onChange={(v) => patch({ packageId: v })} testID="wiz-package" />
      )}
      {d.withMeals && dietOn && (options?.diets ?? []).length > 0 && (
        <ChoiceField label={t('sanatorium.diet')} value={d.dietId} noneLabel={t('sanatorium.none')} options={(options?.diets ?? []).map((x) => ({ value: x.id, label: x.name }))} onChange={(v) => patch({ dietId: v })} testID="wiz-diet" />
      )}
      {d.withMeals && <FormInput label={t('sanatorium.dietNote')} value={d.dietNote} onChangeText={(v) => patch({ dietNote: v })} multiline testID="wiz-diet-note" />}
      {dietOn && <FormInput label={t('sanatorium.s2.allergies')} value={d.allergies} onChangeText={(v) => patch({ allergies: v })} multiline testID="wiz-allergies" />}
    </View>
  );
}

function ReviewStep({ d, patch, options, people }: StepProps & { options: ArrivalOptions | null; people: number }) {
  const { t } = useTranslation();
  const room = options?.rooms.find((r) => r.id === d.roomId);
  const doc = options?.doctors.find((x) => x.staff_id === d.doctorId);
  const rows: [string, string][] = [
    [t('sanSimple.wiz.step.who'), d.members.map((m) => m.name).filter(Boolean).join(', ') || '—'],
    [t('sanatorium.guestTypeLabel'), t(`sanatorium.guestType.${d.guestType}`)],
    [t('sanatorium.period'), `${fmtDate(d.start)} → ${fmtDate(d.end)} · ${t('sanSimple.wiz.people', { count: people })}`],
    [t('sanatorium.room'), room ? [room.number, room.building].filter(Boolean).join(' · ') : d.roomId ? String(d.roomId) : t('sanSimple.wiz.roomLater')],
    [t('sanatorium.doctor'), d.needExam ? `${doc?.full_name ?? '—'}${d.examAt ? ` · ${fmtDateTime(d.examAt)}` : ''}` : t('sanSimple.wiz.noExam')],
    [t('sanatorium.meals'), d.withMeals ? t('sanatorium.yes') : t('sanatorium.no')],
  ];
  return (
    <View style={styles.stack}>
      <Card testID="wiz-review">
        {rows.map(([k, v]) => (
          <View key={k} style={styles.fact}>
            <Text variant="caption" tone="muted" style={styles.factLabel}>{k}</Text>
            <Text variant="body" style={styles.flex}>{v}</Text>
          </View>
        ))}
      </Card>
      <FormInput label={t('sanSimple.wiz.prepay')} value={d.payment} onChangeText={(v) => patch({ payment: v })} keyboardType="decimal-pad" testID="wiz-payment" />
      <FormInput label={t('sanatorium.notes')} value={d.note} onChangeText={(v) => patch({ note: v })} multiline testID="wiz-note" />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: 10 },
  stepHead: { gap: 4, marginBottom: 4 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fact: { flexDirection: 'row', gap: 8, paddingVertical: 3 },
  factLabel: { width: 90 },
});
