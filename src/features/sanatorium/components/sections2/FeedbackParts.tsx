// Paper feedback entry (registrar): stay picker, star inputs, doctor / service items. Also the
// pressable star input and the list filter block.
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Button, ListRow, SearchField, SelectField, Sheet, Text } from '@/ui';
import { staffRoleQuery, staysInfinite } from '../../api/queries';
import { useCreateFeedback } from '../../api/sections2';
import { ChoiceField, ErrorLine } from '../forms';
import { FEEDBACK_SOURCES, FEEDBACK_STAY_STATUSES, emptyFeedbackDraft, emptyFeedbackItem, feedbackBody, type FeedbackDraft, type FeedbackFilterDraft, type FeedbackItemDraft } from '../../utils/sections2';
import { fmtDate, sanErrorMessage } from '../../utils/sanatorium';
import { ChipWrap, FieldLabel } from './kit';
import { useSingleFlight } from '../../simple/useSingleFlight';

/** Five pressable stars. Tapping the current value clears it when `clearable` (optional ratings). */
export function StarInput({ value, onChange, clearable, label, testID }: { value: number; onChange: (n: number) => void; clearable?: boolean; label: string; testID?: string }) {
  const { colors: c } = useTheme();
  return (
    <View style={styles.stars} accessibilityRole="radiogroup" accessibilityLabel={label} testID={testID}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          onPress={() => onChange(clearable && value === n ? 0 : n)}
          hitSlop={4}
          style={styles.star}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === n }}
          accessibilityLabel={`${label}: ${n}`}
          testID={testID ? `${testID}-${n}` : undefined}
        >
          <Text variant="title" style={{ color: value >= n ? c.warning : c.fgSubtle }}>{value >= n ? '★' : '☆'}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const STATUS_PICK = FEEDBACK_STAY_STATUSES;

function StayPicker({ onPick, onBack }: { onPick: (s: { id: number; label: string }) => void; onBack: () => void }) {
  const { t } = useTranslation();
  const [term, setTerm] = useState('');
  const [status, setStatus] = useState('checked_out');
  const q = useDebouncedValue(term);
  const stays = useInfiniteQuery(staysInfinite({ status, ...(q.trim() ? { q: q.trim() } : {}) }));
  const items = stays.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <View testID="fb-stay-picker">
      <Button label={t('common.back')} size="sm" variant="ghost" icon="chevronLeft" onPress={onBack} testID="fb-stay-back" />
      <SearchField testID="fb-stay-search" value={term} onChangeText={setTerm} placeholder={t('sanatorium.s2.searchStay')} />
      <ChipWrap options={STATUS_PICK.map((s) => ({ value: s, label: t(`sanatorium.stayStatus.${s}`) }))} isOn={(v) => v === status} onToggle={setStatus} testID="fb-stay-status" />
      {stays.isPending && <Text variant="caption" tone="muted">{t('sanatorium.loading')}</Text>}
      {!stays.isPending && items.length === 0 && <Text variant="caption" tone="muted" testID="fb-stay-empty">{t('sanCatalog.fb.noStays')}</Text>}
      {items.map((s) => (
        <ListRow
          key={s.id}
          testID={`fb-stay-${s.id}`}
          title={s.guest?.full_name ?? '—'}
          subtitle={`${s.room ? `${t('sanatorium.room')} ${s.room.number} · ` : ''}${fmtDate(s.planned_from)} → ${fmtDate(s.planned_to)}`}
          onPress={() => onPick({ id: s.id, label: `${s.guest?.full_name ?? '—'} · ${fmtDate(s.planned_from)} → ${fmtDate(s.planned_to)}` })}
        />
      ))}
      {stays.hasNextPage && <Button label={t('sanatorium.showMore')} variant="soft" full loading={stays.isFetchingNextPage} onPress={() => void stays.fetchNextPage()} testID="fb-stay-more" />}
    </View>
  );
}

function ItemEditor({ it, index, doctors, onChange, onRemove }: {
  it: FeedbackItemDraft; index: number; doctors: { value: number; label: string }[]; onChange: (p: Partial<FeedbackItemDraft>) => void; onRemove: () => void;
}) {
  const { t } = useTranslation();
  const id = `fb-item-${index}`;
  const { colors: c } = useTheme();
  return (
    <View style={[styles.item, { borderColor: c.border }]} testID={id}>
      <ChipWrap
        options={[{ value: 'doctor', label: t('sanCatalog.fb.kindDoctor') }, { value: 'service', label: t('sanCatalog.fb.kindService') }]}
        isOn={(v) => v === it.kind}
        onToggle={(v) => onChange({ kind: v as 'doctor' | 'service', refId: null, name: '' })}
        testID={`${id}-kind`}
      />
      {it.kind === 'doctor' ? (
        <ChoiceField label={t('sanCatalog.fb.kindDoctor')} value={it.refId} options={doctors} onChange={(v) => onChange({ refId: v })} placeholder={t('sanCatalog.fb.pickDoctor')} testID={`${id}-doctor`} />
      ) : (
        <FormInput label={t('sanCatalog.fb.serviceName')} value={it.name} onChangeText={(v) => onChange({ name: v })} maxLength={150} testID={`${id}-name`} />
      )}
      <StarInput label={t('sanCatalog.fb.rating')} value={it.rating} onChange={(n) => onChange({ rating: n })} testID={`${id}-stars`} />
      <FormInput label={t('sanCatalog.fb.comment')} value={it.comment} onChangeText={(v) => onChange({ comment: v })} maxLength={500} testID={`${id}-comment`} />
      <Button label={t('sanatorium.remove')} size="sm" variant="dangerGhost" onPress={onRemove} testID={`${id}-remove`} />
    </View>
  );
}

/** Registrar enters a paper form: stay, ratings and optional doctor / service ratings. */
export function PaperFeedbackSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet visible={open} onClose={onClose} title={t('sanCatalog.fb.addPaper')} scroll>
      {open && <PaperForm onClose={onClose} />}
    </Sheet>
  );
}

function PaperForm({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const save = useCreateFeedback();
  const doctors = useQuery(staffRoleQuery('doctor'));
  const [d, setD] = useState<FeedbackDraft>(emptyFeedbackDraft);
  const [stayLabel, setStayLabel] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<FeedbackDraft>) => setD((x) => ({ ...x, ...p }));
  const setItem = (i: number, p: Partial<FeedbackItemDraft>) => setD((x) => ({ ...x, items: x.items.map((it, k) => (k === i ? { ...it, ...p } : it)) }));
  const flight = useSingleFlight();
  const submit = () => flight.run(async () => {
    const r = feedbackBody(d);
    if (!r.ok) return setError(t(r.error));
    try {
      await save.mutateAsync(r.body);
      toast.success(t('sanatorium.saved'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  });
  if (picking) {
    return <StayPicker onBack={() => setPicking(false)} onPick={(s) => { set({ stayId: s.id }); setStayLabel(s.label); setPicking(false); setError(null); }} />;
  }
  const doctorOptions = (doctors.data ?? []).map((x) => ({ value: x.id, label: x.full_name }));
  return (
    <View testID="fb-paper-form">
      <Text variant="caption" tone="muted">{t('sanCatalog.fb.paperHint')}</Text>
      <SelectField label={t('sanCatalog.fb.stay')} value={stayLabel ?? undefined} placeholder={t('sanCatalog.fb.pickStayPlaceholder')} onPress={() => setPicking(true)} testID="fb-stay" />
      <FieldLabel>{`${t('sanCatalog.fb.overall')} *`}</FieldLabel>
      <StarInput label={t('sanCatalog.fb.overall')} value={d.overall} onChange={(n) => set({ overall: n })} testID="fb-overall" />
      <FieldLabel>{t('sanCatalog.fb.room')}</FieldLabel>
      <StarInput label={t('sanCatalog.fb.room')} value={d.room} onChange={(n) => set({ room: n })} clearable testID="fb-room" />
      <FieldLabel>{t('sanCatalog.fb.food')}</FieldLabel>
      <StarInput label={t('sanCatalog.fb.food')} value={d.food} onChange={(n) => set({ food: n })} clearable testID="fb-food" />
      <FieldLabel>{t('sanCatalog.fb.staff')}</FieldLabel>
      <StarInput label={t('sanCatalog.fb.staff')} value={d.staff} onChange={(n) => set({ staff: n })} clearable testID="fb-staff" />
      <FormInput label={t('sanCatalog.fb.comment')} value={d.comment} onChangeText={(v) => set({ comment: v })} multiline maxLength={2000} testID="fb-comment" />
      <FieldLabel>{t('sanCatalog.fb.items')}</FieldLabel>
      {d.items.map((it, i) => (
        <ItemEditor key={i} it={it} index={i} doctors={doctorOptions} onChange={(p) => setItem(i, p)} onRemove={() => setD((x) => ({ ...x, items: x.items.filter((_, k) => k !== i) }))} />
      ))}
      {d.items.length < 30 && <Button label={t('sanCatalog.fb.addItem')} icon="plus" size="sm" variant="soft" onPress={() => setD((x) => ({ ...x, items: [...x.items, emptyFeedbackItem()] }))} testID="fb-add-item" />}
      <ErrorLine message={error} testID="fb-error" />
      <Button testID="fb-save" label={t('common.save')} full loading={save.isPending} onPress={() => void submit()} />
    </View>
  );
}

/** Filters of the answers list: search, rating range, doctor and source. */
export function FeedbackFilters({ value, onChange }: { value: FeedbackFilterDraft; onChange: (p: Partial<FeedbackFilterDraft>) => void }) {
  const { t } = useTranslation();
  const doctors = useQuery(staffRoleQuery('doctor'));
  const stars = [1, 2, 3, 4, 5].map((n) => ({ value: n, label: `${n} ★` }));
  return (
    <View testID="fb-filters">
      <SearchField testID="fb-search" value={value.q} onChangeText={(v) => onChange({ q: v })} placeholder={t('sanCatalog.fb.search')} />
      <View style={styles.pair}>
        <View style={styles.half}><ChoiceField label={t('sanCatalog.fb.minOverall')} value={value.min} noneLabel={t('sanCatalog.fb.any')} options={stars} onChange={(v) => onChange({ min: v })} testID="fb-min" /></View>
        <View style={styles.half}><ChoiceField label={t('sanCatalog.fb.maxOverall')} value={value.max} noneLabel={t('sanCatalog.fb.any')} options={stars} onChange={(v) => onChange({ max: v })} testID="fb-max" /></View>
      </View>
      <ChoiceField label={t('sanCatalog.fb.doctor')} value={value.doctor} noneLabel={t('sanCatalog.fb.anyDoctor')} options={(doctors.data ?? []).map((x) => ({ value: x.id, label: x.full_name }))} onChange={(v) => onChange({ doctor: v })} loading={doctors.isPending} testID="fb-doctor" />
      <ChoiceField label={t('sanCatalog.fb.source')} value={value.source} noneLabel={t('sanCatalog.fb.anySource')} options={FEEDBACK_SOURCES.map((s) => ({ value: s as string, label: t(`sanCatalog.fb.source_${s}`) }))} onChange={(v) => onChange({ source: v })} testID="fb-source" />
    </View>
  );
}

/** Small badge naming where an answer came from. */
export function SourceBadge({ source }: { source: string }) {
  const { t } = useTranslation();
  return <Badge label={t(`sanCatalog.fb.source_${source}`, { defaultValue: source })} tone={source === 'registrar' ? 'info' : 'neutral'} testID={`fb-source-${source}`} />;
}

const styles = StyleSheet.create({
  stars: { flexDirection: 'row', gap: 4, marginBottom: 6 },
  star: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  item: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 10, marginBottom: 8, gap: 4 },
  pair: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
});
