// «Kim keldi?»: the people, the family shortcuts, the guest type (and the contract of a contract guest).
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { Badge, Button, Card, Chip, Text } from '@/ui';
import { orgsQuery } from '../../api/sections2';
import { ChoiceField } from '../../components/forms';
import { PhoneField } from '../../components/sections1/shared';
import { GUEST_TYPES, RELATIONS, type GuestType } from '../../types';
import { useSanFeatures } from '../../utils/features';
import { clip, LIMITS, maskPassportInput } from '../../utils/guests';
import { BirthField } from '../../components/BirthField';
import { fmtDate } from '../../utils/sanatorium';
import { familyGuestsQuery, guestMatchesQuery } from '../api';
import { ChoiceCard, MoreBlock, Note } from '../components/parts';
import { ageOf, isChild, memberErrors, memberFromGuest, newMember, relationOf, relationValue, type WizMember, type WizState } from './state';

const TYPE_ICON = { treatment: 'target', rest: 'sun', hotel: 'building', contract: 'doc' } as const;
/** Most common first. */
const TYPE_ORDER: GuestType[] = ['treatment', 'rest', 'hotel', 'contract'];

export type StepSet = (p: Partial<WizState>) => void;

export function StepWho({ s, set, limit, percent, showErrors, party }: { s: WizState; set: StepSet; limit: number; percent: number; showErrors: boolean; party?: number | null }) {
  const { t } = useTranslation();
  const features = useSanFeatures();
  const orgs = useQuery(orgsQuery('', false, features.on('documents') && s.guestType === 'contract'));
  const patch = (key: string, p: Partial<WizMember>) => set({ members: s.members.map((m) => (m.key === key ? { ...m, ...p } : m)) });
  const replace = (key: string, next: WizMember) => set({ members: s.members.map((m) => (m.key === key ? next : m)) });
  const fixed = s.source === 'stay';
  const missing = s.source === 'request' && party ? party - s.members.length : 0;
  return (
    <View style={styles.stack}>
      {missing > 0 && <Note tone="info" testID="party-hint">{t('sanFlow.who.partyHint', { n: party!, left: missing })}</Note>}
      {s.members.map((m, i) => (
        <PersonCard
          key={m.key} m={m} i={i} s={s} limit={limit} percent={percent} showErrors={showErrors} fixed={fixed}
          canRemove={s.members.length > 1 && !(s.source === 'request' && i === 0)}
          onPatch={(p) => patch(m.key, p)} onReplace={(next) => replace(m.key, next)} onRemove={() => set({ members: s.members.filter((x) => x.key !== m.key) })}
        />
      ))}
      {!fixed && (
        <>
          <FamilyChips s={s} onAdd={(m) => set({ members: [...s.members.filter((x) => x.locked || x.full_name.trim()), m] })} />
          <Button testID="wiz-add-person" label={t('sanFlow.who.addPerson')} variant="soft" icon="plus" onPress={() => set({ members: [...s.members, newMember()] })} />
          <Text variant="caption" tone="muted">{t('sanFlow.who.addPersonHint')}</Text>
        </>
      )}
      <Text variant="heading">{t('sanFlow.who.typeTitle')}</Text>
      <View style={styles.stack} accessibilityRole="radiogroup">
        {TYPE_ORDER.filter((g) => GUEST_TYPES.includes(g)).map((g) => (
          <ChoiceCard
            key={g} on={s.guestType === g} testID={`wiz-type-${g}`} icon={TYPE_ICON[g]} title={t(`sanatorium.guestType.${g}`)} hint={t(`sanFlow.who.type_${g}`)}
            onPress={() => set({ guestType: g, wantDoctor: undefined, ...(s.source === 'walkin' ? { packageId: '' } : {}) })}
          />
        ))}
      </View>
      {s.guestType === 'contract' && (
        <>
          <FormInput label={t('sanFlow.review.contractNote')} value={s.contractNote} maxLength={255} onChangeText={(v) => set({ contractNote: v })} testID="wiz-contract" />
          {features.on('documents') && (
            <ChoiceField
              label={t('sanFlow.review.organization')} value={s.organizationId || null} noneLabel={t('sanFlow.review.noOrganization')}
              options={(orgs.data ?? []).map((o) => ({ value: String(o.id), label: o.name }))} onChange={(v) => set({ organizationId: v ?? '' })} testID="wiz-organization"
            />
          )}
        </>
      )}
    </View>
  );
}

/** Relatives of an already picked guest: one press instead of typing them again. */
function FamilyChips({ s, onAdd }: { s: WizState; onAdd: (m: WizMember) => void }) {
  const { t } = useTranslation();
  const familyId = s.members.find((m) => m.family_id)?.family_id ?? 0;
  const q = useQuery(familyGuestsQuery(familyId));
  const have = new Set(s.members.map((m) => m.guest_id));
  const rest = (q.data ?? []).filter((g) => !have.has(g.id) && g.active_stay?.status !== 'checked_in');
  if (!familyId || rest.length === 0) return null;
  return (
    <View testID="family-chips" style={styles.stack}>
      <Text variant="label" tone="muted">{t('sanFlow.who.family')}</Text>
      <View style={styles.wrap}>
        {rest.map((g) => <Chip key={g.id} label={`+ ${g.full_name}`} onPress={() => onAdd(memberFromGuest(g, { relation: relationValue(g.family_relation ?? g.relation) }))} testID={`family-${g.id}`} />)}
      </View>
    </View>
  );
}

function PersonCard({
  m, i, s, limit, percent, showErrors, fixed, canRemove, onPatch, onReplace, onRemove,
}: {
  m: WizMember; i: number; s: WizState; limit: number; percent: number; showErrors: boolean; fixed: boolean; canRemove: boolean;
  onPatch: (p: Partial<WizMember>) => void; onReplace: (m: WizMember) => void; onRemove: () => void;
}) {
  const { t } = useTranslation();
  const age = ageOf(m, s.start);
  const child = isChild(m, s.start, limit);
  const all = memberErrors(m);
  const err = (k: keyof typeof all) => (showErrors && all[k] ? t(`sanFlow.who.${all[k]}`) : undefined);
  const requester = s.source === 'request' && i === 0;
  const title = s.members.length === 1 ? t('sanFlow.who.guest') : i === 0 ? t('sanFlow.who.mainGuest') : t('sanFlow.who.guestN', { n: i + 1 });
  return (
    <Card testID={`person-${i}`}>
      <View style={styles.head}>
        <Text variant="heading" style={styles.flex}>{title}</Text>
        {child && <Badge label={t('sanFlow.who.childOff', { p: percent })} tone="success" testID={`person-child-${i}`} />}
      </View>
      {m.locked ? (
        <View>
          <Text variant="body" weight="700">{m.full_name}</Text>
          <Text variant="caption" tone="muted">
            {[m.birth_date ? fmtDate(m.birth_date) : null, age !== null ? t('sanFlow.who.ageYears', { n: age }) : null, m.phone, m.passport, m.organization_name, m.room_number ? t('sanFlow.common.roomN', { n: m.room_number }) : null].filter(Boolean).join(' · ')}
          </Text>
          {!fixed && (requester
            ? <Button label={t('sanFlow.who.fix')} variant="link" size="sm" testID="fix-requester" onPress={() => onPatch({ locked: false })} />
            : <Button label={t('sanFlow.who.otherPerson')} variant="link" size="sm" testID={`other-person-${i}`} onPress={() => onReplace(newMember())} />)}
        </View>
      ) : (
        <>
          <FormInput label={t('sanatorium.fullName')} required value={m.full_name} maxLength={LIMITS.name} error={err('full_name')} onChangeText={(v) => onPatch({ full_name: v })} testID={`person-name-${i}`} />
          {i === 0 && !m.full_name && <Text variant="caption" tone="muted" style={styles.hint}>{t('sanFlow.who.nameHint')}</Text>}
          {!requester && <Matches q={m.full_name} exclude={s.members.map((x) => x.guest_id ?? 0)} onPick={onReplace} />}
          <BirthField required value={m.birth_date} onChange={(v) => onPatch({ birth_date: v })} error={err('birth_date')} testID={`person-birth-${i}`} />
          <PhoneField label={t('sanatorium.phone')} value={m.phone} onChange={(v) => onPatch({ phone: v })} testID={`person-phone-${i}`} />
          {!!err('phone') && <Text variant="caption" tone="danger" style={styles.hint} testID={`person-phone-error-${i}`}>{err('phone')}</Text>}
          <FormInput label={t('sanatorium.passport')} value={m.passport} placeholder="AA1234567" maxLength={9} error={err('passport')} onChangeText={(v) => onPatch({ passport: maskPassportInput(v) })} testID={`person-passport-${i}`} />
          {child && <Text variant="caption" tone="muted" style={styles.hint}>{t('sanFlow.who.passportChild')}</Text>}
          <MoreBlock title={t('sanFlow.common.more')} testID={`person-more-${i}`}>
            <ChoiceField
              label={t('sanFlow.who.gender')} value={m.gender || null} noneLabel="—" testID={`person-gender-${i}`}
              options={[{ value: 'm' as const, label: t('sanFlow.who.male') }, { value: 'f' as const, label: t('sanFlow.who.female') }]} onChange={(v) => onPatch({ gender: v ?? '' })}
            />
            <FormInput label={t('sanFlow.who.organization')} value={m.organization_name} maxLength={255} onChangeText={(v) => onPatch({ organization_name: clip(v, 255) })} testID={`person-org-${i}`} />
          </MoreBlock>
        </>
      )}
      {s.members.length > 1 && !fixed && (
        <ChoiceField
          label={t('sanFlow.who.relation')} value={relationOf(m, i, s.members, s.start, limit)} testID={`person-relation-${i}`}
          options={RELATIONS.map((r) => ({ value: r, label: t(`sanatorium.relation.${r}`) }))} onChange={(v) => v && onPatch({ relation: v })}
        />
      )}
      {canRemove && !fixed && <Button label={t('sanFlow.who.remove')} variant="dangerGhost" size="sm" testID={`person-remove-${i}`} onPress={onRemove} />}
    </Card>
  );
}

/** «Has this person stayed before?» — looked up while the name is typed, so nobody is registered twice. */
function Matches({ q, exclude, onPick }: { q: string; exclude: number[]; onPick: (m: WizMember) => void }) {
  const { t } = useTranslation();
  const text = useDebouncedValue(q, 350);
  const res = useQuery(guestMatchesQuery(text));
  const rows = text.trim().length >= 3 && q.trim().length >= 3 ? (res.data ?? []).filter((g) => !exclude.includes(g.id)).slice(0, 4) : [];
  if (!rows.length) return null;
  return (
    <View testID="guest-matches" style={styles.stack}>
      <Text variant="label" tone="muted">{t('sanFlow.who.matches')}</Text>
      {rows.map((g) => {
        const st = g.active_stay;
        return (
          <View key={g.id} style={styles.match} testID={`match-${g.id}`}>
            <View style={styles.flex}>
              <Text variant="body" weight="600">{g.full_name}</Text>
              <Text variant="caption" tone="muted">{[g.birth_date ? fmtDate(g.birth_date) : null, g.phone].filter(Boolean).join(' · ')}</Text>
              {!!st && <Text variant="caption" tone="danger">{t(st.status === 'checked_in' ? 'sanFlow.who.alreadyIn' : 'sanFlow.who.alreadyBooked', { from: fmtDate(st.planned_from), to: fmtDate(st.planned_to) })}</Text>}
            </View>
            {st ? (
              <Button
                label={t('sanFlow.who.openStay')} size="sm" variant="soft" testID={`match-open-${g.id}`}
                onPress={() => (st.status === 'booked' ? router.replace({ pathname: '/sanatorium-arrive', params: { stay: String(st.id) } }) : router.push({ pathname: '/sanatorium-stay', params: { id: String(st.id) } }))}
              />
            ) : (
              <Button label={t('sanFlow.who.thatsHim')} size="sm" testID={`match-pick-${g.id}`} onPress={() => onPick(memberFromGuest(g))} />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  hint: { marginTop: -10, marginBottom: 8 },
  match: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
