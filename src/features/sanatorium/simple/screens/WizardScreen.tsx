// «Mehmonni joylashtirish»: one flow from the door to the room, the doctor and the kitchen. Opened empty
// (walk-in), from a request, from booked stays, or for a known guest. The server suggests, the registrar confirms.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { confirm } from '@/lib/confirm';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Button, ErrorState, IconButton, LoadingView, PageHeader, Screen, Text } from '@/ui';
import { guestQuery, requestsQuery, settingsQuery, stayQuery } from '../../api/queries';
import { useUpdateStay } from '../../api/mutations';
import { Denied, useSanAccess, useSanReadOnly } from '../../components/common';
import type { GuestLite } from '../../types';
import { useSanFeatures } from '../../utils/features';
import { sanErrorInfo, todayIso } from '../../utils/sanatorium';
import { fetchCreated, optionsQuery, useCreateArrival } from '../api';
import { ArrivalResultView } from '../components/ArrivalResultView';
import { HelpSheet } from '../components/HelpSheet';
import { Note } from '../components/parts';
import { flowErrorText } from '../errors';
import type { ArrivalOptions, ArrivalResult, Prefill } from '../types';
import { parseIds } from '../utils';
import { StepDoctor } from '../wizard/StepDoctor';
import { StepMeals } from '../wizard/StepMeals';
import { StepReview } from '../wizard/StepReview';
import { StepRoom } from '../wizard/StepRoom';
import { StepWho } from '../wizard/StepWho';
import {
  buildBody, clearedHealth, derive, emptyState, memberErrors, memberFromGuest, newMember, nightsOf, plusDays, prefillFromRequest, prefillFromStays, startStep, stateFromPrefill, stepForError,
  stepWarnings, typedPerson, wizardSteps, type StepKey, type WizState,
} from '../wizard/state';

type Params = { request?: string; stay?: string; guest?: string; name?: string };

export default function WizardScreen() {
  const registrar = useSanAccess('registrar');
  const readOnly = useSanReadOnly();
  const p = useLocalSearchParams<Params>();
  if (!registrar || readOnly) return <Denied />;
  // The key restarts the whole flow when another request / booking is opened.
  return <Entry key={[p.request, p.stay, p.guest, p.name].join('|')} p={p} />;
}

/** Loads what the flow was opened for and hands a ready draft to the wizard. */
function Entry({ p }: { p: Params }) {
  const { t } = useTranslation();
  const requestId = Number(p.request ?? 0) || 0;
  const stayIds = parseIds(p.stay);
  const guestId = Number(p.guest ?? 0) || 0;
  const source = requestId > 0 || stayIds.length > 0;
  // First call without dates: the server answers with everything it knows about the request / booking.
  const pre = useQuery(optionsQuery(requestId > 0 ? { request_id: requestId } : { stay_id: stayIds[0] ?? 0 }, source));
  const prefill: Prefill | null = pre.data?.prefill ?? null;
  // Older answer without `prefill`: the draft is built from the request list / the stays themselves.
  const legacy = source && pre.isSuccess && !prefill;
  const reqs = useQuery(requestsQuery('new', legacy && requestId > 0));
  const stays = useQueries({ queries: stayIds.map((id) => stayQuery(id, legacy && requestId <= 0)) });
  const guest = useQuery(guestQuery(source ? 0 : guestId));

  const shell = (children: React.ReactNode) => (
    <Screen testID="sanatorium-arrive-screen">
      <PageHeader title={t('sanFlow.wizard.title')} />
      {children}
    </Screen>
  );
  if (source) {
    if (pre.isPending) return shell(<LoadingView rows={3} />);
    if (pre.isError) {
      return shell(
        <View style={styles.stack}>
          <Note tone="danger" testID="wizard-load-error">{flowErrorText(pre.error, t('errors.generic'))}</Note>
          <Button label={t('common.retry')} variant="soft" onPress={() => void pre.refetch()} testID="wizard-retry" />
          <Button label={t('sanFlow.done.home')} variant="neutral" onPress={goHome} />
        </View>,
      );
    }
    const known = prefill
      ?? (requestId > 0 ? (reqs.data?.find((r) => r.id === requestId) ? prefillFromRequest(reqs.data.find((r) => r.id === requestId)!) : null) : stays.every((s) => s.data) ? prefillFromStays(stays.map((s) => s.data!)) : null);
    if (!known) {
      const failed = requestId > 0 ? reqs.isError || reqs.isSuccess : stays.some((s) => s.isError);
      return shell(failed ? <ErrorState onRetry={() => { void reqs.refetch(); stays.forEach((s) => void s.refetch()); }} /> : <LoadingView rows={3} />);
    }
    return <Wizard initial={stateFromPrefill(known, todayIso())} first={pre.data} requestId={requestId || undefined} stayId={requestId > 0 ? undefined : stayIds[0]} known={known} />;
  }
  if (guestId > 0) {
    if (guest.isPending) return shell(<LoadingView rows={3} />);
    if (guest.isError || !guest.data) return shell(<ErrorState onRetry={() => void guest.refetch()} />);
    const g: GuestLite = { ...guest.data.guest, id: guestId };
    return <Wizard initial={{ ...emptyState(todayIso()), members: [memberFromGuest(g)] }} />;
  }
  return <Wizard initial={{ ...emptyState(todayIso()), members: [newMember(typedPerson(p.name ?? ''))] }} />;
}

const goHome = () => (router.canGoBack() ? router.back() : router.replace('/sanatorium'));

function Wizard({ initial, first, requestId, stayId, known = null }: { initial: WizState; first?: ArrivalOptions; requestId?: number; stayId?: number; known?: Prefill | null }) {
  const { t } = useTranslation();
  const features = useSanFeatures();
  const settings = useQuery(settingsQuery());
  const create = useCreateArrival();
  const patchStay = useUpdateStay();
  const today = todayIso();
  const [s, setS] = useState<WizState>(initial);
  const [step, setStep] = useState<StepKey>(() => startStep(initial, first));
  const [visited, setVisited] = useState<Set<StepKey>>(() => new Set<StepKey>(startStep(initial, first) === 'review' ? ['who', 'room', 'doctor', 'meals', 'review'] : startStep(initial, first) === 'room' ? ['who', 'room'] : ['who']));
  const [showErrors, setShowErrors] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [help, setHelp] = useState(false);
  const [result, setResult] = useState<{ data: ArrivalResult; checkedIn: boolean; replayed?: boolean } | null>(null);
  // State is set one render later than the second press of a fast double tap.
  const sending = useRef(false);
  const [busy, setBusy] = useState<null | 'in' | 'book'>(null);
  const set = (p: Partial<WizState>) => {
    setFailure(null);
    setS((x) => ({ ...x, ...p }));
  };

  const opts = useQuery(
    optionsQuery(
      { start: s.start, end: s.end, people: s.members.length, guest_type: s.guestType, ...(requestId ? { request_id: requestId } : {}), ...(stayId ? { stay_id: stayId } : {}) },
      !result && s.end > s.start,
    ),
  );
  const o = opts.data ?? first;
  const limit = o?.child_age_limit ?? settings.data?.child_age_limit ?? 14;
  const percent = o?.child_discount_percent ?? settings.data?.child_discount_percent ?? 50;
  const d = useMemo(() => derive(s, o, limit), [s, o, limit]);
  const mealsOn = features.on('kitchen_menu') || features.on('diet');
  const steps = wizardSteps(s, o, mealsOn);
  const idx = Math.max(0, steps.indexOf(step));
  const current = steps[idx]!;
  const whoOk = s.members.length > 0 && s.members.every((m) => Object.keys(memberErrors(m)).length === 0);

  const go = (k: StepKey) => {
    // The doctor step of a guest who needs none is opened from the review: asking for it makes it a real step.
    if (k === 'doctor' && !steps.includes('doctor')) setS((x) => ({ ...x, wantDoctor: true }));
    setFailure(null);
    setStep(k);
    setVisited((v) => new Set(v).add(k));
  };
  const next = () => {
    if (current === 'who' && !whoOk) return setShowErrors(true);
    if (current === 'room' && s.end <= s.start) return;
    if (idx < steps.length - 1) go(steps[idx + 1]!);
  };
  const leave = async () => {
    const dirty = s.source !== 'walkin' || s.members.some((m) => m.full_name.trim());
    if (dirty && !(await confirm({ title: t('sanFlow.wizard.leaveTitle'), message: t('sanFlow.wizard.leaveText'), confirmLabel: t('sanFlow.wizard.leaveYes'), cancelLabel: t('common.cancel') }))) return;
    goHome();
  };

  // The phone's back button walks the steps and asks before leaving, instead of dropping the whole form.
  const onBackRef = useRef<() => void>(() => {});
  useEffect(() => {
    onBackRef.current = () => (idx === 0 ? void leave() : go(steps[idx - 1]!));
  });
  useEffect(() => {
    if (result) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBackRef.current();
      return true;
    });
    return () => sub.remove();
  }, [result]);

  const submit = async (checkIn: boolean) => {
    if (sending.current) return;
    if (!whoOk) {
      setShowErrors(true);
      return go('who');
    }
    setFailure(null);
    sending.current = true;
    setBusy(checkIn ? 'in' : 'book');
    try {
      const data = await create.mutateAsync(buildBody(s, d, { checkIn, childLimit: limit, diet: features.on('diet'), documents: features.on('documents'), packages: features.on('packages') }));
      setResult({ data, checkedIn: checkIn });
      // The arrival never erases a stored diet or allergy: what was cleared here is cleared on the stay.
      clearedHealth(s, d, features.on('diet')).forEach((clear, i) => {
        const id = data.stays[i]?.id;
        if (clear && id) patchStay.mutate({ id, body: clear });
      });
    } catch (err) {
      // The first press did get through (its answer was lost): show what it created instead of an error.
      const info = sanErrorInfo(err);
      const made = info.code === 'duplicate_submit' && Array.isArray(info.params.stay_ids) ? (info.params.stay_ids as number[]) : [];
      const data = made.length ? await fetchCreated(made).catch(() => null) : null;
      if (data) setResult({ data, checkedIn: data.stays.some((x) => x.status === 'checked_in'), replayed: true });
      else {
        setFailure(err);
        // Somebody else may have taken the room or the time meanwhile: the steps must offer what is free now.
        void opts.refetch();
      }
    } finally {
      sending.current = false;
      setBusy(null);
    }
  };

  /** The booked period is over: the same number of nights from today. */
  const renew = () => {
    set({ start: today, end: plusDays(today, Math.max(1, nightsOf(s.start, s.end))), renewed: true, examAt: {} });
    go('room');
  };
  const again = () => {
    if (requestId || stayId || s.members[0]?.guest_id) return router.replace('/sanatorium-arrive');
    setResult(null);
    setS({ ...emptyState(todayIso()), members: [newMember()] });
    setStep('who');
    setShowErrors(false);
    setVisited(new Set(['who']));
  };

  if (result) {
    return (
      <Screen testID="sanatorium-arrive-screen">
        <PageHeader title={t('sanFlow.wizard.title')} />
        <ArrivalResultView result={result.data} checkedIn={result.checkedIn} replayed={result.replayed} onAnother={again} onHome={goHome} />
      </Screen>
    );
  }

  const canSettle = (!!d.roomId || d.keepsRooms) && s.start <= today;
  const info = sanErrorInfo(failure);
  const fixStep = stepForError(info.code);
  const openId = info.code === 'duplicate_submit' ? (info.params.stay_ids as number[] | undefined)?.[0] : info.code === 'guest_has_stay' || info.code === 'stay_not_booked' ? (info.params.stay_id as number | undefined) : undefined;
  const failAction = info.code === 'request_handled'
    ? { label: t('sanFlow.done.home'), onPress: goHome, testID: 'wizard-home' }
    : info.code === 'extend_first'
      ? { label: t('sanFlow.wizard.renew'), onPress: renew, testID: 'extend-dates' }
      : openId
        ? { label: t('sanFlow.wizard.openStay'), onPress: () => router.push({ pathname: '/sanatorium-stay', params: { id: String(openId) } }), testID: 'open-existing' }
        : fixStep && fixStep !== current && steps.includes(fixStep)
          ? { label: t('sanFlow.wizard.fix', { step: t(`sanFlow.steps.${fixStep}`) }), onPress: () => go(fixStep), testID: 'fix-step' }
          : undefined;
  const warnings = stepWarnings(o?.warnings ?? [], current, { start: s.start, today, housekeeping: features.on('housekeeping'), doctorNeeded: d.doctorNeeded });

  return (
    // A new step starts from its top.
    <Screen key={current} testID="sanatorium-arrive-screen">
      <PageHeader
        title={t(s.source === 'stay' ? 'sanFlow.wizard.titleStay' : s.source === 'request' ? 'sanFlow.wizard.titleRequest' : 'sanFlow.wizard.title')}
        right={(
          <View style={styles.headBtns}>
            <IconButton icon="help" tone="soft" accessibilityLabel={t('sanSimple.help.title')} onPress={() => setHelp(true)} testID="wizard-help" />
            <IconButton icon="close" tone="soft" accessibilityLabel={t('common.close')} onPress={() => void leave()} testID="wizard-close" />
          </View>
        )}
      />
      <View style={styles.stack} testID="wizard">
        <Stepper steps={steps} idx={idx} canOpen={(k) => visited.has(k) && busy === null && (k === 'who' || whoOk)} onOpen={go} />
        <Text variant="title" testID="wizard-title">{t(`sanFlow.stepTitle.${current}`)}</Text>
        <Text variant="caption" tone="muted">{t(`sanFlow.stepHint.${current}`)}</Text>
        {warnings.map((w) => (
          <Note
            key={w} tone="warning" testID={`wiz-warn-${w}`}
            action={w === 'start_in_past' ? { label: t('sanFlow.room.fromToday'), onPress: () => set({ start: today, end: s.end > today ? s.end : plusDays(today, 1), examAt: {} }), testID: 'from-today' } : undefined}
          >
            {t(`sanFlow.optWarn.${w}`, { defaultValue: w })}
          </Note>
        ))}
        {current === 'who' && <StepWho s={s} set={set} limit={limit} percent={percent} showErrors={showErrors} party={known?.party_size ?? o?.prefill?.party_size} />}
        {current === 'room' && (
          <StepRoom
            s={s} set={set} o={o} d={d} loading={opts.isPending} failed={opts.isError && !opts.data} onRetry={() => void opts.refetch()}
            preferredId={known?.source === 'request' ? known.room_id ?? undefined : undefined}
          />
        )}
        {current === 'doctor' && <StepDoctor s={s} set={set} o={o} d={d} />}
        {current === 'meals' && <StepMeals s={s} set={set} o={o} d={d} />}
        {current === 'review' && <StepReview s={s} set={set} o={o} d={d} limit={limit} go={go} mealsStep={mealsOn} />}

        {!!s.renewed && (current === 'room' || current === 'review') && <Note tone="info" testID="renewed">{t('sanFlow.wizard.renewed')}</Note>}
        {failure != null && <Note tone="danger" testID="wizard-error" action={failAction}>{flowErrorText(failure, t('errors.generic'))}</Note>}
        {current === 'who' && showErrors && !whoOk && <Note tone="danger" testID="fix-first">{t('sanFlow.who.fixFirst')}</Note>}

        {current !== 'review' ? (
          <Button testID="wizard-next" label={t('sanFlow.wizard.next')} size="lg" full onPress={next} />
        ) : (
          <>
            <Button
              testID="wizard-finish" size="lg" full icon="check" loading={busy === (canSettle ? 'in' : 'book')} disabled={busy !== null || s.end <= s.start} onPress={() => void submit(canSettle)}
              label={t(canSettle ? 'sanFlow.wizard.settle' : s.source === 'stay' ? 'sanFlow.wizard.saveOnly' : 'sanFlow.wizard.book')}
            />
            {canSettle && <Button testID="wizard-book" label={t(s.source === 'stay' ? 'sanFlow.wizard.saveOnly' : 'sanFlow.wizard.bookOnly')} variant="soft" full loading={busy === 'book'} disabled={busy !== null} onPress={() => void submit(false)} />}
            {!canSettle && <Text variant="caption" tone="muted" testID="wizard-why">{t(d.roomId ? 'sanFlow.wizard.bookOnlyWhyDate' : 'sanFlow.wizard.bookOnlyWhyRoom')}</Text>}
          </>
        )}
        <Button testID="wizard-back" label={idx === 0 ? t('common.cancel') : t('sanFlow.wizard.back')} variant="neutral" full disabled={busy !== null} onPress={() => (idx === 0 ? void leave() : go(steps[idx - 1]!))} />
      </View>
      <HelpSheet open={help} onClose={() => setHelp(false)} />
    </Screen>
  );
}

/** Numbered steps; the ones already seen can be opened directly. */
function Stepper({ steps, idx, canOpen, onOpen }: { steps: StepKey[]; idx: number; canOpen: (k: StepKey) => boolean; onOpen: (k: StepKey) => void }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  return (
    <View style={styles.steps} testID="wizard-steps">
      {steps.map((k, i) => {
        const now = i === idx;
        const done = i < idx;
        const open = !now && canOpen(k);
        return (
          <Pressable
            key={k} disabled={!open} onPress={() => onOpen(k)} accessibilityRole="button" accessibilityState={{ selected: now, disabled: !open }} accessibilityLabel={`${i + 1}. ${t(`sanFlow.steps.${k}`)}`}
            testID={`step-${k}`} style={[styles.step, { backgroundColor: now ? c.brandSoft : done ? c.successSoft : c.surface, borderColor: now ? c.brand : c.border }]}
          >
            <Text variant="label" weight="800" style={{ color: now ? c.brandStrong : done ? c.success : c.fgMuted }}>{done ? '✓' : String(i + 1)}</Text>
            <Text variant="caption" numberOfLines={1} style={{ color: now ? c.brandStrong : done ? c.success : c.fgMuted }}>{t(`sanFlow.steps.${k}`)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
  headBtns: { flexDirection: 'row', gap: 6 },
  steps: { flexDirection: 'row', gap: 4 },
  step: { flex: 1, alignItems: 'center', paddingVertical: 6, paddingHorizontal: 2, borderRadius: radii.md, borderWidth: 1 },
});
