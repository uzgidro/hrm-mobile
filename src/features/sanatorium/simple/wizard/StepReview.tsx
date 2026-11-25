// «Hammasi to'g'rimi?»: everything on one page with a way back to each step, the sum and the payment.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { Button, Card, Text } from '@/ui';
import { stayQuery } from '../../api/queries';
import { orgsQuery } from '../../api/sections2';
import { ChoiceField } from '../../components/forms';
import { useSanFeatures } from '../../utils/features';
import { pickLang } from '../../utils/sections1';
import { fmtDate, fmtMoney } from '../../utils/sanatorium';
import { estimateQuery } from '../api';
import { MoneyInput, MoreBlock, Note, useRoomText, useWhen } from '../components/parts';
import type { ArrivalOptions, OptionPackage } from '../types';
import { estimateBody, nightsOf, plusDays, type Derived, type StepKey, type WizState } from './state';
import { dietLabel } from './StepMeals';
import type { StepSet } from './StepWho';

function Row({ title, lines, onEdit, testID }: { title: string; lines: (string | null | undefined | false)[]; onEdit?: () => void; testID?: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.flex}>
        <Text variant="caption" tone="muted">{title}</Text>
        {lines.filter(Boolean).map((x, i) => <Text key={i} variant={i === 0 ? 'body' : 'label'} tone={i === 0 ? undefined : 'muted'}>{x as string}</Text>)}
      </View>
      {!!onEdit && <Button label={t('sanFlow.review.change')} size="sm" variant="link" onPress={onEdit} testID={testID ? `${testID}-edit` : undefined} />}
    </View>
  );
}

/** What a booked party still owes. Unknown once the dates or the room are changed: the server reprices the stay. */
function useBookedDebt(s: WizState, d: Derived): { owed: string | null; changed: boolean } {
  const ids = s.members.map((m) => m.stay_id).filter((x): x is number => !!x);
  const stays = useQueries({ queries: ids.map((id) => stayQuery(id, s.source === 'stay')) });
  const b = s.base;
  if (!b) return { owed: null, changed: false };
  const changed = s.start !== b.start || s.end !== b.end || s.guestType !== b.guestType || s.packageId !== b.packageId || (d.roomId !== b.roomId && !d.keepsRooms);
  if (changed || !stays.length || stays.some((q) => !q.data)) return { owed: null, changed };
  return { changed, owed: String(stays.reduce((sum, q) => sum + Math.max(0, Number(q.data!.debt ?? 0)), 0)) };
}

const packageName = (p: OptionPackage, lang: string) => (p.name_uz ? pickLang(lang, { uz: p.name_uz, ru: p.name_ru, en: p.name_en }) : p.name ?? String(p.id));

export function StepReview({ s, set, o, d, limit, go, mealsStep }: { s: WizState; set: StepSet; o?: ArrivalOptions; d: Derived; limit: number; go: (k: StepKey) => void; mealsStep: boolean }) {
  const { t, i18n } = useTranslation();
  const features = useSanFeatures();
  const when = useWhen();
  const roomText = useRoomText();
  const orgs = useQuery(orgsQuery('', false, features.on('documents') && s.guestType !== 'contract'));
  const { owed, changed } = useBookedDebt(s, d);
  const estimate = useQuery(estimateQuery(estimateBody(s, d, limit), (s.source !== 'stay' || changed) && (!!d.roomId || !!s.packageId) && s.end > s.start));
  const total = owed ?? estimate.data?.total ?? null;
  const room = o?.rooms.find((r) => r.id === d.roomId);
  const nights = nightsOf(s.start, s.end);
  const diet = o?.diets.find((x) => String(x.id) === d.dietId);
  const visits = s.members.filter((m) => d.exams[m.key]);
  const allergic = s.members.filter((m) => s.allergies[m.key]?.trim());
  const packages = o?.packages ?? [];
  const many = s.members.length > 1;
  const whole = total ? Math.round(Number(total)) : 0;
  return (
    <View style={styles.stack}>
      <Card testID="wiz-review">
        <Row testID="rev-who" title={t('sanFlow.steps.who')} lines={[s.members.map((m) => m.full_name).join(', '), t(`sanatorium.guestType.${s.guestType}`)]} onEdit={() => go('who')} />
        <Row
          testID="rev-room" title={t('sanFlow.steps.room')} onEdit={() => go('room')}
          lines={[
            ...(d.keepsRooms && !room ? s.members.map((m) => `${m.full_name} — ${t('sanFlow.common.roomN', { n: m.room_number ?? '—' })}`) : [room ? roomText(room) : t('sanFlow.review.noRoom')]),
            `${fmtDate(s.start)} — ${fmtDate(s.end)} · ${t('sanFlow.common.nightsN', { n: nights })}`,
          ]}
        />
        <Row
          testID="rev-doctor" title={t('sanFlow.steps.doctor')} onEdit={() => go('doctor')}
          lines={[
            d.doctor ? d.doctor.full_name : t('sanFlow.doctor.notNeeded'),
            !!d.doctor && (o?.has_exam ? t('sanFlow.doctor.already') : visits.length === 0 ? t('sanFlow.review.noTime') : visits.map((m) => (many ? `${m.full_name}: ${when(d.exams[m.key]!)}` : when(d.exams[m.key]!))).join(' · ')),
          ]}
        />
        <Row
          testID="rev-meals" title={t('sanFlow.steps.meals')} onEdit={mealsStep ? () => go('meals') : undefined}
          lines={[t(s.withMeals ? 'sanFlow.meals.yes' : 'sanFlow.meals.no'), s.withMeals && [diet ? dietLabel(diet, i18n.language) : features.on('diet') ? t('sanFlow.meals.plain') : null, s.dietNote].filter(Boolean).join(' · ')]}
        />
        {allergic.length > 0 && (
          <Text variant="label" tone="danger" testID="rev-allergy">
            {t('sanFlow.meals.allergyShort')}: {allergic.map((m) => (many ? `${m.full_name} — ${s.allergies[m.key]}` : s.allergies[m.key])).join('; ')}
          </Text>
        )}
      </Card>
      {s.members.every((m) => !m.phone) && <Note tone="warning" testID="no-phone">{t('sanFlow.review.noPhone')}</Note>}
      <Card testID="rev-pay" title={t('sanFlow.review.payTitle')} icon="wallet" tint="green">
        {!!total && <Text variant="heading" testID="rev-total">{t(owed !== null ? (Number(owed) > 0 ? 'sanFlow.review.owed' : 'sanFlow.review.noDebt') : 'sanFlow.review.total', { sum: fmtMoney(total) })}</Text>}
        <MoneyInput label={t('sanFlow.review.payNow')} value={s.payment} onChange={(v) => set({ payment: v })} testID="wiz-payment" />
        <Text variant="caption" tone="muted">{t('sanFlow.review.payHint')}</Text>
        {whole > 0 && Number(s.payment || 0) !== whole && <Button label={t('sanFlow.review.payAll')} size="sm" variant="soft" onPress={() => set({ payment: String(whole) })} testID="wiz-pay-all" />}
      </Card>
      <MoreBlock title={t('sanFlow.common.more')} testID="rev-more">
        {features.on('packages') && packages.length > 0 && (
          <ChoiceField
            label={t('sanFlow.review.package')} value={s.packageId || null} noneLabel={t('sanFlow.review.noPackage')} testID="wiz-package"
            options={packages.map((p) => ({ value: String(p.id), label: packageName(p, i18n.language), sub: [p.nights ? t('sanFlow.common.nightsN', { n: p.nights }) : null, p.price ? fmtMoney(p.price) : null].filter(Boolean).join(' · ') }))}
            onChange={(v) => {
              const p = packages.find((x) => String(x.id) === v);
              set({ packageId: v ?? '', ...(p?.nights && nights < p.nights ? { end: plusDays(s.start, p.nights) } : {}) });
            }}
          />
        )}
        {features.on('documents') && s.guestType !== 'contract' && (
          <ChoiceField
            label={t('sanFlow.review.organization')} value={s.organizationId || null} noneLabel={t('sanFlow.review.noOrganization')} testID="wiz-organization"
            options={(orgs.data ?? []).map((x) => ({ value: String(x.id), label: x.name }))} onChange={(v) => set({ organizationId: v ?? '' })}
          />
        )}
        <FormInput label={t('sanatorium.notes')} value={s.note} maxLength={2000} multiline onChangeText={(v) => set({ note: v })} testID="wiz-note" />
      </MoreBlock>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 1 },
  stack: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
});
