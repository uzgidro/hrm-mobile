// «Bugun»: the registrar's first screen. A big «Mehmon keldi» button, a search box, today's numbers, the setup
// banner and the work queue (Kechikkan / Bugun / Tez orada) with ONE main button per card.
import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Button, Card, EmptyState, IconButton, ListRow, PageHeader, ProgressBar, Screen, SearchField, SectionHeader, StatTile, Text } from '@/ui';
import { guestsQuery } from '../../api/queries';
import { useConfirmTransfer } from '../../api/sections1';
import { useConfirmOrder } from '../../api/sections2';
import { useSanReadOnly } from '../../components/common';
import { ConvertByIdSheet } from '../../components/sections1/ConvertSheet';
import type { GuestActiveStay } from '../../types';
import { fmtDate, fmtMoney, sanErrorMessage, stayTone } from '../../utils/sanatorium';
import { setupStatusQuery } from '../api';
import { HelpSheet } from '../components/HelpSheet';
import { useRoomText, useWhen } from '../components/parts';
import { QueueCard } from '../components/QueueCard';
import { StayActionSheet, type StayAction } from '../components/StayActions';
import type { QueueItem, QueueUrgency, TodayData } from '../types';
import { actionRoute, dedupeDebt, filterQueue, groupQueue, hasDebt, itemStayIds, partyOfItem, setupRequiredLeft } from '../utils';

export function TodayHome({ data, refreshing, onRefresh }: { data: TodayData; refreshing: boolean; onRefresh: () => void }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const when = useWhen();
  const roomText = useRoomText();
  const [search, setSearch] = useState('');
  const text = useDebouncedValue(search, 300);
  const [help, setHelp] = useState(false);
  const [action, setAction] = useState<StayAction | null>(null);
  const [convert, setConvert] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const readOnly = useSanReadOnly();
  const flying = useRef(false);
  const setup = useQuery(setupStatusQuery());
  const guests = useQuery(guestsQuery(text));
  const order = useConfirmOrder();
  const transfer = useConfirmTransfer();

  // A stay that already shows its debt on a departure / overstay card gets no second «debt» card.
  const all = data.items ?? [];
  const groups = groupQueue(filterQueue(dedupeDebt(all), search));
  const totals = data.totals ?? {};
  const left = setup.data ? setupRequiredLeft(setup.data.items) : 0;
  const showSetup = !!setup.data && setup.data.done < setup.data.total;
  const searching = text.trim().length >= 2;
  const fresh = text.trim() === search.trim();
  const hits = searching && fresh ? (guests.data ?? []).slice(0, 6) : [];
  const dot: Record<QueueUrgency, string> = { overdue: c.dangerMark, today: c.brand, soon: c.fgSubtle };

  const open = (item: QueueItem) => {
    const ids = itemStayIds(item);
    if (ids[0]) router.push({ pathname: '/sanatorium-stay', params: { id: String(ids[0]) } });
    else if (item.guest?.id) router.push({ pathname: '/sanatorium-guest', params: { id: String(item.guest.id) } });
    else if (item.request_id) router.push('/sanatorium-requests');
    else if (item.waitlist_id) router.push('/sanatorium-waitlist');
  };

  /** Confirm → one request → toast; a second tap while it runs is ignored. */
  const confirmRun = async (item: QueueItem, title: string, details: (string | null)[], done: string, fn: () => Promise<unknown>) => {
    if (flying.current) return;
    if (!(await confirm({ title, message: details.filter(Boolean).join(' · '), confirmLabel: t('sanSimple.action.confirm_service'), cancelLabel: t('common.cancel') }))) return;
    flying.current = true;
    setBusy(item.key);
    try {
      await fn();
      toast.success(done);
    } catch (e) {
      toast.error(sanErrorMessage(e, t('errors.generic')));
    } finally {
      flying.current = false;
      setBusy(null);
    }
  };

  const act = (item: QueueItem, a: string) => {
    const route = actionRoute(item, a);
    if (route) return router.push(route as never);
    const name = item.guest?.full_name ?? '';
    const at = item.at ? when(item.at) : null;
    if (a === 'confirm_service' && item.order_id) {
      return void confirmRun(item, t('sanFlow.queue.confirmService'), [name, String(item.title_params?.service ?? ''), at], t('sanFlow.queue.serviceDone'), () => order.mutateAsync(item.order_id!));
    }
    if (a === 'confirm_transfer' && item.transfer_id) {
      return void confirmRun(item, t('sanFlow.queue.confirmTransfer'), [name, at], t('sanFlow.queue.transferDone'), () => transfer.mutateAsync(item.transfer_id!));
    }
    if (a === 'convert' && item.waitlist_id) return setConvert(item.waitlist_id);
    const party = partyOfItem(item);
    if (!party.stayId) return open(item);
    if (a === 'extend') return setAction({ kind: 'extend', party, plannedTo: item.planned_to ?? '' });
    if (a === 'choose_room') return setAction({ kind: 'room', party });
    if (a === 'take_payment') return setAction({ kind: 'pay', party, debt: item.debt });
    if (a === 'assign_doctor') return setAction({ kind: 'doctor', party });
    if (a === 'no_show') return setAction({ kind: 'noshow', party, plannedFrom: item.planned_from });
    if (a === 'check_out') return setAction({ kind: 'out', party, debt: item.debt ?? '0' });
    // An action this version does not know: the guest's card has every possibility.
    open(item);
  };

  const openHit = (id: number, st?: GuestActiveStay | null) => {
    if (st) router.push({ pathname: '/sanatorium-stay', params: { id: String(st.id) } });
    else router.push({ pathname: '/sanatorium-guest', params: { id: String(id) } });
  };

  const tiles: { key: keyof typeof totals; icon: 'arrowDown' | 'users' | 'arrowUp' | 'building'; tint: 'drop' | 'green' | 'amber' | 'cyan' }[] = [
    { key: 'arriving', icon: 'arrowDown', tint: 'drop' },
    { key: 'in_house', icon: 'users', tint: 'green' },
    { key: 'leaving', icon: 'arrowUp', tint: 'amber' },
    { key: 'free_beds', icon: 'building', tint: 'cyan' },
  ];

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh} testID="sanatorium-screen">
      <PageHeader title={t('sanSimple.today.title')} subtitle={fmtDate(data.date)} right={<IconButton icon="help" tone="soft" accessibilityLabel={t('sanSimple.help.title')} onPress={() => setHelp(true)} testID="today-help" />} />
      <View style={styles.stack}>
        {!readOnly && (
          <>
            <Button testID="today-arrived" label={t('sanSimple.today.arrived')} icon="plus" size="lg" full onPress={() => router.push('/sanatorium-arrive')} />
            <Text variant="caption" tone="muted">{t('sanFlow.today.arrivedHint')}</Text>
          </>
        )}
        <SearchField value={search} onChangeText={setSearch} placeholder={t('sanFlow.today.search')} testID="today-search" />
        {searching && (
          <View testID="today-hits">
            {hits.map((g) => (
              <ListRow
                key={g.id} pressable chevron testID={`found-${g.id}`} title={g.full_name}
                subtitle={[g.phone, g.active_stay?.room ? roomText(g.active_stay.room) : null].filter(Boolean).join(' · ') || undefined}
                right={hasDebt(g.debt_left) ? <Badge label={t('sanFlow.queue.debt', { sum: fmtMoney(g.debt_left) })} tone="danger" /> : g.active_stay ? <Badge label={t(`sanatorium.stayStatus.${g.active_stay.status}`)} tone={stayTone(g.active_stay.status)} /> : <Text variant="caption" tone="subtle">{t('sanFlow.today.noStay')}</Text>}
                onPress={() => openHit(g.id, g.active_stay)}
              />
            ))}
            {guests.isSuccess && fresh && hits.length === 0 && (
              <Card testID="today-not-found">
                <Text variant="body">{t('sanFlow.today.notFound')}</Text>
                {!readOnly && <Button testID="today-new-guest" label={t('sanFlow.today.newGuest')} variant="soft" onPress={() => router.push({ pathname: '/sanatorium-arrive', params: { name: text.trim() } })} />}
              </Card>
            )}
          </View>
        )}
        <View style={styles.tiles}>
          {tiles.map((x) => (
            <StatTile key={x.key} testID={`tile-${x.key}`} label={t(`sanSimple.totals.${x.key}`)} value={totals[x.key] ?? 0} icon={x.icon} tint={x.tint} labelLines={2} style={styles.tile} />
          ))}
        </View>
        {showSetup && !readOnly && (
          <Card testID="setup-banner">
            <Text variant="heading">{t('sanSimple.setup.banner', { done: setup.data!.done, total: setup.data!.total })}</Text>
            <ProgressBar value={setup.data!.total ? setup.data!.done / setup.data!.total : 0} />
            {left > 0 && <Text variant="caption" tone="muted">{t('sanSimple.setup.requiredLeft', { count: left })}</Text>}
            <Button testID="setup-open" label={t('sanSimple.setup.open')} variant="soft" onPress={() => router.push('/sanatorium-setup')} />
          </Card>
        )}
        {groups.length === 0 ? (
          search.trim() ? (hits.length === 0 ? <EmptyState title={t('sanSimple.today.noMatch')} /> : null) : <EmptyState title={t('sanFlow.today.allDone')} message={readOnly ? undefined : t('sanFlow.today.allDoneHint')} />
        ) : (
          groups.map((g) => (
            <View key={g.urgency} style={styles.stack} testID={`group-${g.urgency}`}>
              <View style={styles.groupHead}>
                <View style={[styles.dot, { backgroundColor: dot[g.urgency] }]} />
                <SectionHeader title={`${t(`sanSimple.urgency.${g.urgency}`)} (${g.items.length})`} />
              </View>
              {g.items.map((item) => <QueueCard key={item.key} item={item} readOnly={readOnly} busy={busy === item.key} onAction={(a) => act(item, a)} onOpen={() => open(item)} />)}
            </View>
          ))
        )}
        {data.total !== undefined && data.total > all.length && <Text variant="caption" tone="muted" testID="today-more">{t('sanFlow.today.more', { n: data.total - all.length })}</Text>}
        <Button testID="today-all" label={t('sanSimple.today.allSections')} variant="soft" full onPress={() => router.push('/sanatorium-all')} />
      </View>
      <HelpSheet open={help} onClose={() => setHelp(false)} />
      <StayActionSheet action={action} onClose={() => setAction(null)} />
      <ConvertByIdSheet waitlistId={convert} onClose={() => setConvert(null)} onConverted={(id) => { setConvert(null); router.push({ pathname: '/sanatorium-arrive', params: { request: String(id) } }); }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { flexBasis: '47%', flexGrow: 1 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
