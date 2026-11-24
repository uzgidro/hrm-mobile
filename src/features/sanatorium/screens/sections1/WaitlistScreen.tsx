// Waitlist (registrar): guests waiting for a free room. Status tabs with counts, search, a date
// range, paging; create, edit, convert into a normal request, cancel.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { Badge, Button, Card, EmptyState, ListRow, PageHeader, Screen, SearchField, Segmented, Sheet, Text } from '@/ui';
import { roomsQuery } from '../../api/queries';
import { useCancelWaitlist, useConvertWaitlist, useCreateWaitlist, usePatchWaitlist, waitlistInfinite } from '../../api/sections1';
import { PagedBlock, PhoneLink, useSanReadOnly } from '../../components/common';
import { ChoiceField, DateField, ErrorLine, opt } from '../../components/forms';
import { SectionGate } from '../../components/sections1/shared';
import { WAITLIST_STATUSES, type WaitlistItem, type WaitlistStatus } from '../../types1';
import { addDays, fmtDate, maskPassport, parseDmy, sanErrorMessage } from '../../utils/sanatorium';

type Tab = 'all' | WaitlistStatus;
const tone = (s: WaitlistStatus) => ({ waiting: 'warning', offered: 'info', converted: 'success', cancelled: 'neutral' } as const)[s];
const isOpen = (w: WaitlistItem) => w.status === 'waiting' || w.status === 'offered';

export default function WaitlistScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('all');
  const [term, setTerm] = useState('');
  const q = useDebouncedValue(term);
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [edit, setEdit] = useState<WaitlistItem | 'new' | null>(null);
  const readOnly = useSanReadOnly();
  const query = useInfiniteQuery(waitlistInfinite({ status: tab, q, from, to }));
  const counts = query.data?.pages[0]?.counts ?? {};
  const total = (Object.values(counts) as number[]).reduce((a, b) => a + b, 0);
  return (
    <SectionGate feature="waitlist" roles={['registrar']}>
      <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()} testID="sanatorium-waitlist-screen">
        <PageHeader title={t('san1.waitlist.title')} right={readOnly ? undefined : <Button testID="wl-add" label={t('sanatorium.add')} icon="plus" size="sm" onPress={() => setEdit('new')} />} />
        <Segmented
          testID="wl-tabs"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'all' as Tab, label: t('common.all'), count: total || undefined },
            ...WAITLIST_STATUSES.map((s) => ({ value: s as Tab, label: t(`san1.waitlist.status.${s}`), count: counts[s] || undefined })),
          ]}
        />
        <View style={styles.filters}>
          <SearchField testID="wl-search" value={term} onChangeText={setTerm} placeholder={t('san1.waitlist.search')} />
          <View style={styles.pair}>
            <View style={styles.flex}><DateField label={t('san1.waitlist.from')} value={from} onChange={setFrom} testID="wl-from" /></View>
            <View style={styles.flex}><DateField label={t('san1.waitlist.to')} value={to} onChange={setTo} testID="wl-to" /></View>
          </View>
          {(from || to) && <Button label={t('san1.waitlist.clearDates')} variant="link" size="sm" onPress={() => { setFrom(null); setTo(null); }} />}
        </View>
        <PagedBlock query={query}>
          {(items) =>
            items.length === 0 ? (
              <EmptyState title={t('san1.waitlist.empty')} />
            ) : (
              <View style={styles.stack}>
                {items.map((w) => (
                  <ListRow
                    key={w.id}
                    pressable={!readOnly}
                    testID={`wl-${w.id}`}
                    title={w.full_name}
                    subtitle={[`${fmtDate(w.period_from)} → ${fmtDate(w.period_to)}`, `${w.party_size} ${t('san1.waitlist.people')}`, w.room_type].filter(Boolean).join(' · ')}
                    right={<Badge label={t(`san1.waitlist.status.${w.status}`)} tone={tone(w.status)} />}
                    chevron={!readOnly}
                    onPress={readOnly ? undefined : () => setEdit(w)}
                  />
                ))}
              </View>
            )
          }
        </PagedBlock>
        <Sheet visible={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? t('san1.waitlist.add') : t('san1.waitlist.entry')} scroll>
          {edit && <EntryForm key={edit === 'new' ? 'new' : edit.id} item={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
        </Sheet>
      </Screen>
    </SectionGate>
  );
}

function EntryForm({ item, onClose }: { item: WaitlistItem | null; onClose: () => void }) {
  const { t } = useTranslation();
  const create = useCreateWaitlist();
  const patch = usePatchWaitlist();
  const cancel = useCancelWaitlist();
  const [name, setName] = useState(item?.full_name ?? '');
  const [phone, setPhone] = useState(item?.phone ?? '');
  const [pFrom, setPFrom] = useState<string | null>(item?.period_from ?? null);
  const [pTo, setPTo] = useState<string | null>(item?.period_to ?? null);
  const [size, setSize] = useState(String(item?.party_size ?? 1));
  const [roomType, setRoomType] = useState(item?.room_type ?? '');
  const [passport, setPassport] = useState('');
  const [birth, setBirth] = useState('');
  const [org, setOrg] = useState(item?.organization_name ?? '');
  const [lang, setLang] = useState<'uz' | 'ru' | 'en'>(item?.lang ?? 'uz');
  const [note, setNote] = useState(item?.note ?? '');
  const [reason, setReason] = useState('');
  const [convert, setConvert] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const readOnly = !!item && !isOpen(item);

  const submit = async () => {
    const n = Number.parseInt(size, 10);
    if (name.trim().length < 5) return setError(t('san1.waitlist.nameShort'));
    if (!phone.trim()) return setError(t('sanatorium.phoneRequired'));
    if (!pFrom || !pTo || pTo <= pFrom) return setError(t('san1.waitlist.periodInvalid'));
    if (!Number.isFinite(n) || n < 1 || n > 20) return setError(t('san1.waitlist.sizeRange'));
    const birthIso = birth.trim() ? parseDmy(birth) : null;
    if (birth.trim() && !birthIso) return setError(t('san1.waitlist.birthInvalid'));
    try {
      if (item) {
        await patch.mutateAsync({
          id: item.id,
          body: { full_name: name.trim(), phone: phone.trim(), period_from: pFrom, period_to: pTo, party_size: n, room_type: opt(roomType) ?? null, note: opt(note) ?? null },
        });
      } else {
        await create.mutateAsync({
          full_name: name.trim(),
          phone: phone.trim(),
          period_from: pFrom,
          period_to: pTo,
          party_size: n,
          lang,
          ...(opt(roomType) ? { room_type: opt(roomType) } : {}),
          ...(opt(passport) ? { passport: passport.trim().toUpperCase() } : {}),
          ...(birthIso ? { birth_date: birthIso } : {}),
          ...(opt(org) ? { organization_name: opt(org) } : {}),
          ...(opt(note) ? { note: opt(note) } : {}),
        });
      }
      toast.success(t('sanatorium.saved'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };

  const doCancel = async () => {
    if (!item) return;
    try {
      await cancel.mutateAsync({ id: item.id, reason: opt(reason) });
      toast.success(t('san1.waitlist.cancelled'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <View style={styles.form} testID="waitlist-sheet">
      {item && (
        <View style={styles.pair}>
          <Badge label={t(`san1.waitlist.status.${item.status}`)} tone={tone(item.status)} />
          {item.telegram && <Badge label="Telegram" tone="info" />}
          {item.offer_count > 0 && <Badge label={`${t('san1.waitlist.offers')}: ${item.offer_count}`} tone="neutral" />}
          <PhoneLink phone={item.phone} />
        </View>
      )}
      {item?.passport && <Text variant="caption" tone="muted">{maskPassport(item.passport)}</Text>}
      <FormInput label={t('san1.waitlist.fullName')} value={name} onChangeText={setName} required testID="wl-name" />
      <FormInput label={t('sanatorium.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" required testID="wl-phone" />
      <DateField label={t('san1.waitlist.from')} value={pFrom} onChange={(v) => { setPFrom(v); if (!pTo || pTo <= v) setPTo(addDays(v, 1)); }} testID="wl-pfrom" />
      <DateField label={t('san1.waitlist.to')} value={pTo} onChange={setPTo} testID="wl-pto" />
      <FormInput label={t('san1.waitlist.partySize')} value={size} onChangeText={setSize} keyboardType="number-pad" testID="wl-size" />
      <FormInput label={t('san1.waitlist.roomType')} value={roomType} onChangeText={setRoomType} testID="wl-roomtype" />
      {!item && (
        <>
          <FormInput label={t('san1.waitlist.passport')} value={passport} onChangeText={setPassport} testID="wl-passport" />
          <FormInput label={t('san1.waitlist.birth')} value={birth} onChangeText={setBirth} placeholder="14.03.1985" testID="wl-birth" />
          <FormInput label={t('san1.waitlist.organization')} value={org} onChangeText={setOrg} />
          <ChoiceField
            label={t('san1.waitlist.lang')}
            value={lang}
            options={(['uz', 'ru', 'en'] as const).map((l) => ({ value: l as 'uz' | 'ru' | 'en', label: t(`san1.waitlist.langName.${l}`) }))}
            onChange={(v) => v && setLang(v)}
          />
        </>
      )}
      <FormInput label={t('sanatorium.notes')} value={note} onChangeText={setNote} multiline testID="wl-note" />
      <ErrorLine message={error} testID="wl-error" />
      {!readOnly && <Button testID="wl-save" label={t('common.save')} full loading={create.isPending || patch.isPending} onPress={() => void submit()} />}
      {item && isOpen(item) && (
        <>
          <Button testID="wl-convert" label={t('san1.waitlist.convert')} variant="soft" full icon="check" onPress={() => setConvert(true)} />
          <FormInput label={t('san1.waitlist.cancelReason')} value={reason} onChangeText={setReason} testID="wl-reason" />
          <Button testID="wl-cancel" label={t('san1.waitlist.cancelEntry')} variant="dangerGhost" full loading={cancel.isPending} onPress={() => void doCancel()} />
        </>
      )}
      {item && <ConvertSheet item={convert ? item : null} onClose={() => setConvert(false)} onDone={onClose} />}
    </View>
  );
}

function ConvertSheet({ item, onClose, onDone }: { item: WaitlistItem | null; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const conv = useConvertWaitlist();
  const rooms = useQuery(roomsQuery(!!item));
  const [roomId, setRoomId] = useState<number | null>(null);
  const [passport, setPassport] = useState('');
  const [birth, setBirth] = useState('');
  const [org, setOrg] = useState(item?.organization_name ?? '');
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    if (!item) return;
    const birthIso = birth.trim() ? parseDmy(birth) : null;
    if (birth.trim() && !birthIso) return setError(t('san1.waitlist.birthInvalid'));
    try {
      await conv.mutateAsync({
        id: item.id,
        body: {
          ...(roomId != null ? { preferred_room_id: roomId } : {}),
          ...(opt(passport) ? { passport: passport.trim().toUpperCase() } : {}),
          ...(birthIso ? { birth_date: birthIso } : {}),
          ...(opt(org) ? { organization_name: opt(org) } : {}),
        },
      });
      toast.success(t('san1.waitlist.converted'));
      onClose();
      onDone();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <Sheet visible={!!item} onClose={onClose} title={t('san1.waitlist.convert')} scroll>
      <View style={styles.form} testID="convert-sheet">
        <Card><Text variant="caption" tone="muted">{t('san1.waitlist.convertHint')}</Text></Card>
        <ChoiceField
          label={t('san1.waitlist.preferredRoom')}
          value={roomId}
          noneLabel={t('sanatorium.noPreference')}
          options={(rooms.data ?? []).filter((r) => r.is_active).map((r) => ({ value: r.id, label: `${t('sanatorium.room')} ${r.number}`, sub: r.room_type ?? undefined }))}
          onChange={setRoomId}
          loading={rooms.isPending}
          testID="conv-room"
        />
        <FormInput label={t('san1.waitlist.passport')} value={passport} onChangeText={setPassport} testID="conv-passport" />
        <FormInput label={t('san1.waitlist.birth')} value={birth} onChangeText={setBirth} placeholder="14.03.1985" testID="conv-birth" />
        <FormInput label={t('san1.waitlist.organization')} value={org} onChangeText={setOrg} />
        <ErrorLine message={error} testID="conv-error" />
        <Button testID="conv-save" label={t('san1.waitlist.convert')} full loading={conv.isPending} onPress={() => void submit()} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 8, marginTop: 8 },
  filters: { gap: 6, marginTop: 10 },
  pair: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  flex: { flex: 1 },
  form: { gap: 6, paddingBottom: 8 },
});
